/**
 * M2-T1 control-plane task contract and immutable execution-plan snapshot.
 *
 * This module only parses and validates the one closed M2 contract. It does
 * not execute commands, inspect a project, mutate files, persist state, or
 * orchestrate a task.
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { TextDecoder } from "node:util";
import { resolveSureflowPath } from "./sureflowPaths.js";

export const M2_TASK_CONTRACT_SCHEMA_VERSION = 1 as const;
export const M2_TASK_CONTRACT_RELATIVE_PATH = ".sureflow/task.json" as const;
export const M4_TASK_CONTRACT_RELATIVE_PATH = M2_TASK_CONTRACT_RELATIVE_PATH;
export const M2_ADAPTER_ID = "node-typescript/npm-scripts-v1" as const;
/**
 * M3-T2 narrow pnpm counterpart. The closed adapter set stays exactly these
 * two compile-time members: nothing here may be extended at runtime.
 */
export const M3_PNPM_ADAPTER_ID = "node-typescript/pnpm-scripts-v1" as const;
export const M3_ADAPTER_IDS = [M2_ADAPTER_ID, M3_PNPM_ADAPTER_ID] as const;
export const M2_REPLACEMENT_OPERATION = "replace-existing-file" as const;
export const M4_TASK_CONTRACT_SCHEMA_VERSION = 2 as const;
export const M4_REPLACEMENT_OPERATION = "replace-existing-files" as const;

export const M2_VERIFICATION_PROFILES = [
  "typecheck",
  "test",
  "lint",
  "build",
] as const;

// allow: SIZE_OK — M4 v2 stays beside the v1 contract and shared authority path; T1 does not authorize a second runtime module.

export type M2AdapterId = typeof M2_ADAPTER_ID;
/** Closed M3 task-adapter identity: exactly npm-scripts-v1 or pnpm-scripts-v1. */
export type M3AdapterId = (typeof M3_ADAPTER_IDS)[number];
export type M2ReplacementOperation = typeof M2_REPLACEMENT_OPERATION;
export type M2VerificationProfile = (typeof M2_VERIFICATION_PROFILES)[number];
export type M4VerificationProfile = M2VerificationProfile;

export interface M2TaskContract {
  readonly schemaVersion: typeof M2_TASK_CONTRACT_SCHEMA_VERSION;
  readonly taskId: string;
  readonly adapter: M3AdapterId;
  readonly operation: M2ReplacementOperation;
  readonly targetPath: string;
  readonly expectedBeforeSha256: string;
  readonly replacementContent: string;
  readonly requiredVerification: readonly M2VerificationProfile[];
}

