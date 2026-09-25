/**
 * M2-T6 pure aggregate verifier.
 *
 * This module consumes only the immutable execution plan and persisted
 * evidence. It never executes commands, writes files, appends evidence,
 * changes state, evaluates policy, acquires locks, or orchestrates a run.
 */
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
import {
  CONTRACT_TARGET,
  evaluateContractResult,
  evaluateReplacementResult,
  evaluateScopeResult,
  evaluateTuple,
  evaluateVerificationEvidenceMode,
  evaluateVerificationResult,
  freezeOutcome,
  recordEntries,
  sha256Utf8,
  type Evaluation,
  type ProjectChangeVerificationOutcome,
} from "./projectEvidenceEvaluation.js";
import { M3_ADAPTER_IDS } from "./taskContract.js";
import { M3_ADAPTER_CONTRACT_VERSION } from "./projectAdapter.js";
import type { ValidatedExecutionPlan } from "./taskContract.js";

export type { ProjectChangeVerificationOutcome } from "./projectEvidenceEvaluation.js";

/**
 * M3-T3 aggregate-verifier input binding.
 * Historical all-v1 verification evidence keeps prior semantics.
 * For a task containing T3 v2 repo.verify evidence, the verifier requires
 * exactly one valid `verification-input-binding` record and enforces
 * binding-digest agreement across every v2 verification record.
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
