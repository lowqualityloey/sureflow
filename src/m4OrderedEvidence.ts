import { createHash } from "node:crypto";
import type { EvidenceReadEntry } from "./evidenceStore.js";
import { normalizeStatusPath } from "./projectScopeGitStatus.js";
import { M2_VERIFICATION_PROFILES, type M4ValidatedExecutionPlan } from "./taskContract.js";

export const M4_ORDERED_CHECKS = Object.freeze(["typecheck", "test", "lint", "build"] as const);
export const M4_REFUSAL_CODES = Object.freeze([
  "stale-preimage",
  "target-invalid",
  "identity-changed",
  "trackedness-lost",
  "apply-failed",
] as const);

export type M4EvidenceRecordEntry = Extract<EvidenceReadEntry, { readonly kind: "record" }>;
export interface M4OrderedWriteSuccess {
  readonly kind: "applied";
  readonly path: string;
  readonly beforeSha256: string;
  readonly afterSha256: string;
  readonly entry: M4EvidenceRecordEntry;
}
export interface M4OrderedWriteRefusal {
  readonly kind: "refused";
  readonly path: string;
  readonly code: (typeof M4_REFUSAL_CODES)[number];
  readonly entry: M4EvidenceRecordEntry;
}

interface M4OrderedBase {
  readonly prewriteBinding: M4EvidenceRecordEntry;
  readonly terminalContract: M4EvidenceRecordEntry;
  readonly scopeEvidence: readonly M4EvidenceRecordEntry[];
  readonly inputBindings: readonly M4EvidenceRecordEntry[];
  readonly verificationRecords: readonly M4EvidenceRecordEntry[];
}

export type M4OrderedEvidenceResult =
  | (M4OrderedBase & { readonly kind: "complete"; readonly writes: readonly M4OrderedWriteSuccess[] })
  | (M4OrderedBase & {
      readonly kind: "partial";
      readonly completed: readonly M4OrderedWriteSuccess[];
      readonly refusal: M4OrderedWriteRefusal;
    })
  | { readonly kind: "invalid"; readonly reason: string; readonly corruptLines: readonly number[] };

export function isM4Sha256(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{64}$/u.test(value);
}

function comparePathBytes(left: string, right: string): number {
  return Buffer.compare(Buffer.from(left, "utf8"), Buffer.from(right, "utf8"));
}

export function m4TargetPaths(plan: M4ValidatedExecutionPlan): readonly string[] | null {
  if (
    plan.targets.length < 2 ||
    plan.targets.length > 5 ||
    !isM4Sha256(plan.contractSha256) ||
    plan.source.sha256 !== plan.contractSha256
  ) return null;
  const paths: string[] = [];
  for (const target of plan.targets) {
    if (
      typeof target.path !== "string" ||
      target.path.includes("\\") ||
      target.path.includes("\u0000") ||
      normalizeStatusPath(target.path) === null ||
      target.path.split("/").some((part) => part === ".git" || part === ".sureflow") ||
      !isM4Sha256(target.expectedBeforeSha256) ||
      typeof target.replacementContent !== "string"
    ) return null;
    paths.push(target.path);
  }
  if (new Set(paths).size !== paths.length) return null;
  return Object.freeze(paths.sort(comparePathBytes));
}

export function digestM4ResolvedPlan(plan: M4ValidatedExecutionPlan): string | null {
  const paths = m4TargetPaths(plan);
  const checks = new Set(plan.requiredVerification);
  if (
    paths === null ||
    plan.taskId.length === 0 ||
    checks.size !== plan.requiredVerification.length ||
    [...checks].some((check) => !(M2_VERIFICATION_PROFILES as readonly string[]).includes(check))
  ) return null;
  const targets = paths.map((path) => {
    const target = plan.targets.find((candidate) => candidate.path === path);
    if (target === undefined) return null;
    const digest = createHash("sha256").update(Buffer.from(target.replacementContent, "utf8")).digest("hex");
    return [path, target.expectedBeforeSha256, digest];
  });
  if (targets.some((target) => target === null)) return null;
  const encoded = JSON.stringify([
    "m4-resolved-plan-v1", plan.schemaVersion, plan.taskId, plan.adapter, plan.operation,
    plan.contractSha256, plan.source.path, targets,
    M4_ORDERED_CHECKS.filter((check) => checks.has(check)),
  ]);
  return createHash("sha256").update(Buffer.from(encoded, "utf8")).digest("hex");
}

