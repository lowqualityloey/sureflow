/**
 * Deterministic verifier (T4). Pure function by design.
 *
 * Consumes T3 evidence entries and evaluates them against an
 * explicit caller-supplied contract (`VerificationRequest`). The
 * verifier NEVER executes capabilities, mutates state, appends or
 * repairs evidence, requests approval, makes policy decisions, or
 * implements halt/retry orchestration (T6/T7 own those).
 *
 * Core invariant: PASS is positively established. Missing,
 * unreadable, corrupt, schema-invalid, inapplicable, or ambiguous
 * required evidence MUST NOT become PASS.
 *
 * BLOCKED is preserved in the verdict domain but never emitted by
 * T4: no approved M1 condition maps to it, and policy decisions
 * (DENY/REQUIRE_APPROVAL) are never collapsed into verdicts.
 */
import type { EvidenceReadEntry } from "./evidenceStore.js";
import type { VerificationVerdict } from "./verdicts.js";

/**
 * What the caller requires for PASS.
 *
 * Verification applicability is the exact tuple
 * `(taskId, capability, target)` — all three already exist as
 * required fields in the approved T3 `EvidenceRecord` schema. The
 * verifier selects only records matching all three, then requires
 * exactly one terminal such record.
 *
 * `expectedResult` is the exact `result` string that record must
 * carry (M1 §7: verify asserts exact content). T4 does not discover
 * or assume this value — the runtime/CLI layer supplies it.
 *
 * Preserved T7 invariant: `expectedResult` MUST originate from the
 * approved acceptance/fixture contract (`fixtures/t0-basic/task.json`,
 * M-D5). It must NEVER be derived from the evidence being verified.
 *
 * Terminal-evidence cardinality handoff (T6 writer invariant): for M1,
 * AT MOST ONE terminal verification-applicable `EvidenceRecord` may be
 * persisted per `(taskId, capability, target)`. Intermediate execution
 * observations and retry attempts are not terminal verification
 * evidence and belong in `.sureflow/events/events.jsonl`. A retry must
 * not create a second terminal evidence record for the same operation.
 * No ordering or "latest wins" semantics exist: a duplicate tuple is
 * UNKNOWN, never a selection.
 */
export interface VerificationRequest {
  readonly taskId: string;
  readonly capability: string;
  readonly target: string;
  readonly expectedResult: string;
}

export interface VerificationOutcome {
  /**
   * Full four-value verdict domain (`VerificationVerdict`).
   * T4 emits only PASS / FAIL / UNKNOWN; BLOCKED is a legitimate
   * member of the stable domain but has no approved T4 condition,
   * so it is never manufactured here.
   */
  readonly verdict: VerificationVerdict;
  readonly taskId: string;
  readonly reasons: readonly string[];
  readonly recordsExamined: number;
  readonly corruptLines: readonly number[];
}

function outcome(
  request: VerificationRequest,
  verdict: VerificationVerdict,
  reasons: readonly string[],
  recordsExamined: number,
  corruptLines: readonly number[],
): VerificationOutcome {
  return {
    verdict,
    taskId: request.taskId,
    reasons,
    recordsExamined,
    corruptLines,
  };
}

/**
 * Evaluate evidence deterministically. Read-only: never mutates
 * `entries`, state, or evidence. Reasons cite line numbers and
 * condition names only — never raw evidence blobs.
 */
export function verifyEvidence(
  request: VerificationRequest,
  entries: readonly EvidenceReadEntry[],
): VerificationOutcome {
  // Corrupt/unreadable lines carry no interpretable tuple, so they
  // cannot be proven irrelevant to this request. They are therefore
  // never dropped: any corruption yields UNKNOWN for the whole request.
  const corruptLines = entries
    .filter((entry) => entry.kind === "corrupt")
    .map((entry) => entry.line);
  if (corruptLines.length > 0) {
    return outcome(request, "UNKNOWN", [
      `${String(corruptLines.length)} corrupt or unreadable evidence line(s); refusing to verify remaining lines`,
    ], 0, corruptLines);
  }

  const applicable = entries.filter(
    (entry) =>
      entry.kind === "record" &&
      entry.record.taskId === request.taskId &&
      entry.record.capability === request.capability &&
      entry.record.target === request.target,
  );
  const selector = `(${request.taskId}, ${request.capability}, ${request.target})`;
  if (applicable.length === 0) {
    return outcome(request, "UNKNOWN", [
      `no terminal evidence for ${selector}`,
    ], 0, []);
  }
  if (applicable.length > 1) {
    return outcome(request, "UNKNOWN", [
      `${String(applicable.length)} terminal records for ${selector} with no approved ordering rule; refusing to choose`,
    ], applicable.length, []);
  }

  const first = applicable[0];
  if (first === undefined || first.kind !== "record") {
    return outcome(request, "UNKNOWN", ["evidence could not be interpreted"], 0, []);
  }
  if (first.record.result === request.expectedResult) {
    return outcome(request, "PASS", [`line ${String(first.line)} matches the required result`], 1, []);
  }
  return outcome(request, "FAIL", [
    `line ${String(first.line)} carries an explicit non-matching result`,
  ], 1, []);
}
