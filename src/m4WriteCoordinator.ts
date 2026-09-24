import { createHash } from "node:crypto";
import {
  revalidateM4TargetForApply,
  type M4TargetObservation,
  type M4TargetSetOutcome,
  type M4TargetSetDependencies,
} from "./completeTargetSet.js";
import { replaceSingleFile, type AtomicRename } from "./singleFileReplacement.js";
import type { M4TaskTarget, M4ValidatedExecutionPlan } from "./taskContract.js";

export type M4TargetWriteRefusalCode =
  | "stale-preimage"
  | "target-invalid"
  | "identity-changed"
  | "trackedness-lost"
  | "apply-failed";

export type M4TargetWriteEvent =
  | {
      readonly kind: "applied";
      readonly path: string;
      readonly beforeSha256: string;
      readonly afterSha256: string;
    }
  | {
      readonly kind: "refused";
      readonly path: string;
      readonly code: M4TargetWriteRefusalCode;
      readonly reason: string;
    };

export type M4TargetWriteSuccess = Extract<M4TargetWriteEvent, { readonly kind: "applied" }>;
export type M4TargetWriteRefusal = Extract<M4TargetWriteEvent, { readonly kind: "refused" }>;

type M4WriteHalt =
  | { readonly stage: "precondition"; readonly reason: string }
  | { readonly stage: "revalidation" | "apply" | "outcome-callback"; readonly path: string; readonly reason: string };

export type M4WriteCoordinatorResult =
  | { readonly kind: "completed"; readonly completed: readonly M4TargetWriteSuccess[] }
  | {
      readonly kind: "halted";
      readonly completed: readonly M4TargetWriteSuccess[];
      readonly failedTarget: M4TargetWriteRefusal | null;
      readonly notAttempted: readonly string[];
      readonly halt: M4WriteHalt;
    };

export interface M4WriteCoordinatorDependencies {
  readonly inspection?: M4TargetSetDependencies;
  readonly atomicRename?: AtomicRename;
  readonly onTargetOutcome?: (outcome: M4TargetWriteEvent) => void;
}

export interface M4WriteCoordinatorRequest {
  readonly projectRoot: string;
  readonly plan: M4ValidatedExecutionPlan;
  readonly eligibleSet: M4TargetSetOutcome;
  readonly dependencies?: M4WriteCoordinatorDependencies;
}

type OrderedTarget = {
  readonly target: M4TaskTarget;
  readonly observation: M4TargetObservation;
};

type OrderedSet =
  | { readonly kind: "ready"; readonly targets: readonly OrderedTarget[] }
  | { readonly kind: "invalid"; readonly reason: string; readonly paths: readonly string[] };

function comparePathBytes(left: string, right: string): number {
  return Buffer.compare(Buffer.from(left, "utf8"), Buffer.from(right, "utf8"));
}

function orderedSet(plan: M4ValidatedExecutionPlan, eligibleSet: M4TargetSetOutcome): OrderedSet {
  const sortedTargets = plan.targets.slice().sort((left, right) => comparePathBytes(left.path, right.path));
  const paths = sortedTargets.map((target) => target.path);
  if (plan.targets.length < 2 || plan.targets.length > 5) {
    return { kind: "invalid", reason: "plan is not a supported schema-v2 complete target set", paths };
  }
  if (eligibleSet.kind !== "validated") {
    return { kind: "invalid", reason: "complete-set eligibility snapshot was refused", paths };
  }
  if (eligibleSet.targets.length !== plan.targets.length) {
    return { kind: "invalid", reason: "plan and eligibility snapshot have different target counts", paths };
  }

  const observations = new Map<string, M4TargetObservation>();
  const canonicalPaths = new Set<string>();
  const identities = new Set<string>();
  for (const observation of eligibleSet.targets) {
    const identityKey = `${String(observation.identity.device)}:${String(observation.identity.inode)}`;
    if (
      observations.has(observation.path) ||
      canonicalPaths.has(observation.canonicalPath) ||
      identities.has(identityKey)
    ) {
      return { kind: "invalid", reason: "eligibility snapshot contains duplicate target identity", paths };
    }
    observations.set(observation.path, observation);
    canonicalPaths.add(observation.canonicalPath);
    identities.add(identityKey);
  }

  const targets: OrderedTarget[] = [];
  for (const target of sortedTargets) {
    const observation = observations.get(target.path);
    if (observation === undefined || observation.beforeSha256 !== target.expectedBeforeSha256) {
      return { kind: "invalid", reason: "plan target is not bound to its frozen eligibility observation", paths };
    }
    targets.push(Object.freeze({ target, observation }));
  }
  return { kind: "ready", targets: Object.freeze(targets) };
}

