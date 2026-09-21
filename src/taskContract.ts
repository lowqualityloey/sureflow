/**
 * M2-T1 control-plane task contract and immutable execution-plan snapshot.
 *
 * This module only parses and validates the one closed M2 contract. It does
 * not execute commands, inspect a project, mutate files, persist state, or
 * orchestrate a task.
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolveSureflowPath } from "./sureflowPaths.js";

export const M2_TASK_CONTRACT_SCHEMA_VERSION = 1 as const;
export const M2_TASK_CONTRACT_RELATIVE_PATH = ".sureflow/task.json" as const;
export const M2_ADAPTER_ID = "node-typescript/npm-scripts-v1" as const;
export const M2_REPLACEMENT_OPERATION = "replace-existing-file" as const;

export const M2_VERIFICATION_PROFILES = [
  "typecheck",
  "test",
  "lint",
  "build",
] as const;

export type M2AdapterId = typeof M2_ADAPTER_ID;
export type M2ReplacementOperation = typeof M2_REPLACEMENT_OPERATION;
export type M2VerificationProfile = (typeof M2_VERIFICATION_PROFILES)[number];

export interface M2TaskContract {
  readonly schemaVersion: typeof M2_TASK_CONTRACT_SCHEMA_VERSION;
  readonly taskId: string;
  readonly adapter: M2AdapterId;
  readonly operation: M2ReplacementOperation;
  readonly targetPath: string;
  readonly expectedBeforeSha256: string;
  readonly replacementContent: string;
  readonly requiredVerification: readonly M2VerificationProfile[];
}

export interface ValidatedExecutionPlan {
  readonly schemaVersion: typeof M2_TASK_CONTRACT_SCHEMA_VERSION;
  readonly taskId: string;
  readonly adapter: M2AdapterId;
  readonly operation: M2ReplacementOperation;
  readonly targetPath: string;
  readonly expectedBeforeSha256: string;
  readonly replacementContent: string;
  readonly requiredVerification: readonly M2VerificationProfile[];
  readonly contractSha256: string;
  readonly source: {
    readonly path: typeof M2_TASK_CONTRACT_RELATIVE_PATH;
    readonly sha256: string;
  };
}

const TASK_CONTRACT_FIELDS: readonly string[] = [
  "schemaVersion",
  "taskId",
  "adapter",
  "operation",
  "targetPath",
  "expectedBeforeSha256",
  "replacementContent",
  "requiredVerification",
] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function hasControlCharacter(value: string): boolean {
  for (const character of value) {
    const codePoint = character.codePointAt(0);
    if (codePoint !== undefined && (codePoint < 0x20 || codePoint === 0x7f)) return true;
  }
  return false;
}

function assertExactFields(value: Record<string, unknown>): void {
  const unsupported = Object.keys(value).filter(
    (field) => !TASK_CONTRACT_FIELDS.includes(field),
  );
  if (unsupported.length > 0) {
    throw new Error(`invalid M2 task contract: unsupported field(s): ${unsupported.join(", ")}`);
  }
}

function validateTaskId(value: unknown): string {
  if (!isNonEmptyString(value) || hasControlCharacter(value)) {
    throw new Error("invalid M2 task contract: taskId must be a non-empty text identity");
  }
  return value;
}

function validateTargetPath(value: unknown): string {
  if (!isNonEmptyString(value) || value.includes("\u0000")) {
    throw new Error("invalid M2 task contract: targetPath must be a non-empty path");
  }

  const normalized = value.replace(/\\/g, "/");
  if (
    value !== normalized ||
    normalized.startsWith("/") ||
    normalized.startsWith("//") ||
    /^[A-Za-z]:($|\/)/u.test(normalized)
  ) {
    throw new Error("invalid M2 task contract: targetPath must be repository-relative");
  }

  const segments = normalized.split("/");
  if (
    segments.some((segment) => segment.length === 0 || segment === "." || segment === "..")
  ) {
    throw new Error("invalid M2 task contract: targetPath must be normalized");
  }
  if (segments.includes(".git") || segments.includes(".sureflow")) {
    throw new Error("invalid M2 task contract: targetPath cannot address control-plane data");
  }
  return normalized;
}

function validateSha256(value: unknown): string {
  if (typeof value !== "string" || !/^[0-9a-f]{64}$/u.test(value)) {
    throw new Error("invalid M2 task contract: expectedBeforeSha256 must be lowercase SHA-256");
  }
  return value;
}

function validateVerificationProfiles(value: unknown): readonly M2VerificationProfile[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error("invalid M2 task contract: requiredVerification must be a non-empty array");
  }

  const profiles: M2VerificationProfile[] = [];
  for (const profile of value) {
    if (
      typeof profile !== "string" ||
      !M2_VERIFICATION_PROFILES.includes(profile as M2VerificationProfile)
    ) {
      throw new Error(`invalid M2 task contract: unsupported verification profile ${String(profile)}`);
    }
    if (profiles.includes(profile as M2VerificationProfile)) {
      throw new Error(`invalid M2 task contract: duplicate verification profile ${profile}`);
    }
    profiles.push(profile as M2VerificationProfile);
  }
  return Object.freeze(profiles);
}

/** Parse one closed M2 task contract without performing any execution. */
export function parseM2TaskContract(value: unknown): M2TaskContract {
  if (!isRecord(value)) {
    throw new Error("invalid M2 task contract: expected an object");
  }
  assertExactFields(value);

  if (value.schemaVersion !== M2_TASK_CONTRACT_SCHEMA_VERSION) {
    throw new Error("invalid M2 task contract: unsupported schemaVersion");
  }
  if (value.adapter !== M2_ADAPTER_ID) {
    throw new Error("invalid M2 task contract: unsupported adapter");
  }
  if (value.operation !== M2_REPLACEMENT_OPERATION) {
    throw new Error("invalid M2 task contract: unsupported operation");
  }

  return Object.freeze({
    schemaVersion: M2_TASK_CONTRACT_SCHEMA_VERSION,
    taskId: validateTaskId(value.taskId),
    adapter: M2_ADAPTER_ID,
    operation: M2_REPLACEMENT_OPERATION,
    targetPath: validateTargetPath(value.targetPath),
    expectedBeforeSha256: validateSha256(value.expectedBeforeSha256),
    replacementContent:
      typeof value.replacementContent === "string"
        ? value.replacementContent
        : (() => {
            throw new Error("invalid M2 task contract: replacementContent must be a string");
          })(),
    requiredVerification: validateVerificationProfiles(value.requiredVerification),
  });
}

