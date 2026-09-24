import { createHash } from "node:crypto";
import type { EvidenceReadEntry } from "./evidenceStore.js";
import {
  decodeTerminalCause,
  digestInputBindingV1,
  encodeInputBindingV1,
  isEvidenceRecordV2,
  parseExecutionProvenanceV2,
  parseInputBindingV1,
  VERIFICATION_INPUT_BINDING_PROVENANCE,
} from "./evidenceV2.js";
import {
  digestM4ResolvedPlan,
  isM4Sha256,
  validateM4OrderedEvidence,
  type M4EvidenceRecordEntry,
  type M4OrderedEvidenceResult,
  type M4OrderedWriteSuccess,
} from "./m4OrderedEvidence.js";
import { evaluateM4Postimages, evaluateVerificationResult, type Evaluation, type M4PostimageProof } from "./projectEvidenceEvaluation.js";
import { adapterStepArgv, managerForAdapterId } from "./projectAdapter.js";
import type { M4ScopeComplianceResult } from "./projectScope.js";
import type { M4ValidatedExecutionPlan } from "./taskContract.js";
import type { VerificationVerdict } from "./verdicts.js";

export interface M4ProjectChangeVerificationOutcome {
  readonly verdict: VerificationVerdict;
  readonly taskId: string;
  readonly reasons: readonly string[];
  readonly recordsExamined: number;
  readonly corruptLines: readonly number[];
}

function hashReplacement(content: string): string {
  return createHash("sha256").update(Buffer.from(content, "utf8")).digest("hex");
}

function outcome(
  plan: M4ValidatedExecutionPlan,
  verdict: Exclude<VerificationVerdict, "BLOCKED">,
  reasons: readonly string[],
  recordsExamined: number,
  corruptLines: readonly number[] = [],
): M4ProjectChangeVerificationOutcome {
  return Object.freeze({
    verdict,
    taskId: plan.taskId,
    reasons: Object.freeze([...reasons]),
    recordsExamined,
    corruptLines: Object.freeze([...corruptLines]),
  });
}

function recordEntries(entries: readonly EvidenceReadEntry[], taskId: string): M4EvidenceRecordEntry[] {
  return entries.filter((entry): entry is M4EvidenceRecordEntry =>
    entry.kind === "record" && entry.record.taskId === taskId,
  );
}

function contractBinding(entry: M4EvidenceRecordEntry, plan: M4ValidatedExecutionPlan): Evaluation {
  const result = entry.record.result;
  const match = /^sha256:([0-9a-f]{64})$/u.exec(result);
  const digest = match?.[1];
  if (digest === undefined) return { kind: "unknown", reason: "pre-write contract binding is malformed" };
  if (digest !== plan.contractSha256) return { kind: "fail", reason: "pre-write contract digest disagrees with the immutable plan" };
  return { kind: "eligible", reason: "pre-write contract binding matches the immutable plan" };
}

function terminalContract(entry: M4EvidenceRecordEntry, plan: M4ValidatedExecutionPlan): Evaluation {
  const result = entry.record.result;
  if (result === `sha256:${plan.contractSha256};provenance=control-plane-task-input`) {
    return { kind: "eligible", reason: "terminal contract observation matches the immutable plan" };
  }
  if (/^integrity-mismatch:[0-9a-f]{64}$/u.test(result)) {
    return { kind: "fail", reason: "terminal contract integrity mismatch was observed" };
  }
  const stale = /^sha256:([0-9a-f]{64});provenance=control-plane-task-input$/u.exec(result)?.[1];
  if (stale !== undefined) return { kind: "fail", reason: "terminal contract digest is stale" };
  return { kind: "unknown", reason: "terminal contract observation is malformed or ambiguous" };
}

