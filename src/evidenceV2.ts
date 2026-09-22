/**
 * M3-T1 EvidenceRecord v2 contract and deterministic codec.
 *
 * Decision record:
 * - EvidenceRecord v1 (schemaVersion 1) remains frozen and readable under the
 *   accepted M1/M2 behavior. Nothing here reinterprets v1 bytes.
 * - EvidenceRecord v2 (schemaVersion 2) is a versioned superset that adds one
 *   `executionContext` object. T1 pins this data contract and its codec only;
 *   timeout execution, signal handling, and v2 runtime writes belong to T3.
 * - Unknown schema versions and malformed v2 records fail closed: they are
 *   never silently accepted and never reinterpreted as another version.
 * - No cwd hash is recorded: absolute paths are machine-specific and must not
 *   alter canonical meaning. The closed `cwdRole` plus the pinned limit
 *   envelope fully determine the execution context for M3.
 *
 * Pinned M3 execution-limit envelope (safety bounds, not project-performance
 * guarantees; not user-configurable in M3):
 * - per verification step: 120 seconds wall-clock
 * - overall verification budget: 300 seconds
 * - termination grace: 5 seconds
 */

import { createHash } from "node:crypto";
import { isEvidenceRecord, type EvidenceRecord } from "./evidence.js";
import type { PolicyDecision } from "./policy.js";
import {
  M3_ADAPTER_CONTRACT_VERSION,
  M3_ADAPTER_IDS,
  managerForAdapterId,
} from "./projectAdapter.js";
import type { M3AdapterId, M3CwdRole, ResolvedAdapterContract } from "./projectAdapter.js";

export const EVIDENCE_V2_SCHEMA_VERSION = 2 as const;

/** Pinned M3 execution-limit envelope (seconds). See module doc. */
export const M3_STEP_LIMIT_SECONDS = 120 as const;
export const M3_OVERALL_BUDGET_SECONDS = 300 as const;
export const M3_TERMINATION_GRACE_SECONDS = 5 as const;

/**
 * Closed M3 terminal-cause domain. Typed internally; the canonical string
 * encoding is the persisted form. No free-form prose is machine-readable.
 *
 * terminated:<SIGNAL> records a child independently observed terminating by
 * signal — including SIGINT/SIGTERM when Sureflow itself did NOT own an
 * interruption. interrupted:SIGINT/SIGTERM records only Sureflow-owned
 * cancellation after receiving that control signal. Ownership, not the
 * signal name, distinguishes the two.
 */
export type M3TerminalCause =
  | { readonly kind: "passed" }
  | { readonly kind: "failed"; readonly exitCode: number }
  | { readonly kind: "spawn-error" }
  | { readonly kind: "terminated"; readonly signal: string }
  | { readonly kind: "interrupted"; readonly signal: "SIGINT" | "SIGTERM" }
  | { readonly kind: "timed-out" };

const SIGNAL_PATTERN = /^[A-Z][A-Z0-9_]{1,15}$/u;

/** Canonical persisted form of one terminal cause. */
export function encodeTerminalCause(cause: M3TerminalCause): string {
  switch (cause.kind) {
    case "passed":
      return "passed";
    case "failed":
      return `failed:${String(cause.exitCode)}`;
    case "spawn-error":
      return "spawn-error";
    case "terminated":
      return `terminated:${cause.signal}`;
    case "interrupted":
      return `interrupted:${cause.signal}`;
    case "timed-out":
      return "timed-out";
  }
}

function decodeFailedExitCode(text: string): number | null {
  if (!/^[1-9][0-9]{0,2}$/u.test(text)) return null;
  const code = Number(text);
  return code >= 1 && code <= 255 ? code : null;
}

/** Strict inverse of encodeTerminalCause. Unknown or malformed input → null. */
export function decodeTerminalCause(value: unknown): M3TerminalCause | null {
  if (typeof value !== "string" || value.length === 0 || value.length > 64) return null;
  if (value === "passed") return Object.freeze({ kind: "passed" as const });
  if (value === "spawn-error") return Object.freeze({ kind: "spawn-error" as const });
  if (value === "timed-out") return Object.freeze({ kind: "timed-out" as const });
  if (value === "interrupted:SIGINT") {
    return Object.freeze({ kind: "interrupted" as const, signal: "SIGINT" as const });
  }
  if (value === "interrupted:SIGTERM") {
    return Object.freeze({ kind: "interrupted" as const, signal: "SIGTERM" as const });
  }
  if (value.startsWith("failed:")) {
    const code = decodeFailedExitCode(value.slice("failed:".length));
    return code === null ? null : Object.freeze({ kind: "failed" as const, exitCode: code });
  }
  if (value.startsWith("terminated:")) {
    const signal = value.slice("terminated:".length);
    if (!SIGNAL_PATTERN.test(signal)) return null;
    return Object.freeze({ kind: "terminated" as const, signal });
  }
  return null;
}

