/**
 * M2-T6 pure aggregate verifier.
 *
 * This module consumes only the immutable execution plan and persisted
 * evidence. It never executes commands, writes files, appends evidence,
 * changes state, evaluates policy, acquires locks, or orchestrates a run.
 */
import { createHash } from "node:crypto";
import type { EvidenceRecord } from "./evidence.js";
import type { EvidenceReadEntry } from "./evidenceStore.js";
import {
  decodeTerminalCause,
  digestResolvedPlanV1,
  digestInputBindingV1,
  encodeInputBindingV1,
  parseExecutionProvenanceV2,
  parseInputBindingV1,
  VERIFICATION_INPUT_BINDING_PROVENANCE,
  VERIFICATION_INPUT_BINDING_TARGET,
} from "./evidenceV2.js";
import type { EvidenceRecordV2 } from "./evidenceV2.js";
import { M3_ADAPTER_IDS } from "./taskContract.js";
import { M3_ADAPTER_CONTRACT_VERSION } from "./projectAdapter.js";
import type { ValidatedExecutionPlan } from "./taskContract.js";
import type { VerificationVerdict } from "./verdicts.js";

/**
 * M3-T3 aggregate-verifier input binding.
 * Historical all-v1 verification evidence keeps prior semantics.
 * For a task containing T3 v2 repo.verify evidence, the verifier requires
 * exactly one valid `verification-input-binding` record and enforces
 * binding-digest agreement across every v2 verification record.
 */

const CONTRACT_TARGET = ".sureflow/task.json";
const CONTRACT_PROVENANCE = "provenance=control-plane-task-input";
const SHA256_PATTERN = /^[0-9a-f]{64}$/u;

export interface ProjectChangeVerificationOutcome {
  readonly verdict: VerificationVerdict;
  readonly taskId: string;
  readonly reasons: readonly string[];
  readonly recordsExamined: number;
  readonly corruptLines: readonly number[];
}

type Evaluation =
  | { readonly kind: "eligible"; readonly reason: string }
  | { readonly kind: "fail"; readonly reason: string }
  | { readonly kind: "unknown"; readonly reason: string };

function sha256Utf8(value: string): string {
  return createHash("sha256").update(Buffer.from(value, "utf8")).digest("hex");
}

function isSha256(value: string): boolean {
  return SHA256_PATTERN.test(value);
}

function freezeOutcome(
  plan: ValidatedExecutionPlan,
  verdict: Exclude<VerificationVerdict, "BLOCKED">,
  reasons: readonly string[],
  recordsExamined: number,
  corruptLines: readonly number[],
): ProjectChangeVerificationOutcome {
  return Object.freeze({
    verdict,
    taskId: plan.taskId,
    reasons: Object.freeze([...reasons]),
    recordsExamined,
    corruptLines: Object.freeze([...corruptLines]),
  });
}

type StoredRecord = EvidenceRecord | EvidenceRecordV2;

function recordEntries(entries: readonly EvidenceReadEntry[]): StoredRecord[] {
  return entries
    .filter((entry): entry is Extract<EvidenceReadEntry, { kind: "record" }> =>
      entry.kind === "record",
    )
    .map((entry) => entry.record);
}

function tupleRecords(
  entries: readonly EvidenceReadEntry[],
  taskId: string,
  capability: string,
  target: string,
): Extract<EvidenceReadEntry, { kind: "record" }>[] {
  return entries.filter(
    (entry): entry is Extract<EvidenceReadEntry, { kind: "record" }> =>
      entry.kind === "record" &&
      entry.record.taskId === taskId &&
      entry.record.capability === capability &&
      entry.record.target === target,
  );
}

function evaluateTuple(
  entries: readonly EvidenceReadEntry[],
  taskId: string,
  capability: string,
  target: string,
  evaluateResult: (record: StoredRecord) => Evaluation,
): Evaluation {
  const matches = tupleRecords(entries, taskId, capability, target);
  if (matches.length === 0) {
    return { kind: "unknown", reason: `missing evidence for (${taskId}, ${capability}, ${target})` };
  }
  if (matches.length > 1) {
    return {
      kind: "unknown",
      reason: `duplicate evidence for (${taskId}, ${capability}, ${target})`,
    };
  }

  const match = matches[0];
  if (match === undefined) {
    return { kind: "unknown", reason: "evidence could not be interpreted" };
  }
  if (match.record.policyDecision !== "ALLOW") {
    return {
      kind: "unknown",
      reason: `evidence for (${taskId}, ${capability}, ${target}) is not authorized for evidence`,
    };
  }
  if (match.record.provenance.trim().length === 0) {
    return {
      kind: "unknown",
      reason: `evidence for (${taskId}, ${capability}, ${target}) has empty provenance`,
    };
  }
  return evaluateResult(match.record);
}