function evaluateWrites(
  writes: readonly M4OrderedWriteSuccess[],
  plan: M4ValidatedExecutionPlan,
): Evaluation[] {
  return writes.map((write) => {
    const target = plan.targets.find((candidate) => candidate.path === write.path);
    if (target === undefined || !isM4Sha256(write.beforeSha256) || !isM4Sha256(write.afterSha256)) {
      return { kind: "unknown", reason: `write evidence for ${write.path} is malformed` };
    }
    if (write.beforeSha256 !== target.expectedBeforeSha256) {
      return { kind: "fail", reason: `write preimage digest for ${write.path} disagrees with the plan` };
    }
    if (write.beforeSha256 === write.afterSha256) {
      return { kind: "fail", reason: `write evidence for ${write.path} confirms unchanged content` };
    }
    if (write.afterSha256 !== hashReplacement(target.replacementContent)) {
      return { kind: "fail", reason: `write postimage digest for ${write.path} disagrees with planned bytes` };
    }
    return { kind: "eligible", reason: `write digest for ${write.path} matches the immutable plan` };
  });
}

function evaluateInputBinding(
  records: readonly M4EvidenceRecordEntry[],
  plan: M4ValidatedExecutionPlan,
): { readonly evaluation: Evaluation; readonly digest: string | null } {
  if (records.length !== 1) {
    return { evaluation: { kind: "unknown", reason: "verification input binding is missing or duplicated" }, digest: null };
  }
  const entry = records[0];
  if (entry === undefined || entry.record.provenance !== VERIFICATION_INPUT_BINDING_PROVENANCE) {
    return { evaluation: { kind: "unknown", reason: "verification input binding provenance is invalid" }, digest: null };
  }
  const fingerprints = parseInputBindingV1(entry.record.result);
  if (fingerprints === null) {
    return { evaluation: { kind: "unknown", reason: "verification input binding is malformed" }, digest: null };
  }
  const planDigest = digestM4ResolvedPlan(plan);
  if (planDigest === null) return { evaluation: { kind: "fail", reason: "canonical M4 plan digest is unavailable" }, digest: null };
  const digest = digestInputBindingV1(encodeInputBindingV1(fingerprints));
  if (fingerprints.planDigest !== planDigest) return { evaluation: { kind: "fail", reason: "verification input binding does not match the canonical M4 plan" }, digest };
  const expectedLockfile = managerForAdapterId(plan.adapter).manager === "pnpm" ? "pnpm-lock.yaml" : "package-lock.json";
  if (fingerprints.lockfilePath !== expectedLockfile) return { evaluation: { kind: "fail", reason: "verification input binding lockfile disagrees with the adapter" }, digest };
  return { evaluation: { kind: "eligible", reason: "verification input binding matches the canonical M4 plan" }, digest };
}

function evaluateVerifications(
  records: readonly M4EvidenceRecordEntry[],
  plan: M4ValidatedExecutionPlan,
  bindingDigest: string | null,
): Evaluation[] {
  if (records.length !== plan.requiredVerification.length || bindingDigest === null) {
    return [{ kind: "unknown", reason: "required verification evidence or its binding is missing" }];
  }
  const evaluations: Evaluation[] = [];
  const seen = new Set<string>();
  for (const check of plan.requiredVerification) {
    const target = `${plan.adapter}:${check}`;
    const matches = records.filter((entry) => entry.record.target === target);
    if (matches.length !== 1 || seen.has(target)) {
      evaluations.push({ kind: "unknown", reason: `verification evidence for ${target} is missing or duplicated` });
      continue;
    }
    seen.add(target);
    const entry = matches[0];
    if (entry === undefined || entry.record.schemaVersion !== 2 || !isEvidenceRecordV2(entry.record)) {
      evaluations.push({ kind: "unknown", reason: `verification evidence for ${target} is malformed` });
      continue;
    }
    const context = entry.record.executionContext;
    const adapter = managerForAdapterId(plan.adapter);
    const expectedArgv = adapterStepArgv({
      adapterId: plan.adapter,
      contractVersion: context.adapterContractVersion,
      manager: adapter.manager,
      executable: adapter.executable,
      cwdRole: "project-root",
      verificationProfiles: Object.freeze([...plan.requiredVerification]),
      dispatch: Object.freeze({
        typecheck: Object.freeze(["run", "typecheck"]),
        test: Object.freeze(["test"]),
        lint: Object.freeze(["run", "lint"]),
        build: Object.freeze(["run", "build"]),
      }),
    }, check);
    if (context.adapterId !== plan.adapter || context.executable !== adapter.executable ||
      context.argv.length !== expectedArgv.length || context.argv.some((part, index) => part !== expectedArgv[index])) {
      evaluations.push({ kind: "unknown", reason: `verification execution context for ${target} disagrees with the adapter` });
      continue;
    }
    const referenced = parseExecutionProvenanceV2(entry.record.provenance);
    if (referenced === null) {
      evaluations.push({ kind: "unknown", reason: `verification binding for ${target} is malformed` });
      continue;
    }
    if (referenced !== bindingDigest) {
      evaluations.push({ kind: "fail", reason: `verification binding for ${target} contradicts its input record` });
      continue;
    }
    const terminal = decodeTerminalCause(context.terminalCause);
    if (terminal === null || entry.record.result !== context.terminalCause) {
      evaluations.push({ kind: "unknown", reason: `verification result for ${target} contradicts its terminal context` });
      continue;
    }
    evaluations.push(evaluateVerificationResult(entry.record));
  }
  return evaluations;
}

