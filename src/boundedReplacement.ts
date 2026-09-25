/**
 * M2-T4 bounded replacement of one existing tracked project file.
 *
 * This module owns one immutable-plan-authorized replacement only. It does
 * not inspect whole-project Git scope, aggregate evidence, or orchestrate
 * verification. The atomic rename is not a durability or transaction claim.
 */
import { isAbsolute, resolve } from "node:path";
import { decidePolicy, type PolicyConfig } from "./policy.js";
import { replaceSingleFile, type AtomicRename as SingleFileAtomicRename } from "./singleFileReplacement.js";
import { isNormalizedTargetPath, sha256, validateCurrentTarget } from "./boundedReplacementTarget.js";
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readField(value: object, field: string): unknown {
  return (value as Record<string, unknown>)[field];
}

function refused(reason: string): RefusedReplacement {
  return Object.freeze({ kind: "refused" as const, reason });
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