function evaluateContractResult(
  record: StoredRecord,
  plan: ValidatedExecutionPlan,
): Evaluation {
  const expected = `sha256:${plan.contractSha256};${CONTRACT_PROVENANCE}`;
  if (record.result === expected) {
    return { kind: "eligible", reason: "current contract snapshot matches the plan" };
  }

  const snapshotMatch = /^sha256:([^;]+);(.+)$/u.exec(record.result);
  if (snapshotMatch !== null) {
    const digest = snapshotMatch[1] ?? "";
    const provenance = snapshotMatch[2] ?? "";
    if (isSha256(digest) && provenance === CONTRACT_PROVENANCE) {
      return { kind: "unknown", reason: "contract evidence is stale" };
    }
    return { kind: "unknown", reason: "contract snapshot result is malformed or ambiguous" };
  }

  const integrityMatch = /^integrity-mismatch:(.*)$/u.exec(record.result);
  if (integrityMatch !== null) {
    const observedDigest = integrityMatch[1] ?? "";
    if (isSha256(observedDigest)) {
      return {
        kind: "fail",
        reason: "execution-time contract integrity mismatch was observed",
      };
    }
  }

  return { kind: "unknown", reason: "contract snapshot result is malformed or ambiguous" };
}

function evaluateReplacementResult(
  record: StoredRecord,
  plan: ValidatedExecutionPlan,
  expectedAfterSha256: string,
): Evaluation {
  const expected = `sha256:${plan.expectedBeforeSha256}->${expectedAfterSha256}`;
  const digestMatch = /^sha256:([0-9a-f]+)->([0-9a-f]+)$/u.exec(record.result);
  if (digestMatch === null) {
    return { kind: "unknown", reason: "replacement result is malformed or ambiguous" };
  }

  const before = digestMatch[1] ?? "";
  const after = digestMatch[2] ?? "";
  if (!isSha256(before) || !isSha256(after)) {
    return { kind: "unknown", reason: "replacement result is malformed or ambiguous" };
  }
  if (before === after) {
    return { kind: "fail", reason: "replacement evidence confirms unchanged content" };
  }
  if (record.result !== expected) {
    return { kind: "fail", reason: "replacement evidence digest disagrees with the plan" };
  }
  if (plan.expectedBeforeSha256 === expectedAfterSha256) {
    return { kind: "fail", reason: "the planned replacement is a no-op" };
  }
  return { kind: "eligible", reason: "replacement evidence matches the plan" };
}

function evaluateScopeResult(record: StoredRecord): Evaluation {
  if (record.result === "compliant") {
    return { kind: "eligible", reason: "project scope is compliant" };
  }
  if (record.result.startsWith("violation:") && record.result.length > "violation:".length) {
    return { kind: "fail", reason: "project scope evidence reports a violation" };
  }
  return { kind: "unknown", reason: "project scope result is malformed or ambiguous" };
}

function evaluateVerificationResult(record: StoredRecord): Evaluation {
  if (record.result === "passed") {
    return { kind: "eligible", reason: `${record.target} passed` };
  }
  if (record.result === "spawn-error") {
    return { kind: "fail", reason: `${record.target} reported a spawn error` };
  }
  // M3-T3: bounded controller may settle a step as a timeout or as
  // Sureflow-owned cancellation. Both are explicit non-pass observations.
  if (record.result === "timed-out") {
    return { kind: "fail", reason: `${record.target} timed out` };
  }
  if (record.result === "interrupted:SIGINT" || record.result === "interrupted:SIGTERM") {
    return { kind: "fail", reason: `${record.target} was interrupted` };
  }
  if (/^failed:[0-9]+$/u.test(record.result)) {
    return { kind: "fail", reason: `${record.target} reported an explicit failure` };
  }
  if (/^terminated:.+$/u.test(record.result)) {
    return { kind: "fail", reason: `${record.target} reported process termination` };
  }
  return { kind: "unknown", reason: `${record.target} has a malformed result` };
}

