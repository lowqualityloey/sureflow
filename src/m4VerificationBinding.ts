import { createHash } from "node:crypto";
import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname } from "node:path";
import {
  appendEvidenceV2,
  readEvidence,
  type EvidenceReadEntry,
} from "./evidenceStore.js";
import type { EvidenceDraft, EvidenceRecord } from "./evidence.js";
import type { EvidenceRecordV2 } from "./evidenceV2.js";
import {
  createExecutionContextV2,
  encodeExecutionProvenanceV2,
  type M3TerminalCause,
} from "./evidenceV2.js";
import {
  digestInputBindingV1,
  encodeInputBindingV1,
  type VerificationInputFingerprints,
  VERIFICATION_INPUT_BINDING_PROVENANCE,
  VERIFICATION_INPUT_BINDING_TARGET,
} from "./evidenceV2.js";
import { readBoundInputFile } from "./m2VerificationBinding.js";
import { digestM4ResolvedPlan } from "./m4OrderedEvidence.js";
import { M2_VERIFICATION_PROFILES, M4_TASK_CONTRACT_RELATIVE_PATH, type M4ValidatedExecutionPlan } from "./taskContract.js";
import type { DetectedNodeTypeScriptProject } from "./projectDetection.js";
import type { M4ScopeComplianceResult } from "./projectScope.js";
import type { M4EvidenceRecordEntry } from "./m4OrderedEvidence.js";
import { adapterStepArgv, type ResolvedAdapterContract } from "./projectAdapter.js";
import { stepForContract, type VerificationResolutionOutcome, type VerificationStepResult } from "./verificationAdapter.js";
import { terminalCauseForResult, verificationResultText } from "./verificationExecution.js";
import { resolveSureflowPath } from "./sureflowPaths.js";
import { defaultEvidencePath } from "./evidencePaths.js";
import { toPersistedRecord, toPersistedRecordV2 } from "./redaction.js";

export const M4_ACTOR = "worker:m4" as const;
export const M4_CONTRACT_PROVENANCE = "control-plane-task-input" as const;
export const M4_WRITE_PROVENANCE = "bounded multi-file replacement with observed readback" as const;
export const M4_SCOPE_PROVENANCE = "git-visible complete target set" as const;
export const M4_PREWRITE_TARGET = "task-contract-prewrite-binding" as const;
export const M4_TERMINAL_TARGET = ".sureflow/task.json" as const;

export function resolveM4VerificationPlan(
  project: DetectedNodeTypeScriptProject,
  plan: M4ValidatedExecutionPlan,
  adapterContract: ResolvedAdapterContract,
): VerificationResolutionOutcome {
  const required = new Set(plan.requiredVerification);
  if (required.size !== plan.requiredVerification.length) {
    return { kind: "unsupported", missingChecks: Object.freeze([]) };
  }
  const missingChecks = plan.requiredVerification.filter(
    (check) => !project.supportedChecks.includes(check),
  );
  if (missingChecks.length > 0) {
    return { kind: "unsupported", missingChecks: Object.freeze(missingChecks) };
  }
  const steps = [];
  for (const check of M2_VERIFICATION_PROFILES) {
    if (!required.has(check)) continue;
    const step = stepForContract(adapterContract, check);
    if (step === null) return { kind: "unsupported", missingChecks: Object.freeze([]) };
    steps.push(step);
  }
  return {
    kind: "resolved",
    plan: Object.freeze({ profile: adapterContract.adapterId, steps: Object.freeze(steps) }),
  };
}

function assertNever(value: never): never {
  throw new Error(`unsupported M4 evidence scope: ${String(value)}`);
}

export function m4ScopeResult(scope: M4ScopeComplianceResult): string {
  switch (scope.kind) {
    case "compliant":
      return "compliant";
    case "violation":
      return `violation:${scope.unauthorizedPaths.join(",") || scope.reason}`;
    case "unavailable":
    case "invalid":
      return `${scope.kind}:${scope.reason}`;
    default:
      return assertNever(scope);
  }
}

export function verificationEvidence(
  rootDir: string,
  plan: M4ValidatedExecutionPlan,
  adapterContract: ResolvedAdapterContract,
  results: readonly VerificationStepResult[],
  causes: readonly M3TerminalCause[],
  bindingDigest: string,
  recordedAt: () => string,
): void {
  const provenance = encodeExecutionProvenanceV2(bindingDigest);
  results.forEach((result, index) => {
    const terminalCause = causes[index] ?? terminalCauseForResult(result);
    appendEvidenceV2(rootDir, toPersistedRecordV2({
      actor: M4_ACTOR,
      recordedAt: recordedAt(),
      taskId: plan.taskId,
      capability: "repo.verify",
      policyDecision: "ALLOW",
      target: `${plan.adapter}:${result.check}`,
      result: verificationResultText(result),
      provenance,
      executionContext: createExecutionContextV2(
        adapterContract,
        adapterStepArgv(adapterContract, result.check),
        terminalCause,
      ),
    }));
  });
}

