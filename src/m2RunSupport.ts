import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import {
  appendEvidence,
  appendEvidenceV2,
  readEvidence,
  type EvidenceReadEntry,
} from "./evidenceStore.js";
import { defaultEvidencePath } from "./evidencePaths.js";
import { appendExecutionEvent } from "./eventStore.js";
import type { PolicyDecision } from "./policy.js";
import type { ScopeComplianceResult } from "./projectScope.js";
import type { TaskStatus } from "./state.js";
import { transitionTask } from "./taskStateStore.js";
import {
  M2_TASK_CONTRACT_RELATIVE_PATH,
  type ValidatedExecutionPlan,
} from "./taskContract.js";
import { resolveSureflowPath } from "./sureflowPaths.js";
import {
  runVerificationPlan,
  type VerificationSpawn,
  type VerificationStepResult,
} from "./verificationAdapter.js";
import type { VerificationVerdict } from "./verdicts.js";
import type { InterruptionSource, VerificationClock } from "./verificationExecution.js";
import type { ProjectChangeVerificationOutcome } from "./projectChangeVerifier.js";

export const ACTOR = "worker:m2" as const;
export const CONTRACT_PROVENANCE = "control-plane-task-input" as const;
export const REPLACEMENT_PROVENANCE = "bounded existing-file replacement" as const;
export const SCOPE_PROVENANCE = "git-visible project scope" as const;

export type M2VerificationVerdict = Exclude<VerificationVerdict, "BLOCKED">;

export type M2RunPhase =
  | "plan-loaded"
  | "project-detected"
  | "verification-resolved"
  | "baseline-captured"
  | "replacement-preflighted"
  | "task-running"
  | "replacement-applied"
  | "verification-complete"
  | "contract-rechecked"
  | "scope-captured"
  | "evidence-appended"
  | "verdict-computed";

export interface M2RunTaskRequest {
  readonly rootDir: string;
  readonly requestedTaskId: string;
}

export interface M2RunTaskDependencies {
  readonly nowIso?: () => string;
  readonly onPhase?: (phase: M2RunPhase) => void | Promise<void>;
  readonly verificationSpawn?: VerificationSpawn;
  readonly verificationClock?: VerificationClock;
  readonly verificationInterruption?: InterruptionSource;
  readonly runVerification?: typeof runVerificationPlan;
}

export interface M2RunTaskOutcome {
  readonly kind: "accepted" | "halted";
  readonly taskId: string | null;
  readonly verdict: M2VerificationVerdict | null;
  readonly policyDecisions: Readonly<Record<string, PolicyDecision>>;
  readonly transitions: readonly TaskStatus[];
  readonly verificationResults: readonly VerificationStepResult[];
  readonly reason: string;
}

export interface M2VerifyTaskRequest {
  readonly rootDir: string;
  readonly requestedTaskId: string;
}

export interface M2VerifyTaskDependencies {
  readonly nowIso?: () => string;
  readonly verify?: (
    plan: ValidatedExecutionPlan,
    entries: readonly EvidenceReadEntry[],
  ) => ProjectChangeVerificationOutcome;
}

export interface M2VerifyTaskOutcome {
  readonly kind: "verified" | "halted";
  readonly taskId: string | null;
  readonly verdict: M2VerificationVerdict | null;
  readonly stateStatus: TaskStatus | null;
  readonly stateTransition: "none" | "halted";
  readonly reason: string;
}

export function emptyPolicyDecisions(): Readonly<Record<string, PolicyDecision>> {
  return Object.freeze({});
}

export function haltedRun(
  reason: string,
  values: Partial<Omit<M2RunTaskOutcome, "kind" | "reason">> = {},
): M2RunTaskOutcome {
  return {
    kind: "halted",
    taskId: values.taskId ?? null,
    verdict: values.verdict ?? null,
    policyDecisions: values.policyDecisions ?? emptyPolicyDecisions(),
    transitions: values.transitions ?? Object.freeze([]),
    verificationResults: values.verificationResults ?? Object.freeze([]),
    reason,
  };
}