/**
 * v2 execution context: the approved M3 facts that later determine how one
 * verification step ran. terminalCause is stored in canonical string form.
 * The adapter/executable pairing is closed: each adapter identity implies
 * exactly its own executable (npm→npm, pnpm→pnpm); crossed pairings are
 * rejected by parseExecutionContext.
 */
export interface EvidenceV2ExecutionContext {
  readonly adapterId: M3AdapterId;
  readonly adapterContractVersion: typeof M3_ADAPTER_CONTRACT_VERSION;
  readonly executable: "npm" | "pnpm";
  readonly argv: readonly string[];
  readonly argvDigest: string;
  readonly cwdRole: M3CwdRole;
  readonly stepLimitSeconds: typeof M3_STEP_LIMIT_SECONDS;
  readonly overallBudgetSeconds: typeof M3_OVERALL_BUDGET_SECONDS;
  readonly terminationGraceSeconds: typeof M3_TERMINATION_GRACE_SECONDS;
  readonly terminalCause: string;
}

/**
 * EvidenceRecord v2: every v1 base field plus the execution context.
 * v1 field semantics (actor, recordedAt, taskId, capability, policyDecision,
 * target, result, provenance) are unchanged.
 */
export interface EvidenceRecordV2 {
  readonly schemaVersion: typeof EVIDENCE_V2_SCHEMA_VERSION;
  readonly actor: string;
  readonly recordedAt: string;
  readonly taskId: string;
  readonly capability: string;
  readonly policyDecision: PolicyDecision;
  readonly target: string;
  readonly result: string;
  readonly provenance: string;
  readonly executionContext: EvidenceV2ExecutionContext;
}

export type StoredEvidenceRecordOutcome =
  | { readonly kind: "v1"; readonly record: EvidenceRecord }
  | { readonly kind: "v2"; readonly record: EvidenceRecordV2 }
  | { readonly kind: "unknown" };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyText(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && !value.includes("\u0000");
}

function isPolicyDecision(value: unknown): value is PolicyDecision {
  return (
    value === "ALLOW" || value === "DENY" || value === "REQUIRE_APPROVAL"
  );
}

function sha256Hex(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

/**
 * Canonical argv encoding for digesting. Each element is length-prefixed so
 * element boundaries cannot collide (["ab","c"] differs from ["a","bc"],
 * ["a\nb"] differs from ["a","b"]) and ordering stays significant.
 */
export function encodeArgvForDigest(argv: readonly string[]): string {
  return argv.map((element) => `${String(element.length)}:${element}`).join("\n");
}

/** SHA-256 hex digest of the canonical argv encoding. */
export function digestArgv(argv: readonly string[]): string {
  return sha256Hex(encodeArgvForDigest(argv));
}

const V2_CONTEXT_FIELDS = [
  "adapterId",
  "adapterContractVersion",
  "executable",
  "argv",
  "argvDigest",
  "cwdRole",
  "stepLimitSeconds",
  "overallBudgetSeconds",
  "terminationGraceSeconds",
  "terminalCause",
] as const;

function isStringArray(value: unknown): value is readonly string[] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every((element) => typeof element === "string" && element.length > 0 && !element.includes("\u0000"))
  );
}