function sha256(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function sameRecord(
  left: EvidenceRecord | EvidenceRecordV2,
  right: EvidenceRecord | EvidenceRecordV2,
): boolean {
  return left.schemaVersion === right.schemaVersion && left.actor === right.actor &&
    left.recordedAt === right.recordedAt && left.taskId === right.taskId &&
    left.capability === right.capability && left.policyDecision === right.policyDecision &&
    left.target === right.target && left.result === right.result && left.provenance === right.provenance;
}

export function appendM4Evidence(rootDir: string, draft: EvidenceDraft): M4EvidenceRecordEntry {
  const existing = existsSync(defaultEvidencePath(rootDir)) ? readEvidence(rootDir) : [];
  const previousLine = existing.reduce((maximum, entry) => Math.max(maximum, entry.line), 0);
  const redacted = toPersistedRecord(draft);
  const fixedPrewriteTarget = draft.target === M4_PREWRITE_TARGET;
  if (
    redacted.actor !== draft.actor || redacted.recordedAt !== draft.recordedAt ||
    redacted.taskId !== draft.taskId || redacted.capability !== draft.capability ||
    redacted.policyDecision !== draft.policyDecision || redacted.provenance !== draft.provenance ||
    redacted.result !== draft.result || (redacted.target !== draft.target && !fixedPrewriteTarget)
  ) throw new Error("M4 evidence contains text that redaction cannot preserve canonically");
  const persisted: EvidenceRecord = fixedPrewriteTarget
    ? Object.freeze({ ...redacted, target: draft.target })
    : redacted;
  const evidencePath = defaultEvidencePath(rootDir);
  mkdirSync(dirname(evidencePath), { recursive: true });
  appendFileSync(evidencePath, `${JSON.stringify(persisted)}\n`, { encoding: "utf8" });
  const additions = readEvidence(rootDir).filter((entry) => entry.line > previousLine);
  if (additions.length !== 1) throw new Error("M4 evidence append could not be uniquely observed");
  const entry = additions[0];
  if (entry === undefined || entry.kind !== "record" || !sameRecord(entry.record, persisted)) {
    throw new Error("M4 evidence append did not persist the expected record");
  }
  return entry;
}

export function appendM4PrewriteBinding(
  rootDir: string,
  plan: M4ValidatedExecutionPlan,
  recordedAt: string,
): M4EvidenceRecordEntry {
  const bytes = readFileSync(resolveSureflowPath(rootDir, M4_TASK_CONTRACT_RELATIVE_PATH));
  const observed = sha256(bytes);
  if (observed !== plan.contractSha256) throw new Error("M4 task contract changed before its pre-write binding");
  return appendM4Evidence(rootDir, {
    actor: M4_ACTOR,
    recordedAt,
    taskId: plan.taskId,
    capability: "repo.read",
    policyDecision: "ALLOW",
    target: M4_PREWRITE_TARGET,
    result: `sha256:${observed}`,
    provenance: M4_CONTRACT_PROVENANCE,
  });
}

export function appendM4TerminalContractObservation(
  rootDir: string,
  plan: M4ValidatedExecutionPlan,
  recordedAt: string,
): M4EvidenceRecordEntry {
  let result: string;
  try {
    const bytes = readFileSync(resolveSureflowPath(rootDir, M4_TASK_CONTRACT_RELATIVE_PATH));
    const observed = sha256(bytes);
    result = observed === plan.contractSha256
      ? `sha256:${observed};provenance=${M4_CONTRACT_PROVENANCE}`
      : `integrity-mismatch:${observed}`;
  } catch {
    result = "unavailable:task-contract";
  }
  return appendM4Evidence(rootDir, {
    actor: M4_ACTOR,
    recordedAt,
    taskId: plan.taskId,
    capability: "repo.read",
    policyDecision: "ALLOW",
    target: M4_TERMINAL_TARGET,
    result,
    provenance: M4_CONTRACT_PROVENANCE,
  });
}

export function computeM4VerificationInputBinding(
  project: DetectedNodeTypeScriptProject,
  plan: M4ValidatedExecutionPlan,
): { readonly result: string; readonly digest: string } {
  const planDigest = digestM4ResolvedPlan(plan);
  if (planDigest === null) throw new Error("canonical M4 verification plan is unavailable");
  const fingerprints: VerificationInputFingerprints = Object.freeze({
    manifestPath: "package.json",
    manifestSha256: sha256(readBoundInputFile(project.root, "package.json", "package.json")),
    lockfilePath: project.lockfilePath,
    lockfileSha256: sha256(readBoundInputFile(project.root, project.lockfilePath, project.lockfilePath)),
    tsconfigPath: "tsconfig.json",
    tsconfigSha256: sha256(readBoundInputFile(project.root, "tsconfig.json", "tsconfig.json")),
    planDigest,
  });
  const result = encodeInputBindingV1(fingerprints);
  return Object.freeze({ result, digest: digestInputBindingV1(result) });
}

export function appendM4InputBinding(
  rootDir: string,
  taskId: string,
  result: string,
  recordedAt: string,
): M4EvidenceRecordEntry {
  return appendM4Evidence(rootDir, {
    actor: M4_ACTOR,
    recordedAt,
    taskId,
    capability: "repo.read",
    policyDecision: "ALLOW",
    target: VERIFICATION_INPUT_BINDING_TARGET,
    result,
    provenance: VERIFICATION_INPUT_BINDING_PROVENANCE,
  });
}

export function recordEntriesForTask(
  entries: readonly EvidenceReadEntry[],
  taskId: string,
): readonly M4EvidenceRecordEntry[] {
  return entries.filter((entry): entry is M4EvidenceRecordEntry =>
    entry.kind === "record" && entry.record.taskId === taskId,
  );
}