function invalid(reason: string, corruptLines: readonly number[] = []): M4OrderedEvidenceResult {
  return Object.freeze({ kind: "invalid" as const, reason, corruptLines: Object.freeze([...corruptLines]) });
}

function validRecord(entry: M4EvidenceRecordEntry): boolean {
  return entry.record.policyDecision === "ALLOW" && entry.record.provenance.trim().length > 0;
}

function recordResult(entry: M4EvidenceRecordEntry): string {
  return entry.record.result;
}

function parseWrite(entry: M4EvidenceRecordEntry): M4OrderedWriteSuccess | M4OrderedWriteRefusal | null {
  if (entry.record.schemaVersion !== 1 || !validRecord(entry)) return null;
  const result = recordResult(entry);
  const applied = /^sha256:([0-9a-f]{64})->([0-9a-f]{64})$/u.exec(result);
  if (applied !== null) {
    const beforeSha256 = applied[1];
    const afterSha256 = applied[2];
    if (beforeSha256 === undefined || afterSha256 === undefined) return null;
    return Object.freeze({
      kind: "applied" as const,
      path: entry.record.target,
      beforeSha256,
      afterSha256,
      entry,
    });
  }
  const refused = /^refused:(stale-preimage|target-invalid|identity-changed|trackedness-lost|apply-failed)$/u.exec(result);
  const code = refused?.[1];
  if (code === undefined || !M4_REFUSAL_CODES.includes(code as (typeof M4_REFUSAL_CODES)[number])) return null;
  return Object.freeze({ kind: "refused" as const, path: entry.record.target, code: code as M4OrderedWriteRefusal["code"], entry });
}

function isLineOrdered(entries: readonly EvidenceReadEntry[]): boolean {
  let previous = 0;
  for (const entry of entries) {
    if (!Number.isSafeInteger(entry.line) || entry.line <= previous) return false;
    previous = entry.line;
  }
  return true;
}