function evaluateVerificationEvidenceMode(
  entries: readonly EvidenceReadEntry[],
  taskId: string,
): Evaluation | null {
  let hasV1 = false;
  let hasV2 = false;
  for (const entry of entries) {
    if (
      entry.kind !== "record" ||
      entry.record.taskId !== taskId ||
      entry.record.capability !== "repo.verify"
    ) {
      continue;
    }
    if (entry.record.schemaVersion === 1) hasV1 = true;
    if (entry.record.schemaVersion === 2) hasV2 = true;
  }
  if (!hasV1 || !hasV2) return null;
  return {
    kind: "unknown",
    reason: "mixed v1 and v2 verification evidence is ambiguous",
  };
}

/**
 * T3 binding evaluation: exactly one valid input-binding record, a
 * deterministically derived expected plan digest, and matching binding
 * references on every v2 verification record.
 *
 * Prefer FAIL for explicit digest disagreement and UNKNOWN for
 * absent/malformed observation. Never PASS on a binding problem.
 */
function evaluateVerificationBinding(
  entries: readonly EvidenceReadEntry[],
  plan: ValidatedExecutionPlan,
): Evaluation {
  const bindings = entries.filter(
    (entry): entry is Extract<EvidenceReadEntry, { kind: "record" }> =>
      entry.kind === "record" &&
      entry.record.taskId === plan.taskId &&
      entry.record.capability === "repo.read" &&
      entry.record.target === VERIFICATION_INPUT_BINDING_TARGET,
  );
  if (bindings.length === 0) {
    return { kind: "unknown", reason: "missing verification-input-binding evidence" };
  }
  if (bindings.length > 1) {
    return { kind: "unknown", reason: "duplicate verification-input-binding evidence is ambiguous" };
  }
  const binding = bindings[0];
  if (binding === undefined) return { kind: "unknown", reason: "verification binding could not be interpreted" };
  if (binding.record.policyDecision !== "ALLOW") {
    return { kind: "unknown", reason: "verification-input-binding is not authorized for evidence" };
  }
  if (binding.record.provenance !== VERIFICATION_INPUT_BINDING_PROVENANCE) {
    return { kind: "unknown", reason: "verification-input-binding has unexpected provenance" };
  }
  const fingerprints = parseInputBindingV1(binding.record.result);
  if (fingerprints === null) {
    return { kind: "unknown", reason: "verification-input-binding result is malformed or ambiguous" };
  }
  const expectedLockfile = plan.adapter === M3_ADAPTER_IDS[1] ? "pnpm-lock.yaml" : "package-lock.json";
  if (fingerprints.lockfilePath !== expectedLockfile) {
    return { kind: "fail", reason: "verification-input-binding lockfile disagrees with the task adapter" };
  }
  const expectedPlanDigest = digestResolvedPlanV1({
    adapterId: plan.adapter,
    adapterContractVersion: M3_ADAPTER_CONTRACT_VERSION,
    executable: plan.adapter === M3_ADAPTER_IDS[1] ? "pnpm" : "npm",
    cwdRole: "project-root",
    steps: plan.requiredVerification.map((check) => ({
      check,
      argv: check === "test" ? (["test"] as const) : (["run", check] as const),
    })),
  });
  if (fingerprints.planDigest !== expectedPlanDigest) {
    return { kind: "fail", reason: "verification-input-binding plan digest disagrees with the resolved plan" };
  }
  const expectedBindingDigest = digestInputBindingV1(encodeInputBindingV1(fingerprints));
  let explicitMismatch = false;
  for (const entry of entries) {
    if (
      entry.kind !== "record" ||
      entry.record.taskId !== plan.taskId ||
      entry.record.capability !== "repo.verify" ||
      entry.record.schemaVersion !== 2
    ) {
      continue;
    }
    const referenced = parseExecutionProvenanceV2(entry.record.provenance);
    if (referenced === null) {
      return { kind: "unknown", reason: "v2 verification provenance is malformed or ambiguous" };
    }
    if (referenced !== expectedBindingDigest) {
      explicitMismatch = true;
    }
    const v2 = entry.record;
    const decoded = decodeTerminalCause(v2.executionContext.terminalCause);
    if (decoded === null || entry.record.result !== v2.executionContext.terminalCause) {
      return { kind: "unknown", reason: "v2 verification terminal cause is malformed or ambiguous" };
    }
  }
  if (explicitMismatch) {
    return { kind: "fail", reason: "v2 verification binding digest disagrees with the bound inputs" };
  }
  return { kind: "eligible", reason: "verification input binding matches every v2 verification record" };
}