/** Strict v2 execution-context validation. Unknown or malformed → null. */
export function parseExecutionContext(value: unknown): EvidenceV2ExecutionContext | null {
  if (!isRecord(value)) return null;
  if (Object.keys(value).some((field) => !(V2_CONTEXT_FIELDS as readonly string[]).includes(field))) {
    return null;
  }
  if (
    typeof value["adapterId"] !== "string" ||
    !(M3_ADAPTER_IDS as readonly string[]).includes(value["adapterId"])
  ) {
    return null;
  }
  // Closed pairing derived from the single adapter seam: the executable must
  // be exactly the one implied by the adapter identity. Crossed pairings
  // (npm adapter with pnpm executable and vice versa) fail closed.
  const expectedExecutable = managerForAdapterId(value["adapterId"] as M3AdapterId).executable;
  if (value["adapterContractVersion"] !== M3_ADAPTER_CONTRACT_VERSION) return null;
  if (value["executable"] !== expectedExecutable) return null;
  if (!isStringArray(value["argv"])) return null;
  if (typeof value["argvDigest"] !== "string" || !/^[0-9a-f]{64}$/u.test(value["argvDigest"])) {
    return null;
  }
  if (value["argvDigest"] !== digestArgv(value["argv"])) return null;
  if (value["cwdRole"] !== "project-root") return null;
  if (value["stepLimitSeconds"] !== M3_STEP_LIMIT_SECONDS) return null;
  if (value["overallBudgetSeconds"] !== M3_OVERALL_BUDGET_SECONDS) return null;
  if (value["terminationGraceSeconds"] !== M3_TERMINATION_GRACE_SECONDS) return null;
  if (decodeTerminalCause(value["terminalCause"]) === null) return null;
  return Object.freeze({
    adapterId: value["adapterId"] as M3AdapterId,
    adapterContractVersion: M3_ADAPTER_CONTRACT_VERSION,
    executable: expectedExecutable,
    argv: Object.freeze([...value["argv"]]),
    argvDigest: value["argvDigest"],
    cwdRole: "project-root" as const,
    stepLimitSeconds: M3_STEP_LIMIT_SECONDS,
    overallBudgetSeconds: M3_OVERALL_BUDGET_SECONDS,
    terminationGraceSeconds: M3_TERMINATION_GRACE_SECONDS,
    terminalCause: value["terminalCause"] as string,
  });
}

/**
 * Canonical v2 context encoding: fixed field order, one fact per line.
 * Identical contexts encode identically; machine-specific formatting
 * (absolute paths, timestamps) is excluded by construction.
 */
export function encodeExecutionContextV2(context: EvidenceV2ExecutionContext): string {
  return [
    `adapterId=${context.adapterId}`,
    `adapterContractVersion=${String(context.adapterContractVersion)}`,
    `executable=${context.executable}`,
    `argv=${encodeArgvForDigest(context.argv)}`,
    `argvDigest=${context.argvDigest}`,
    `cwdRole=${context.cwdRole}`,
    `stepLimitSeconds=${String(context.stepLimitSeconds)}`,
    `overallBudgetSeconds=${String(context.overallBudgetSeconds)}`,
    `terminationGraceSeconds=${String(context.terminationGraceSeconds)}`,
    `terminalCause=${context.terminalCause}`,
  ].join("\n");
}

/** SHA-256 hex digest of the canonical v2 context encoding. */
export function digestExecutionContextV2(context: EvidenceV2ExecutionContext): string {
  return sha256Hex(encodeExecutionContextV2(context));
}

const V2_RECORD_FIELDS = [
  "schemaVersion",
  "actor",
  "recordedAt",
  "taskId",
  "capability",
  "policyDecision",
  "target",
  "result",
  "provenance",
  "executionContext",
] as const;

/** Strict v2 record validation. Unknown or malformed → null (fail closed). */
export function isEvidenceRecordV2(value: unknown): value is EvidenceRecordV2 {
  if (!isRecord(value)) return false;
  if (value["schemaVersion"] !== EVIDENCE_V2_SCHEMA_VERSION) return false;
  if (Object.keys(value).some((field) => !(V2_RECORD_FIELDS as readonly string[]).includes(field))) {
    return false;
  }
  if (
    !isNonEmptyText(value["actor"]) ||
    !isNonEmptyText(value["recordedAt"]) ||
    !isNonEmptyText(value["taskId"]) ||
    !isNonEmptyText(value["capability"]) ||
    !isPolicyDecision(value["policyDecision"]) ||
    !isNonEmptyText(value["target"]) ||
    typeof value["result"] !== "string" ||
    !isNonEmptyText(value["provenance"])
  ) {
    return false;
  }
  return parseExecutionContext(value["executionContext"]) !== null;
}