function evaluateScope(
  ordered: M4OrderedEvidenceResult,
  scope: M4ScopeComplianceResult | null,
  plan: M4ValidatedExecutionPlan,
): Evaluation {
  if (ordered.kind !== "complete" || ordered.scopeEvidence.length !== 1) {
    return { kind: "unknown", reason: "complete-set scope evidence is missing or ambiguous" };
  }
  const persisted = ordered.scopeEvidence[0]?.record.result;
  if (scope === null || scope.kind === "unavailable" || scope.kind === "invalid") {
    return { kind: "unknown", reason: "Git-visible exact-set observation is unavailable or invalid" };
  }
  if (scope.kind === "violation") {
    return persisted?.startsWith("violation:") === true
      ? { kind: "fail", reason: "Git-visible project scope violates the authorized target set" }
      : { kind: "unknown", reason: "scope evidence contradicts the Git-visible violation" };
  }
  const targetPaths = plan.targets.map((target) => target.path).sort();
  const changed = [...scope.changedPaths].sort();
  if (
    persisted !== "compliant" ||
    !scope.compliant ||
    scope.missingPaths.length !== 0 ||
    scope.unauthorizedPaths.length !== 0 ||
    changed.length !== targetPaths.length ||
    changed.some((path, index) => path !== targetPaths[index])
  ) return { kind: "unknown", reason: "compliant scope evidence is not bound to the exact target set" };
  return { kind: "eligible", reason: "Git-visible changed paths equal the complete authorized target set" };
}

function decision(evaluations: readonly Evaluation[]): "PASS" | "FAIL" | "UNKNOWN" {
  if (evaluations.some((evaluation) => evaluation.kind === "unknown")) return "UNKNOWN";
  return evaluations.some((evaluation) => evaluation.kind === "fail") ? "FAIL" : "PASS";
}

export function verifyM4ProjectChange(
  plan: M4ValidatedExecutionPlan,
  entries: readonly EvidenceReadEntry[],
  scope: M4ScopeComplianceResult | null,
  postimages: readonly M4PostimageProof[],
): M4ProjectChangeVerificationOutcome {
  const records = recordEntries(entries, plan.taskId);
  const ordered = validateM4OrderedEvidence(plan, entries);
  if (ordered.kind === "invalid") {
    return outcome(plan, "UNKNOWN", [ordered.reason], records.length, ordered.corruptLines);
  }
  const evaluations: Evaluation[] = [
    contractBinding(ordered.prewriteBinding, plan),
    terminalContract(ordered.terminalContract, plan),
  ];
  const writes = ordered.kind === "complete" ? ordered.writes : ordered.completed;
  evaluations.push(...evaluateWrites(writes, plan), evaluateM4Postimages(writes, postimages, plan.taskId));
  if (ordered.kind === "partial") {
    if (scope?.kind === "compliant") {
      evaluations.push({ kind: "unknown", reason: "complete-set scope claims compliance after a partial refusal" });
    }
    evaluations.push({ kind: "fail", reason: `target ${ordered.refusal.path} was refused; complete-set delivery did not occur` });
  } else {
    evaluations.push(evaluateScope(ordered, scope, plan));
    const binding = evaluateInputBinding(ordered.inputBindings, plan);
    evaluations.push(binding.evaluation, ...evaluateVerifications(ordered.verificationRecords, plan, binding.digest));
  }
  const reasons = evaluations.map((evaluation) => evaluation.reason);
  return outcome(plan, decision(evaluations), reasons, records.length);
}