function hasUnexpectedSameAdapterVerification(
  entries: readonly EvidenceReadEntry[],
  plan: ValidatedExecutionPlan,
): boolean {
  const prefix = `${plan.adapter}:`;
  const expectedTargets = new Set(
    plan.requiredVerification.map((check) => `${plan.adapter}:${check}`),
  );
  return entries.some(
    (entry) =>
      entry.kind === "record" &&
      entry.record.taskId === plan.taskId &&
      entry.record.capability === "repo.verify" &&
      entry.record.target.startsWith(prefix) &&
      !expectedTargets.has(entry.record.target),
  );
}

/** Verify the complete M2 project-change evidence contract without side effects. */
export function verifyProjectChange(
  plan: ValidatedExecutionPlan,
  entries: readonly EvidenceReadEntry[],
): ProjectChangeVerificationOutcome {
  const corruptLines = entries
    .filter((entry) => entry.kind === "corrupt")
    .map((entry) => entry.line);
  if (corruptLines.length > 0) {
    return freezeOutcome(
      plan,
      "UNKNOWN",
      ["corrupt or unreadable evidence prevents positive verification"],
      0,
      corruptLines,
    );
  }

  const records = recordEntries(entries);
  const expectedAfterSha256 = sha256Utf8(plan.replacementContent);
  const evaluations: Evaluation[] = [
    evaluateTuple(entries, plan.taskId, "repo.read", CONTRACT_TARGET, (record) =>
      evaluateContractResult(record, plan),
    ),
    evaluateTuple(entries, plan.taskId, "repo.write", plan.targetPath, (record) =>
      evaluateReplacementResult(record, plan, expectedAfterSha256),
    ),
    evaluateTuple(entries, plan.taskId, "repo.read", "project-scope", evaluateScopeResult),
  ];

  for (const check of plan.requiredVerification) {
    evaluations.push(
      evaluateTuple(
        entries,
        plan.taskId,
        "repo.verify",
        `${plan.adapter}:${check}`,
        evaluateVerificationResult,
      ),
    );
  }

  const modeEvaluation = evaluateVerificationEvidenceMode(entries, plan.taskId);
  if (modeEvaluation !== null) evaluations.push(modeEvaluation);
  const hasV2Verification = entries.some(
    (entry) =>
      entry.kind === "record" &&
      entry.record.taskId === plan.taskId &&
      entry.record.capability === "repo.verify" &&
      entry.record.schemaVersion === 2,
  );
  if (hasV2Verification && modeEvaluation === null) {
    evaluations.push(evaluateVerificationBinding(entries, plan));
  }

  const reasons = evaluations.map((evaluation) => evaluation.reason);
  if (hasUnexpectedSameAdapterVerification(entries, plan)) {
    evaluations.push({
      kind: "unknown",
      reason: "unexpected same-task verification evidence is ambiguous",
    });
    reasons.push("unexpected same-task verification evidence is ambiguous");
  }

  const explicitFailure = evaluations.find((evaluation) => evaluation.kind === "fail");
  const recordsExamined = records.filter((record) =>
    record.taskId === plan.taskId &&
    (record.target === CONTRACT_TARGET ||
      record.target === plan.targetPath ||
      record.target === "project-scope" ||
      (record.capability === "repo.verify" && record.target.startsWith(`${plan.adapter}:`))),
  ).length;

  if (explicitFailure !== undefined) {
    return freezeOutcome(plan, "FAIL", reasons, recordsExamined, []);
  }
  if (evaluations.some((evaluation) => evaluation.kind === "unknown")) {
    return freezeOutcome(plan, "UNKNOWN", reasons, recordsExamined, []);
  }
  return freezeOutcome(plan, "PASS", reasons, recordsExamined, []);
}
