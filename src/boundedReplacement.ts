/**
 * M2-T4 bounded replacement of one existing tracked project file.
 *
 * This module owns one immutable-plan-authorized replacement only. It does
 * not inspect whole-project Git scope, aggregate evidence, or orchestrate
 * verification. The atomic rename is not a durability or transaction claim.
 */
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import {
  lstatSync,
  readFileSync,
  realpathSync,
  statSync,
} from "node:fs";
import { isAbsolute, join, relative, resolve, sep } from "node:path";
import { decidePolicy, type PolicyConfig } from "./policy.js";
import { replaceSingleFile, type AtomicRename as SingleFileAtomicRename } from "./singleFileReplacement.js";
import {
  M2_REPLACEMENT_OPERATION,
  M3_ADAPTER_IDS,
} from "./taskContract.js";
import type {
  ValidatedExecutionPlan,
} from "./taskContract.js";
import type { DetectedNodeTypeScriptProject } from "./projectDetection.js";

export interface AppliedReplacement {
  readonly kind: "applied";
  readonly path: string;
  readonly beforeSha256: string;
  readonly afterSha256: string;
}

export interface RefusedReplacement {
  readonly kind: "refused";
  readonly reason: string;
}

export type BoundedReplacementOutcome = AppliedReplacement | RefusedReplacement;

export interface TrackedTargetProbeResult {
  readonly status: number | null;
  readonly signal: NodeJS.Signals | null;
  readonly error?: Error;
}

export type TrackedTargetProbe = (
  cwd: string,
  targetPath: string,
) => TrackedTargetProbeResult;

export type AtomicRename = SingleFileAtomicRename;

export interface BoundedReplacementDependencies {
  readonly trackedTargetProbe?: TrackedTargetProbe;
  readonly atomicRename?: AtomicRename;
}

export interface ReplacementPreflight {
  readonly kind: "ready";
  readonly path: string;
  readonly beforeSha256: string;
  readonly afterSha256: string;
}

interface ContainedTarget {
  readonly path: string;
  readonly mode: number;
}

interface TargetInspection extends ContainedTarget {
  readonly bytes: Buffer;
}

