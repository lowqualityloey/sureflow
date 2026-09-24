import { createHash } from "node:crypto";
import type { EvidenceRecord } from "./evidence.js";
import type { EvidenceReadEntry } from "./evidenceStore.js";
import type { EvidenceRecordV2 } from "./evidenceV2.js";
import type { M4OrderedWriteSuccess } from "./m4OrderedEvidence.js";
import type { ValidatedExecutionPlan } from "./taskContract.js";
import type { VerificationVerdict } from "./verdicts.js";

export const CONTRACT_TARGET = ".sureflow/task.json";
const CONTRACT_PROVENANCE = "provenance=control-plane-task-input";
const SHA256_PATTERN = /^[0-9a-f]{64}$/u;

export interface ProjectChangeVerificationOutcome {
  readonly verdict: VerificationVerdict;
  readonly taskId: string;
  readonly reasons: readonly string[];
  readonly recordsExamined: number;
  readonly corruptLines: readonly number[];
}

export type Evaluation =
  | { readonly kind: "eligible"; readonly reason: string }
  | { readonly kind: "fail"; readonly reason: string }
  | { readonly kind: "unknown"; readonly reason: string };

export type M4PostimageProof =
  | { readonly kind: "observed-postimage"; readonly taskId: string; readonly path: string; readonly writeLine: number; readonly sha256: string }
  | { readonly kind: "planned-replacement"; readonly taskId: string; readonly path: string; readonly writeLine: number; readonly sha256: string };

export function evaluateM4Postimages(
  writes: readonly M4OrderedWriteSuccess[], proofs: readonly M4PostimageProof[], taskId: string,
): Evaluation {
  if (proofs.length !== writes.length) return { kind: "unknown", reason: "observed postimage proof is missing or unexpected" };
  for (const write of writes) {
    const matches = proofs.filter((proof) => proof.path === write.path && proof.writeLine === write.entry.line);
    if (matches.length !== 1) return { kind: "unknown", reason: `postimage proof for ${write.path} is missing or duplicated` };
    const proof = matches[0];
    if (proof === undefined || proof.kind !== "observed-postimage" || proof.taskId !== taskId ||
      !/^[0-9a-f]{64}$/u.test(proof.sha256)) {
      return { kind: "unknown", reason: `postimage proof for ${write.path} is not a matching fresh observation` };
    }
    if (proof.sha256 !== write.afterSha256) return { kind: "fail", reason: `observed postimage for ${write.path} disagrees with the planned digest` };
  }
  return { kind: "eligible", reason: "each successful target has a matching supplied observed-postimage proof" };
}

export type StoredRecord = EvidenceRecord | EvidenceRecordV2;

export function sha256Utf8(value: string): string {
  return createHash("sha256").update(Buffer.from(value, "utf8")).digest("hex");
}

export function isSha256(value: string): boolean {
  return SHA256_PATTERN.test(value);
}

export function freezeOutcome(
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

export function recordEntries(entries: readonly EvidenceReadEntry[]): StoredRecord[] {
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

export function evaluateTuple(
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

export function evaluateContractResult(
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
      return { kind: "fail", reason: "execution-time contract integrity mismatch was observed" };
    }
  }
  return { kind: "unknown", reason: "contract snapshot result is malformed or ambiguous" };
}

export function evaluateReplacementResult(
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

export function evaluateScopeResult(record: StoredRecord): Evaluation {
  if (record.result === "compliant") {
    return { kind: "eligible", reason: "project scope is compliant" };
  }
  if (record.result.startsWith("violation:") && record.result.length > "violation:".length) {
    return { kind: "fail", reason: "project scope evidence reports a violation" };
  }
  return { kind: "unknown", reason: "project scope result is malformed or ambiguous" };
}

export function evaluateVerificationResult(record: StoredRecord): Evaluation {
  if (record.result === "passed") {
    return { kind: "eligible", reason: `${record.target} passed` };
  }
  if (record.result === "spawn-error") {
    return { kind: "fail", reason: `${record.target} reported a spawn error` };
  }
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

export function evaluateVerificationEvidenceMode(
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