/**
 * Version-discriminating reader for stored evidence lines. v1 records keep
 * their accepted meaning; v2 records parse as the explicit superset; any
 * other schema version — or a malformed v2 — reports unknown and must never
 * be silently accepted or reinterpreted.
 */
export function parseStoredEvidenceRecord(value: unknown): StoredEvidenceRecordOutcome {
  if (!isRecord(value)) return Object.freeze({ kind: "unknown" as const });
  if (value["schemaVersion"] === EVIDENCE_V2_SCHEMA_VERSION) {
    if (!isEvidenceRecordV2(value)) return Object.freeze({ kind: "unknown" as const });
    return Object.freeze({ kind: "v2" as const, record: value });
  }
  if (value["schemaVersion"] === 1) {
    if (!isEvidenceRecord(value)) return Object.freeze({ kind: "unknown" as const });
    return Object.freeze({ kind: "v1" as const, record: value });
  }
  return Object.freeze({ kind: "unknown" as const });
}

/**
 * Pure builder for one started step's v2 execution context. Inputs come only
 * from the resolved closed adapter contract plus the observed argv and the
 * controller-settled terminal cause — never from task/user input.
 */
export function createExecutionContextV2(
  contract: ResolvedAdapterContract,
  argv: readonly string[],
  terminalCause: M3TerminalCause,
): EvidenceV2ExecutionContext {
  return Object.freeze({
    adapterId: contract.adapterId,
    adapterContractVersion: M3_ADAPTER_CONTRACT_VERSION,
    executable: contract.executable,
    argv: Object.freeze([...argv]),
    argvDigest: digestArgv(argv),
    cwdRole: contract.cwdRole,
    stepLimitSeconds: M3_STEP_LIMIT_SECONDS,
    overallBudgetSeconds: M3_OVERALL_BUDGET_SECONDS,
    terminationGraceSeconds: M3_TERMINATION_GRACE_SECONDS,
    terminalCause: encodeTerminalCause(terminalCause),
  });
}

/**
 * M3-T3 input binding: machine-readable evidence that the exact manifest,
 * lockfile, tsconfig, and resolved-plan bytes observed immediately before
 * verification are the ones a run's v2 verification records bind to.
 *
 * The binding record itself uses the existing generic v1/common evidence
 * shape (capability repo.read, fixed target/provenance below): it records
 * an observed read/binding, not a process execution. Its result carries ONE
 * strict canonical encoding; bindingDigest = SHA-256 of that encoding.
 * Every runtime v2 repo.verify record references the digest through its
 * versioned provenance contract. No schema change, no new v2 fields.
 *
 * Scope of the claim: these fingerprints are evidence of the exact bytes
 * Sureflow observed immediately before verification. They do NOT claim the
 * project is hermetic — dependencies may still change externally, scripts
 * may still observe environment/network, and descendants may still mutate
 * external state. Post-write Git scope checks keep their existing purpose.
 */
export const VERIFICATION_INPUT_BINDING_TARGET = "verification-input-binding" as const;
export const VERIFICATION_INPUT_BINDING_PROVENANCE = "verification-input-binding-v1" as const;
export const VERIFICATION_EXECUTION_PROVENANCE_VERSION = "verification-execution-v2" as const;

export interface VerificationInputFingerprints {
  readonly manifestPath: "package.json";
  readonly manifestSha256: string;
  readonly lockfilePath: "package-lock.json" | "pnpm-lock.yaml";
  readonly lockfileSha256: string;
  readonly tsconfigPath: "tsconfig.json";
  readonly tsconfigSha256: string;
  readonly planDigest: string;
}

const HEX64_PATTERN = /^[0-9a-f]{64}$/u;

/** Canonical input-binding encoding: fixed order, one fact per line. */
export function encodeInputBindingV1(fingerprints: VerificationInputFingerprints): string {
  return [
    `v=${VERIFICATION_INPUT_BINDING_PROVENANCE}`,
    `manifest=${fingerprints.manifestPath}`,
    `manifest-sha256=${fingerprints.manifestSha256}`,
    `lockfile=${fingerprints.lockfilePath}`,
    `lockfile-sha256=${fingerprints.lockfileSha256}`,
    `tsconfig=${fingerprints.tsconfigPath}`,
    `tsconfig-sha256=${fingerprints.tsconfigSha256}`,
    `plan=${fingerprints.planDigest}`,
  ].join("\n");
}