interface ValidatedCurrentTarget extends ContainedTarget {
  readonly beforeSha256: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readField(value: object, field: string): unknown {
  return (value as Record<string, unknown>)[field];
}

function isWithin(root: string, candidate: string): boolean {
  const fromRoot = relative(root, candidate);
  return (
    fromRoot === "" ||
    (!fromRoot.startsWith(`..${sep}`) && fromRoot !== ".." && !fromRoot.startsWith(sep))
  );
}

function isMissing(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT";
}

function refused(reason: string): RefusedReplacement {
  return Object.freeze({ kind: "refused" as const, reason });
}

function sha256(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function isNormalizedTargetPath(value: unknown): value is string {
  if (typeof value !== "string" || value.length === 0 || value.includes("\u0000")) return false;

  const normalized = value.replace(/\\/g, "/");
  if (
    value !== normalized ||
    normalized.startsWith("/") ||
    normalized.startsWith("//") ||
    /^[A-Za-z]:($|\/)/u.test(normalized)
  ) {
    return false;
  }

  const segments = normalized.split("/");
  return (
    segments.length > 0 &&
    segments.every((segment) => segment.length > 0 && segment !== "." && segment !== "..") &&
    !segments.includes(".git") &&
    !segments.includes(".sureflow")
  );
}

function validPlan(value: unknown): value is ValidatedExecutionPlan {
  if (!isRecord(value)) return false;
  if (
    !(M3_ADAPTER_IDS as readonly string[]).includes(value.adapter as string) ||
    value.operation !== M2_REPLACEMENT_OPERATION ||
    !isNormalizedTargetPath(value.targetPath) ||
    typeof value.replacementContent !== "string" ||
    typeof value.expectedBeforeSha256 !== "string" ||
    !/^[0-9a-f]{64}$/u.test(value.expectedBeforeSha256)
  ) {
    return false;
  }
  return Array.isArray(value.requiredVerification);
}

function validProject(value: unknown): value is DetectedNodeTypeScriptProject {
  return (
    isRecord(value) &&
    (M3_ADAPTER_IDS as readonly string[]).includes(value.adapter as string) &&
    typeof value.root === "string" &&
    isAbsolute(value.root) &&
    resolve(value.root) === value.root &&
    typeof value.targetPath === "string"
  );
}

function canonicalRoot(projectRoot: string): string | null {
  if (projectRoot.length === 0) return null;
  try {
    const lexicalRoot = resolve(projectRoot);
    const rootStat = statSync(lexicalRoot);
    if (!rootStat.isDirectory()) return null;
    return realpathSync(lexicalRoot);
  } catch {
    return null;
  }
}

function resolveContainedTarget(root: string, targetPath: string): ContainedTarget | RefusedReplacement {
  const lexicalPath = resolve(root, targetPath);
  if (!isWithin(root, lexicalPath)) return refused("target escapes the project root");

  const segments = targetPath.split("/");
  for (let index = 0; index < segments.length; index += 1) {
    const lexicalAncestor = join(root, ...segments.slice(0, index + 1));
    let ancestorStat: ReturnType<typeof lstatSync>;
    try {
      ancestorStat = lstatSync(lexicalAncestor);
    } catch (error: unknown) {
      if (isMissing(error)) return refused("target does not exist");
      return refused("target cannot be inspected");
    }

    let physicalAncestor: string;
    try {
      physicalAncestor = realpathSync(lexicalAncestor);
    } catch {
      return refused("target cannot be physically resolved");
    }
    if (!isWithin(root, physicalAncestor)) {
      return refused("target escapes the project root through a symlink");
    }

    if (index === segments.length - 1) {
      if (!ancestorStat.isFile()) return refused("target is not a regular file");
      return {
        path: lexicalPath,
        mode: ancestorStat.mode & 0o7777,
      };
    }
  }

  return refused("target path is invalid");
}

function inspectTarget(root: string, targetPath: string): TargetInspection | RefusedReplacement {
  const contained = resolveContainedTarget(root, targetPath);
  if ("kind" in contained) return contained;

  let bytes: Buffer;
  try {
    bytes = readFileSync(contained.path);
  } catch {
    return refused("target cannot be read");
  }

  try {
    new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return refused("target is not valid UTF-8");
  }

  return { ...contained, bytes };
}

function defaultTrackedTargetProbe(cwd: string, targetPath: string): TrackedTargetProbeResult {
  try {
    const result = spawnSync(
      "git",
      ["ls-files", "--error-unmatch", "--", targetPath],
      { cwd, shell: false, stdio: "ignore" },
    );
    if (result.error !== undefined) {
      return { status: result.status, signal: result.signal, error: result.error };
    }
    return { status: result.status, signal: result.signal };
  } catch (error: unknown) {
    return {
      status: null,
      signal: null,
      error: error instanceof Error ? error : new Error("git trackedness probe failed"),
    };
  }
}

function validateCurrentTarget(
  project: DetectedNodeTypeScriptProject,
  plan: ValidatedExecutionPlan,
  dependencies: BoundedReplacementDependencies,
): ValidatedCurrentTarget | RefusedReplacement {
  const root = canonicalRoot(project.root);
  if (root === null) return refused("project root cannot be resolved");

  const targetGuard = resolveContainedTarget(root, plan.targetPath);
  if ("kind" in targetGuard) return targetGuard;

  const trackedTargetProbe = dependencies.trackedTargetProbe ?? defaultTrackedTargetProbe;
  let trackedResult: TrackedTargetProbeResult;
  try {
    trackedResult = trackedTargetProbe(root, plan.targetPath);
  } catch {
    return refused("Git trackedness could not be established");
  }
  if (
    trackedResult.error !== undefined ||
    trackedResult.signal !== null ||
    trackedResult.status !== 0
  ) {
    return refused("target is not an established Git-tracked file");
  }

  const currentTarget = inspectTarget(root, plan.targetPath);
  if ("kind" in currentTarget) return currentTarget;

  const beforeSha256 = sha256(currentTarget.bytes);
  if (beforeSha256 !== plan.expectedBeforeSha256) {
    return refused("target preimage does not match the task plan");
  }

  return {
    path: currentTarget.path,
    mode: currentTarget.mode,
    beforeSha256,
  };
}

/**
 * Prove the current T4 write prerequisites without mutating the target.
 * `applyBoundedReplacement` repeats these checks immediately before its write;
 * this preflight exists so orchestration can reject stale or unsafe work before
 * creating authoritative task state.
 */
export function validateBoundedReplacement(
  project: DetectedNodeTypeScriptProject,
  plan: ValidatedExecutionPlan,
  dependencies: BoundedReplacementDependencies = {},
): ReplacementPreflight | RefusedReplacement {
  if (!validProject(project) || !validPlan(plan)) {
    return refused("task or detected project is invalid");
  }
  if (readField(project, "adapter") !== readField(plan, "adapter")) {
    return refused("task and project adapters differ");
  }
  if (readField(project, "targetPath") !== readField(plan, "targetPath")) {
    return refused("task and project targets differ");
  }

  const currentTarget = validateCurrentTarget(project, plan, dependencies);
  if ("kind" in currentTarget) return currentTarget;

  const replacementBytes = Buffer.from(plan.replacementContent, "utf8");
  return Object.freeze({
    kind: "ready" as const,
    path: plan.targetPath,
    beforeSha256: currentTarget.beforeSha256,
    afterSha256: sha256(replacementBytes),
  });
}

/**
 * Apply exactly the replacement authorized by the validated execution plan.
 * Refusals never create a target or mutate the project target.
 */
export function applyBoundedReplacement(
  project: DetectedNodeTypeScriptProject,
  plan: ValidatedExecutionPlan,
  policy: PolicyConfig,
  dependencies: BoundedReplacementDependencies = {},
): BoundedReplacementOutcome {
  if (!validProject(project) || !validPlan(plan)) {
    return refused("task or detected project is invalid");
  }
  if (readField(project, "adapter") !== readField(plan, "adapter")) {
    return refused("task and project adapters differ");
  }
  if (readField(project, "targetPath") !== readField(plan, "targetPath")) {
    return refused("task and project targets differ");
  }

  let policyDecision: ReturnType<typeof decidePolicy>;
  try {
    policyDecision = decidePolicy(policy, "repo.write");
  } catch {
    return refused("repo.write policy could not be evaluated");
  }
  if (policyDecision === "DENY") return refused("repo.write policy denied the replacement");
  if (policyDecision === "REQUIRE_APPROVAL") {
    return refused("repo.write requires approval before the replacement");
  }

  const currentTarget = validateCurrentTarget(project, plan, dependencies);
  if ("kind" in currentTarget) return currentTarget;
  const replacementBytes = Buffer.from(plan.replacementContent, "utf8");
  try {
    replaceSingleFile({
      targetPath: currentTarget.path,
      replacementBytes,
      originalMode: currentTarget.mode,
      atomicRename: dependencies.atomicRename,
    });
  } catch {
    return refused("bounded replacement failed before completion");
  }

  return Object.freeze({
    kind: "applied" as const,
    path: plan.targetPath,
    beforeSha256: currentTarget.beforeSha256,
    afterSha256: sha256(replacementBytes),
  });
}