export function validateM4OrderedEvidence(
  plan: M4ValidatedExecutionPlan,
  entries: readonly EvidenceReadEntry[],
): M4OrderedEvidenceResult {
  const corruptLines = entries.filter((entry) => entry.kind === "corrupt").map((entry) => entry.line);
  if (corruptLines.length > 0) return invalid("corrupt evidence prevents ordered certification", corruptLines);
  if (!isLineOrdered(entries)) return invalid("evidence line numbers are duplicate or out of order");
  const paths = m4TargetPaths(plan);
  if (paths === null) return invalid("immutable M4 plan is malformed or ambiguous");
  const sameTask = entries.filter((entry): entry is M4EvidenceRecordEntry =>
    entry.kind === "record" && entry.record.taskId === plan.taskId,
  );
  const allowedReadTargets = new Set([
    "task-contract-prewrite-binding",
    ".sureflow/task.json",
    "project-scope",
    "verification-input-binding",
  ]);
  const checks = new Set(plan.requiredVerification);
  const allowedVerifyTargets = new Set([...checks].map((check) => `${plan.adapter}:${check}`));
  if (sameTask.some((entry) =>
    (entry.record.capability === "repo.read" && !allowedReadTargets.has(entry.record.target)) ||
    (entry.record.capability === "repo.write" && !paths.includes(entry.record.target)) ||
    (entry.record.capability === "repo.verify" && !allowedVerifyTargets.has(entry.record.target))
  )) return invalid("same-task evidence contains an unauthorized target");

  const reads = sameTask.filter((entry) => entry.record.capability === "repo.read");
  const writes = sameTask.filter((entry) => entry.record.capability === "repo.write");
  const verifications = sameTask.filter((entry) => entry.record.capability === "repo.verify");
  if (reads.some((entry) => entry.record.schemaVersion !== 1 || !validRecord(entry))) {
    return invalid("M4 read evidence is not a valid authorized v1 observation");
  }
  const pickRead = (target: string): M4EvidenceRecordEntry[] => reads.filter((entry) => entry.record.target === target);
  const prewrites = pickRead("task-contract-prewrite-binding");
  const terminals = pickRead(".sureflow/task.json");
  const scopes = pickRead("project-scope");
  const inputBindings = pickRead("verification-input-binding");
  if (prewrites.length !== 1 || terminals.length !== 1 || scopes.length > 1 || inputBindings.length > 1) {
    return invalid("M4 contract or scope evidence is missing or duplicated");
  }
  const prewriteBinding = prewrites[0];
  const terminalContract = terminals[0];
  if (prewriteBinding === undefined || terminalContract === undefined) {
    return invalid("M4 contract binding evidence cannot be interpreted");
  }
  const orderedWrites = writes.map(parseWrite);
  if (orderedWrites.some((write) => write === null)) return invalid("M4 target evidence is malformed or unauthorized");
  const parsedWrites = orderedWrites.filter((write): write is M4OrderedWriteSuccess | M4OrderedWriteRefusal => write !== null);
  if (parsedWrites.length === 0) return invalid("M4 target evidence is missing");

  const completed: M4OrderedWriteSuccess[] = [];
  let refusal: M4OrderedWriteRefusal | null = null;
  for (let index = 0; index < parsedWrites.length; index += 1) {
    const write = parsedWrites[index];
    const expectedPath = paths[index];
    if (write === undefined || expectedPath === undefined || write.path !== expectedPath) {
      return invalid("M4 target evidence is duplicated, missing, unauthorized, or out of order");
    }
    if (write.kind === "refused") {
      if (refusal !== null || index !== parsedWrites.length - 1) {
        return invalid("M4 evidence claims work after the first target refusal");
      }
      refusal = write;
    } else {
      if (refusal !== null) return invalid("M4 evidence claims success after a target refusal");
      completed.push(write);
    }
  }
  if (refusal === null && parsedWrites.length !== paths.length) {
    return invalid("M4 complete-set success evidence is missing a target");
  }
  if (refusal !== null && parsedWrites.length !== completed.length + 1) {
    return invalid("M4 partial evidence does not end at its first refusal");
  }
  const firstWrite = parsedWrites[0];
  const lastWrite = parsedWrites.at(-1);
  if (
    firstWrite === undefined ||
    lastWrite === undefined ||
    prewriteBinding.line >= firstWrite.entry.line ||
    terminalContract.line <= lastWrite.entry.line
  ) return invalid("M4 pre-write or terminal contract evidence is out of order");

  const scopeEvidence = scopes;
  if (refusal !== null) {
    if (inputBindings.length !== 0 || verifications.length !== 0) {
      return invalid("normal acceptance evidence appears after a target refusal");
    }
    if (scopeEvidence.some((entry) => !recordResult(entry).startsWith("violation:"))) {
      return invalid("partial-write scope evidence is not diagnostic-only");
    }
  }
  const allPriorEvidence = [...scopeEvidence, ...inputBindings, ...verifications];
  if (allPriorEvidence.some((entry) => entry.line <= lastWrite.entry.line || entry.line >= terminalContract.line)) {
    return invalid("post-write evidence is outside the write and terminal contract boundary");
  }
  if (inputBindings.some((entry) => !validRecord(entry) || entry.record.schemaVersion !== 1)) {
    return invalid("verification input binding is malformed or unauthorized");
  }
  if (verifications.some((entry) => entry.record.schemaVersion !== 2 || !validRecord(entry))) {
    return invalid("M4 verification evidence is not a valid authorized v2 observation");
  }

  const base: M4OrderedBase = {
    prewriteBinding,
    terminalContract,
    scopeEvidence: Object.freeze(scopeEvidence),
    inputBindings: Object.freeze(inputBindings),
    verificationRecords: Object.freeze(verifications),
  };
  if (refusal !== null) {
    return Object.freeze({ ...base, kind: "partial" as const, completed: Object.freeze(completed), refusal });
  }
  return Object.freeze({ ...base, kind: "complete" as const, writes: Object.freeze(completed) });
}
