/**
 * H5 single-project mutation lock.
 *
 * The lock is deliberately narrow: it excludes concurrent `init`, `run`, and
 * `verify` operations for one project. It is not a lease, stale-lock
 * detector, crash recovery mechanism, or TOCTOU-proof filesystem sandbox.
 */
import {
  closeSync,
  lstatSync,
  mkdirSync,
  openSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { hostname } from "node:os";
import { dirname } from "node:path";
import { randomUUID } from "node:crypto";
import { resolveStatePath } from "./state.js";

export const EXECUTION_LOCK_RELATIVE_PATH = ".sureflow/state/execution.lock" as const;

export interface MutationLockMetadata {
  readonly ownerToken: string;
  readonly operation: "init" | "run" | "verify";
  readonly pid: number;
  readonly hostname: string;
  readonly acquiredAt: string;
}

export interface MutationLock {
  readonly path: string;
  readonly ownerToken: string;
  readonly metadata: MutationLockMetadata;
}

export class MutationLockBusyError extends Error {
  constructor(path: string) {
    super(`mutation lock already exists: ${path}`);
    this.name = "MutationLockBusyError";
  }
}

export class MutationLockReleaseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MutationLockReleaseError";
  }
}

function errorCode(error: unknown): string | undefined {
  if (typeof error !== "object" || error === null || !("code" in error)) return undefined;
  const code = error.code;
  return typeof code === "string" ? code : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function executionLockPath(rootDir: string): string {
  return resolveStatePath(rootDir, EXECUTION_LOCK_RELATIVE_PATH);
}

/** First-init bootstrap only: create the lock's minimum parent ancestry. */
export function ensureExecutionLockParent(rootDir: string): string {
  const path = executionLockPath(rootDir);
  const parent = dirname(path);
  mkdirSync(parent, { recursive: true });
  return path;
}

export function mutationLockExists(rootDir: string): boolean {
  const path = executionLockPath(rootDir);
  try {
    lstatSync(path);
    return true;
  } catch (error: unknown) {
    if (errorCode(error) === "ENOENT") return false;
    throw error;
  }
}

export function acquireMutationLock(
  rootDir: string,
  operation: MutationLockMetadata["operation"],
): MutationLock {
  const path = executionLockPath(rootDir);
  const metadata: MutationLockMetadata = {
    ownerToken: randomUUID(),
    operation,
    pid: process.pid,
    hostname: hostname(),
    acquiredAt: new Date().toISOString(),
  };

  let descriptor: number | undefined;
  try {
    descriptor = openSync(path, "wx", 0o600);
  } catch (error: unknown) {
    if (errorCode(error) === "EEXIST") throw new MutationLockBusyError(path);
    throw error;
  }

  try {
    writeFileSync(descriptor, `${JSON.stringify(metadata)}\n`, "utf8");
    closeSync(descriptor);
    descriptor = undefined;
  } finally {
    if (descriptor !== undefined) closeSync(descriptor);
  }

  return { path, ownerToken: metadata.ownerToken, metadata };
}

function readOwnerToken(path: string): string {
  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(path, { encoding: "utf8" })) as unknown;
  } catch {
    throw new MutationLockReleaseError(
      "execution lock release integrity failure: current lock is unreadable or malformed",
    );
  }
  if (!isRecord(parsed) || typeof parsed.ownerToken !== "string") {
    throw new MutationLockReleaseError(
      "execution lock release integrity failure: current lock owner token is unavailable",
    );
  }
  return parsed.ownerToken;
}

/** Release only after rereading and matching the current owner token. */
export function releaseMutationLock(lock: MutationLock): void {
  let currentOwnerToken: string;
  try {
    currentOwnerToken = readOwnerToken(lock.path);
  } catch (error: unknown) {
    if (error instanceof MutationLockReleaseError) throw error;
    throw new MutationLockReleaseError(
      "execution lock release integrity failure: current lock could not be read",
    );
  }
  if (currentOwnerToken !== lock.ownerToken) {
    throw new MutationLockReleaseError(
      "execution lock release integrity failure: ownership changed",
    );
  }
  try {
    unlinkSync(lock.path);
  } catch {
    throw new MutationLockReleaseError(
      "execution lock release integrity failure: owned lock could not be removed",
    );
  }
}