/** SHA-256 hex digest of the canonical input-binding encoding. */
export function digestInputBindingV1(encoding: string): string {
  return sha256Hex(encoding);
}

function splitBindingLine(line: string): readonly [string, string] | null {
  const parts = line.split("=");
  if (parts.length !== 2) return null;
  const key = parts[0];
  const entry = parts[1];
  if (key === undefined || entry === undefined) return null;
  return [key, entry] as const;
}

/** Strict inverse of encodeInputBindingV1. Unknown or malformed → null. */
export function parseInputBindingV1(value: unknown): VerificationInputFingerprints | null {
  if (typeof value !== "string") return null;
  const lines = value.split("\n");
  if (lines.length !== 8) return null;
  const fields: Record<string, string> = {};
  for (const line of lines) {
    const split = splitBindingLine(line);
    if (split === null || split[0] in fields) return null;
    fields[split[0]] = split[1];
  }
  if (fields["v"] !== "verification-input-binding-v1") return null;
  if (fields["manifest"] !== "package.json") return null;
  if (fields["tsconfig"] !== "tsconfig.json") return null;
  const lockfile = fields["lockfile"];
  if (lockfile !== "package-lock.json" && lockfile !== "pnpm-lock.yaml") return null;
  const manifestSha256 = fields["manifest-sha256"];
  const lockfileSha256 = fields["lockfile-sha256"];
  const tsconfigSha256 = fields["tsconfig-sha256"];
  const planDigest = fields["plan"];
  if (
    manifestSha256 === undefined ||
    lockfileSha256 === undefined ||
    tsconfigSha256 === undefined ||
    planDigest === undefined
  ) {
    return null;
  }
  if (
    !HEX64_PATTERN.test(manifestSha256) ||
    !HEX64_PATTERN.test(lockfileSha256) ||
    !HEX64_PATTERN.test(tsconfigSha256) ||
    !HEX64_PATTERN.test(planDigest)
  ) {
    return null;
  }
  const parsed = Object.freeze({
    manifestPath: "package.json" as const,
    manifestSha256,
    lockfilePath: lockfile,
    lockfileSha256,
    tsconfigPath: "tsconfig.json" as const,
    tsconfigSha256,
    planDigest,
  });
  return encodeInputBindingV1(parsed) === value ? parsed : null;
}

export interface ResolvedPlanDigestInputs {
  readonly adapterId: M3AdapterId;
  readonly adapterContractVersion: typeof M3_ADAPTER_CONTRACT_VERSION;
  readonly executable: "npm" | "pnpm";
  readonly cwdRole: M3CwdRole;
  readonly steps: readonly {
    readonly check: string;
    readonly argv: readonly string[];
  }[];
}

/**
 * Canonical resolved-plan encoding: fixed order with collision-safe
 * length-prefixed argv boundaries per step. Excludes timestamps, absolute
 * paths, and random values by construction.
 */
export function encodeResolvedPlanV1(input: ResolvedPlanDigestInputs): string {
  const lines = [
    "v=resolved-verification-plan-v1",
    `adapterId=${input.adapterId}`,
    `adapterContractVersion=${String(input.adapterContractVersion)}`,
    `executable=${input.executable}`,
    `cwdRole=${input.cwdRole}`,
    "shell=false",
  ];
  for (const step of input.steps) {
    lines.push(`step=${step.check}:${encodeArgvForDigest(step.argv)}`);
  }
  return lines.join("\n");
}

/** SHA-256 hex digest of the canonical resolved-plan encoding. */
export function digestResolvedPlanV1(input: ResolvedPlanDigestInputs): string {
  return sha256Hex(encodeResolvedPlanV1(input));
}

/**
 * Versioned machine-parsed provenance contract for runtime v2 repo.verify
 * records: `verification-execution-v2;binding=<64hex>;shell=false`.
 * The binding value must equal the run's input-binding digest.
 */
export function encodeExecutionProvenanceV2(bindingDigest: string): string {
  return `${VERIFICATION_EXECUTION_PROVENANCE_VERSION};binding=${bindingDigest};shell=false`;
}

/** Strict provenance parser. Returns the binding digest, or null. */
export function parseExecutionProvenanceV2(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const match = /^verification-execution-v2;binding=([0-9a-f]{64});shell=false$/u.exec(value);
  const digest = match?.[1];
  return digest === undefined ? null : digest;
}