export interface ValidatedExecutionPlan {
  readonly schemaVersion: typeof M2_TASK_CONTRACT_SCHEMA_VERSION;
  readonly taskId: string;
  readonly adapter: M3AdapterId;
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

export interface M4TaskTarget {
  readonly path: string;
  readonly expectedBeforeSha256: string;
  readonly replacementContent: string;
}

export interface M4TaskContract {
  readonly schemaVersion: typeof M4_TASK_CONTRACT_SCHEMA_VERSION;
  readonly taskId: string;
  readonly adapter: M3AdapterId;
  readonly operation: typeof M4_REPLACEMENT_OPERATION;
  /** Declaration order is contract data, never runtime write-order authority. */
  readonly targets: readonly M4TaskTarget[];
  readonly requiredVerification: readonly M4VerificationProfile[];
}

export interface M4ValidatedExecutionPlan extends M4TaskContract {
  readonly contractSha256: string;
  readonly source: {
    readonly path: typeof M4_TASK_CONTRACT_RELATIVE_PATH;
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
  if (
    value.adapter !== M2_ADAPTER_ID &&
    (value.adapter as M3AdapterId) !== M3_PNPM_ADAPTER_ID
  ) {
    throw new Error("invalid M2 task contract: unsupported adapter");
  }
  if (value.operation !== M2_REPLACEMENT_OPERATION) {
    throw new Error("invalid M2 task contract: unsupported operation");
  }

  return Object.freeze({
    schemaVersion: M2_TASK_CONTRACT_SCHEMA_VERSION,
    taskId: validateTaskId(value.taskId),
    adapter: value.adapter as M3AdapterId,
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

const M4_TASK_CONTRACT_FIELDS = [
  "schemaVersion",
  "taskId",
  "adapter",
  "operation",
  "targets",
  "requiredVerification",
] as const;

const M4_TARGET_FIELDS = ["path", "expectedBeforeSha256", "replacementContent"] as const;

function assertM4ExactFields(value: Record<string, unknown>, fields: readonly string[]): void {
  const unsupported = Object.keys(value).filter((field) => !fields.includes(field));
  if (unsupported.length > 0) {
    throw new Error(`invalid M4 task contract: unsupported field(s): ${unsupported.join(", ")}`);
  }
  const missing = fields.filter((field) => !Object.hasOwn(value, field));
  if (missing.length > 0) {
    throw new Error(`invalid M4 task contract: missing field(s): ${missing.join(", ")}`);
  }
}

function validateM4TaskId(value: unknown): string {
  if (!isNonEmptyString(value) || hasControlCharacter(value)) {
    throw new Error("invalid M4 task contract: taskId must be a non-empty text identity");
  }
  return value;
}

function isM3AdapterId(value: unknown): value is M3AdapterId {
  return M3_ADAPTER_IDS.some((adapter) => adapter === value);
}

function validateM4TargetPath(value: unknown): string {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.includes("\u0000") ||
    value.includes("\\") ||
    value.startsWith("/") ||
    /^[A-Za-z]:/u.test(value)
  ) {
    throw new Error("invalid M4 task contract: target path must be repository-relative and normalized");
  }

  const segments = value.split("/");
  if (
    segments.some((segment) => segment.length === 0 || segment === "." || segment === "..") ||
    segments.includes(".git") ||
    segments.includes(".sureflow")
  ) {
    throw new Error("invalid M4 task contract: target path must be normalized and outside protected data");
  }
  return value;
}

function hasOnlyUnicodeScalars(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    const codeUnit = value.charCodeAt(index);
    if (codeUnit >= 0xd800 && codeUnit <= 0xdbff) {
      const next = value.charCodeAt(index + 1);
      if (Number.isNaN(next) || next < 0xdc00 || next > 0xdfff) return false;
      index += 1;
    } else if (codeUnit >= 0xdc00 && codeUnit <= 0xdfff) {
      return false;
    }
  }
  return true;
}

function isM4VerificationProfile(value: unknown): value is M4VerificationProfile {
  return typeof value === "string" && M2_VERIFICATION_PROFILES.some((profile) => profile === value);
}

function validateM4VerificationProfiles(value: unknown): readonly M4VerificationProfile[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error("invalid M4 task contract: requiredVerification must be a non-empty array");
  }

  const selected = new Set<M4VerificationProfile>();
  for (const profile of value) {
    if (!isM4VerificationProfile(profile)) {
      throw new Error(`invalid M4 task contract: unsupported verification profile ${String(profile)}`);
    }
    if (selected.has(profile)) {
      throw new Error(`invalid M4 task contract: duplicate verification profile ${profile}`);
    }
    selected.add(profile);
  }
  return Object.freeze(M2_VERIFICATION_PROFILES.filter((profile) => selected.has(profile)));
}

function validateM4Target(value: unknown): M4TaskTarget {
  if (!isRecord(value)) {
    throw new Error("invalid M4 task contract: target must be an object");
  }
  assertM4ExactFields(value, M4_TARGET_FIELDS);

  const path = validateM4TargetPath(value.path);
  const expectedBeforeSha256 = validateSha256(value.expectedBeforeSha256);
  if (typeof value.replacementContent !== "string") {
    throw new Error("invalid M4 task contract: replacementContent must be a string");
  }
  if (!hasOnlyUnicodeScalars(value.replacementContent)) {
    throw new Error("invalid M4 task contract: replacementContent must contain Unicode scalar values");
  }

  const replacementSha256 = sha256(Buffer.from(value.replacementContent, "utf8"));
  if (replacementSha256 === expectedBeforeSha256) {
    throw new Error(`invalid M4 task contract: target ${path} declares a no-op replacement`);
  }
  return Object.freeze({ path, expectedBeforeSha256, replacementContent: value.replacementContent });
}

/** Parse one closed M4 v2 contract without inspecting or mutating project files. */
export function parseM4TaskContract(value: unknown): M4TaskContract {
  if (!isRecord(value)) {
    throw new Error("invalid M4 task contract: expected an object");
  }
  assertM4ExactFields(value, M4_TASK_CONTRACT_FIELDS);

  if (value.schemaVersion !== M4_TASK_CONTRACT_SCHEMA_VERSION) {
    throw new Error("invalid M4 task contract: unsupported schemaVersion");
  }
  if (!isM3AdapterId(value.adapter)) {
    throw new Error("invalid M4 task contract: unsupported adapter");
  }
  if (value.operation !== M4_REPLACEMENT_OPERATION) {
    throw new Error("invalid M4 task contract: unsupported operation");
  }
  if (!Array.isArray(value.targets) || value.targets.length < 2 || value.targets.length > 5) {
    throw new Error("invalid M4 task contract: targets must contain 2–5 targets");
  }

  const targets = Object.freeze(value.targets.map(validateM4Target));
  const targetPaths = new Set<string>();
  for (const target of targets) {
    if (targetPaths.has(target.path)) {
      throw new Error(`invalid M4 task contract: duplicate target path ${target.path}`);
    }
    targetPaths.add(target.path);
  }

  return Object.freeze({
    schemaVersion: M4_TASK_CONTRACT_SCHEMA_VERSION,
    taskId: validateM4TaskId(value.taskId),
    adapter: value.adapter,
    operation: M4_REPLACEMENT_OPERATION,
    targets,
    requiredVerification: validateM4VerificationProfiles(value.requiredVerification),
  });
}

interface JsonStringToken {
  readonly value: string;
  readonly end: number;
}

interface JsonObjectScan {
  readonly end: number;
  readonly duplicateNames: readonly string[];
  readonly targetDuplicateNames: readonly string[];
  readonly declaresVersionTwo: boolean;
}

interface JsonArrayScan {
  readonly end: number;
  readonly duplicateNames: readonly string[];
}

function skipJsonWhitespace(json: string, start: number): number {
  let cursor = start;
  while (json[cursor] === " " || json[cursor] === "\t" || json[cursor] === "\r" || json[cursor] === "\n") {
    cursor += 1;
  }
  return cursor;
}

function readJsonStringToken(json: string, start: number): JsonStringToken {
  if (json[start] !== '"') throw new Error("malformed JSON string");
  let cursor = start + 1;
  while (cursor < json.length) {
    const character = json[cursor];
    if (character === "\\") {
      cursor += 2;
    } else if (character === '"') {
      const value: unknown = JSON.parse(json.slice(start, cursor + 1));
      if (typeof value !== "string") throw new Error("malformed JSON member name");
      return { value, end: cursor + 1 };
    } else {
      cursor += 1;
    }
  }
  throw new Error("malformed JSON string");
}

function skipJsonValueEnd(json: string, start: number): number {
  const valueStart = skipJsonWhitespace(json, start);
  const first = json[valueStart];
  if (first === '"') return readJsonStringToken(json, valueStart).end;
  if (first !== "{" && first !== "[") {
    let cursor = valueStart;
    while (
      cursor < json.length &&
      json[cursor] !== "," &&
      json[cursor] !== "}" &&
      json[cursor] !== "]" &&
      json[cursor] !== " " &&
      json[cursor] !== "\t" &&
      json[cursor] !== "\r" &&
      json[cursor] !== "\n"
    ) {
      cursor += 1;
    }
    if (cursor === valueStart) throw new Error("malformed JSON value");
    return cursor;
  }

  const closing = [first === "{" ? "}" : "]"];
  let cursor = valueStart + 1;
  while (closing.length > 0 && cursor < json.length) {
    const character = json[cursor];
    if (character === '"') {
      cursor = readJsonStringToken(json, cursor).end;
    } else if (character === "{") {
      closing.push("}");
      cursor += 1;
    } else if (character === "[") {
      closing.push("]");
      cursor += 1;
    } else if (character === "}" || character === "]") {
      if (closing.pop() !== character) throw new Error("malformed JSON nesting");
      cursor += 1;
    } else {
      cursor += 1;
    }
  }
  if (closing.length > 0) throw new Error("malformed JSON nesting");
  return cursor;
}

function scanDirectTargetArray(json: string, start: number): JsonArrayScan {
  if (json[start] !== "[") throw new Error("malformed targets array");
  const duplicateNames = new Set<string>();
  let cursor = skipJsonWhitespace(json, start + 1);
  while (json[cursor] !== "]") {
    if (cursor >= json.length) throw new Error("malformed targets array");
    if (json[cursor] === "{") {
      const scannedTarget = scanJsonObject(json, cursor, false);
      for (const name of scannedTarget.duplicateNames) duplicateNames.add(name);
      cursor = scannedTarget.end;
    } else {
      cursor = skipJsonValueEnd(json, cursor);
    }
    cursor = skipJsonWhitespace(json, cursor);
    if (json[cursor] === ",") {
      cursor = skipJsonWhitespace(json, cursor + 1);
    } else if (json[cursor] !== "]") {
      throw new Error("malformed targets array");
    }
  }
  return { end: cursor + 1, duplicateNames: [...duplicateNames] };
}

function scanJsonObject(json: string, start: number, scanTargets: boolean): JsonObjectScan {
  if (json[start] !== "{") throw new Error("malformed JSON object");
  const seenNames = new Set<string>();
  const duplicateNames = new Set<string>();
  const targetDuplicateNames = new Set<string>();
  let declaresVersionTwo = false;
  let cursor = skipJsonWhitespace(json, start + 1);

  while (json[cursor] !== "}") {
    if (cursor >= json.length) throw new Error("malformed JSON object");
    const member = readJsonStringToken(json, cursor);
    if (seenNames.has(member.value)) duplicateNames.add(member.value);
    seenNames.add(member.value);
    cursor = skipJsonWhitespace(json, member.end);
    if (json[cursor] !== ":") throw new Error("malformed JSON member");

    const valueStart = skipJsonWhitespace(json, cursor + 1);
    let valueEnd: number;
    if (scanTargets && member.value === "targets" && json[valueStart] === "[") {
      const targetArray = scanDirectTargetArray(json, valueStart);
      for (const name of targetArray.duplicateNames) targetDuplicateNames.add(name);
      valueEnd = targetArray.end;
    } else {
      valueEnd = skipJsonValueEnd(json, valueStart);
    }

    if (scanTargets && member.value === "schemaVersion") {
      try {
        const parsedVersion: unknown = JSON.parse(json.slice(valueStart, valueEnd));
        if (parsedVersion === M4_TASK_CONTRACT_SCHEMA_VERSION) declaresVersionTwo = true;
      } catch {
        throw new Error("malformed JSON version value");
      }
    }

    cursor = skipJsonWhitespace(json, valueEnd);
    if (json[cursor] === ",") {
      cursor = skipJsonWhitespace(json, cursor + 1);
    } else if (json[cursor] !== "}") {
      throw new Error("malformed JSON object");
    }
  }

  return {
    end: cursor + 1,
    duplicateNames: [...duplicateNames],
    targetDuplicateNames: [...targetDuplicateNames],
    declaresVersionTwo,
  };
}

function rejectDuplicateM4JsonMembers(rawText: string): void {
  let scan: JsonObjectScan;
  try {
    scan = scanJsonObject(rawText, skipJsonWhitespace(rawText, 0), true);
  } catch {
    return;
  }
  if (!scan.declaresVersionTwo) return;
  const duplicateTopLevelName = scan.duplicateNames[0];
  if (duplicateTopLevelName !== undefined) {
    throw new Error(`invalid M4 task contract: duplicate top-level member ${duplicateTopLevelName}`);
  }
  const duplicateTargetName = scan.targetDuplicateNames[0];
  if (duplicateTargetName !== undefined) {
    throw new Error(`invalid M4 task contract: duplicate target member ${duplicateTargetName}`);
  }
}

function createValidatedM4ExecutionPlan(
  contract: M4TaskContract,
  contractSha256: string,
): M4ValidatedExecutionPlan {
  const source = Object.freeze({ path: M4_TASK_CONTRACT_RELATIVE_PATH, sha256: contractSha256 });
  return Object.freeze({
    ...contract,
    contractSha256,
    source,
  });
}

/** Read one raw v2 authority snapshot; runtime dispatch remains owned by T5. */
export function loadValidatedM4ExecutionPlan(rootDir: string): M4ValidatedExecutionPlan {
  const contractPath = resolveSureflowPath(rootDir, M4_TASK_CONTRACT_RELATIVE_PATH);
  const bytes = readFileSync(contractPath);
  let rawText: string;
  try {
    rawText = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(bytes);
  } catch {
    throw new Error("invalid M4 task contract: contract bytes must be valid UTF-8");
  }

  rejectDuplicateM4JsonMembers(rawText);
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    throw new Error("invalid M4 task contract: malformed JSON");
  }
  const contract = parseM4TaskContract(parsed);
  return createValidatedM4ExecutionPlan(contract, sha256(bytes));
}