export function haltedVerify(
  reason: string,
  values: Partial<Omit<M2VerifyTaskOutcome, "kind" | "reason">> = {},
): M2VerifyTaskOutcome {
  return {
    kind: "halted",
    taskId: values.taskId ?? null,
    verdict: values.verdict ?? null,
    stateStatus: values.stateStatus ?? null,
    stateTransition: values.stateTransition ?? "none",
    reason,
  };
}

export function sha256(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

export function m2Verdict(verdict: VerificationVerdict): M2VerificationVerdict {
  if (verdict === "BLOCKED") throw new Error("T6 emitted an unsupported BLOCKED verdict");
  return verdict;
}

export async function phase(
  dependencies: M2RunTaskDependencies,
  value: M2RunPhase,
): Promise<void> {
  await dependencies.onPhase?.(value);
}

export function persistEvent(
  rootDir: string,
  taskId: string,
  capability: string,
  policyDecision: PolicyDecision,
  target: string,
  result: string,
  recordedAt: string,
): void {
  try {
    appendExecutionEvent(rootDir, {
      actor: ACTOR,
      recordedAt,
      taskId,
      capability,
      policyDecision,
      target,
      result,
      provenance: "M2 orchestration observation",
    });
  } catch {
    return;
  }
}

export function readExistingEvidenceForReplay(
  rootDir: string,
  taskId: string,
): { readonly kind: "ok"; readonly entries: readonly EvidenceReadEntry[] } | { readonly kind: "halted"; readonly reason: string } {
  if (!existsSync(defaultEvidencePath(rootDir))) {
    return { kind: "ok", entries: Object.freeze([]) };
  }
  const entries = readEvidence(rootDir);
  if (entries.some((entry) => entry.kind === "corrupt")) {
    return { kind: "halted", reason: "existing evidence is corrupt or unreadable; replay is refused" };
  }
  if (entries.some((entry) => entry.kind === "record" && entry.record.taskId === taskId)) {
    return { kind: "halted", reason: "terminal evidence already exists for the requested task" };
  }
  return { kind: "ok", entries };
}

export function contractEvidenceResult(plan: ValidatedExecutionPlan): string {
  return `sha256:${plan.contractSha256};provenance=${CONTRACT_PROVENANCE}`;
}

export function scopeEvidenceResult(scope: ScopeComplianceResult): string {
  if (scope.kind === "compliant") return "compliant";
  if (scope.kind === "violation") {
    const paths = scope.unauthorizedPaths.join(",");
    return `violation:${paths.length > 0 ? paths : scope.reason}`;
  }
  return `${scope.kind}:${scope.reason}`;
}

export function processInterruptionSource(): InterruptionSource {
  return {
    subscribe: (listener) => {
      const onSigint = (): void => {
        listener("SIGINT");
      };
      const onSigterm = (): void => {
        listener("SIGTERM");
      };
      process.on("SIGINT", onSigint);
      process.on("SIGTERM", onSigterm);
      return () => {
        process.removeListener("SIGINT", onSigint);
        process.removeListener("SIGTERM", onSigterm);
      };
    },
  };
}

export function readContractDigest(rootDir: string, plan: ValidatedExecutionPlan): string | null {
  try {
    const bytes = readFileSync(resolveSureflowPath(rootDir, M2_TASK_CONTRACT_RELATIVE_PATH));
    const observed = sha256(bytes);
    return observed === plan.contractSha256
      ? contractEvidenceResult(plan)
      : `integrity-mismatch:${observed}`;
  } catch {
    return null;
  }
}

export function transitionHalted(
  rootDir: string,
  taskId: string,
  nowIso: () => string,
  transitions: TaskStatus[],
): string | null {
  try {
    transitionTask(rootDir, taskId, "halted", nowIso());
    transitions.push("halted");
    return null;
  } catch {
    return "could not persist halted authoritative task state";
  }
}

export { appendEvidence, appendEvidenceV2, readEvidence, type EvidenceReadEntry };