function sha256(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function createValidatedExecutionPlan(
  contract: M2TaskContract,
  contractSha256: string,
): ValidatedExecutionPlan {
  const source = Object.freeze({
    path: M2_TASK_CONTRACT_RELATIVE_PATH,
    sha256: contractSha256,
  });
  return Object.freeze({
    schemaVersion: contract.schemaVersion,
    taskId: contract.taskId,
    adapter: contract.adapter,
    operation: contract.operation,
    targetPath: contract.targetPath,
    expectedBeforeSha256: contract.expectedBeforeSha256,
    replacementContent: contract.replacementContent,
    requiredVerification: contract.requiredVerification,
    contractSha256,
    source,
  });
}

/**
 * Read the control-plane task bytes once and return the immutable T1 snapshot.
 * Later orchestration owns any mid-run re-read or integrity comparison.
 */
export function loadValidatedExecutionPlan(rootDir: string): ValidatedExecutionPlan {
  const contractPath = resolveSureflowPath(rootDir, M2_TASK_CONTRACT_RELATIVE_PATH);
  const bytes = readFileSync(contractPath);
  let parsed: unknown;
  try {
    parsed = JSON.parse(bytes.toString("utf8")) as unknown;
  } catch {
    throw new Error("invalid M2 task contract: malformed JSON");
  }
  const contract = parseM2TaskContract(parsed);
  return createValidatedExecutionPlan(contract, sha256(bytes));
}
