import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { lstatSync, readFileSync, realpathSync, statSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";
import type {
  BoundedReplacementDependencies,
  RefusedReplacement,
  TrackedTargetProbeResult,
} from "./boundedReplacement.js";
import type { ValidatedExecutionPlan } from "./taskContract.js";
import type { DetectedNodeTypeScriptProject } from "./projectDetection.js";

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

function refused(reason: string): RefusedReplacement {
  return Object.freeze({ kind: "refused" as const, reason });
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

export function sha256(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

export function isNormalizedTargetPath(value: unknown): value is string {
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
      return { path: lexicalPath, mode: ancestorStat.mode & 0o7777 };
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

export function validateCurrentTarget(
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

  return { path: currentTarget.path, mode: currentTarget.mode, beforeSha256 };
}