function sha256(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function halted(
  completed: readonly M4TargetWriteSuccess[],
  failedTarget: M4TargetWriteRefusal | null,
  notAttempted: readonly string[],
  halt: M4WriteHalt,
): M4WriteCoordinatorResult {
  return Object.freeze({
    kind: "halted" as const,
    completed: Object.freeze(completed.slice()),
    failedTarget,
    notAttempted: Object.freeze(notAttempted.slice()),
    halt: Object.freeze(halt),
  });
}

function outcomeCallbackFailed(
  dependencies: M4WriteCoordinatorDependencies,
  outcome: M4TargetWriteEvent,
): boolean {
  if (dependencies.onTargetOutcome === undefined) return false;
  try {
    dependencies.onTargetOutcome(Object.freeze(outcome));
    return false;
  } catch {
    return true;
  }
}

export function executeM4WriteCoordinator(
  request: M4WriteCoordinatorRequest,
): M4WriteCoordinatorResult {
  const ordered = orderedSet(request.plan, request.eligibleSet);
  if (ordered.kind === "invalid") {
    return halted([], null, ordered.paths, { stage: "precondition", reason: ordered.reason });
  }

  const dependencies = request.dependencies ?? {};
  const completed: M4TargetWriteSuccess[] = [];
  for (let index = 0; index < ordered.targets.length; index += 1) {
    const item = ordered.targets[index];
    if (item === undefined) {
      return halted(completed, null, [], { stage: "precondition", reason: "ordered target disappeared" });
    }
    const suffix = ordered.targets.slice(index + 1).map(({ target }) => target.path);
    const inspection = revalidateM4TargetForApply(
      request.projectRoot,
      item.target,
      item.observation,
      dependencies.inspection,
    );
    if (inspection.kind === "refused") {
      const refusal = Object.freeze({
        kind: "refused" as const,
        path: item.target.path,
        code: inspection.code,
        reason: inspection.reason,
      });
      const callbackFailed = outcomeCallbackFailed(dependencies, refusal);
      return halted(completed, refusal, suffix, callbackFailed
        ? { stage: "outcome-callback", path: item.target.path, reason: "target refusal outcome callback failed" }
        : { stage: "revalidation", path: item.target.path, reason: inspection.reason });
    }

    const replacementBytes = Buffer.from(item.target.replacementContent, "utf8");
    try {
      replaceSingleFile({
        targetPath: inspection.absolutePath,
        replacementBytes,
        originalMode: inspection.mode,
        atomicRename: dependencies.atomicRename,
      });
    } catch {
      const refusal = Object.freeze({
        kind: "refused" as const,
        path: item.target.path,
        code: "apply-failed" as const,
        reason: "single-file replacement did not complete",
      });
      const callbackFailed = outcomeCallbackFailed(dependencies, refusal);
      return halted(completed, refusal, suffix, callbackFailed
        ? { stage: "outcome-callback", path: item.target.path, reason: "apply refusal outcome callback failed" }
        : { stage: "apply", path: item.target.path, reason: refusal.reason });
    }

    const success = Object.freeze({
      kind: "applied" as const,
      path: item.target.path,
      beforeSha256: inspection.beforeSha256,
      afterSha256: sha256(replacementBytes),
    });
    completed.push(success);
    if (outcomeCallbackFailed(dependencies, success)) {
      return halted(completed, null, suffix, {
        stage: "outcome-callback",
        path: item.target.path,
        reason: "completed target outcome callback failed",
      });
    }
  }

  return Object.freeze({ kind: "completed" as const, completed: Object.freeze(completed.slice()) });
}
