/**
 * Minimal M1 runtime-state contracts (T2).
 *
 * Authority rule (AC-6): `.sureflow/state/` is the SOLE authoritative
 * runtime-state namespace. `docs/STATE.md` is project/process
 * documentation and MUST NOT be consulted by runtime code for state,
 * policy, verdicts, or execution eligibility. The path guard below
 * enforces this at the filesystem boundary.
 *
 * Deliberately minimal: no migrations, no event store (T3), no
 * workflow engine, no providers, no scheduler, no remote state.
 * `schemaVersion: 1` exists only so future readers can detect
 * incompatible state — it is not a migration framework.
 */
import { assertRuntimePathContained } from "./runtimeContainment.js";

export const STATE_SCHEMA_VERSION = 1 as const;

export type TaskStatus = "pending" | "running" | "accepted" | "halted";

export interface TaskState {
  readonly schemaVersion: typeof STATE_SCHEMA_VERSION;
  readonly taskId: string;
  readonly status: TaskStatus;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface ProjectState {
  readonly schemaVersion: typeof STATE_SCHEMA_VERSION;
  readonly projectName: string;
  readonly initializedAt: string;
}

export interface ActiveState {
  readonly schemaVersion: typeof STATE_SCHEMA_VERSION;
  readonly activeTaskId: string | null;
  readonly updatedAt: string;
}

const FORBIDDEN_RUNTIME_PATHS: readonly string[] = ["docs/STATE.md", "docs\\STATE.md"] as const;

/**
 * Resolve a path claimed to live under `.sureflow/state/`.
 * Throws on anything outside that namespace — including
 * `docs/STATE.md` — so runtime code cannot treat process docs
 * as authoritative state (AC-6).
 */
export function resolveStatePath(rootDir: string, relativePath: string): string {
  const normalized = relativePath.replace(/\\/g, "/");
  for (const forbidden of FORBIDDEN_RUNTIME_PATHS) {
    if (normalized === forbidden || normalized.endsWith(`/${forbidden}`)) {
      throw new Error(`refused: ${relativePath} is not authoritative runtime state`);
    }
  }
  const segments = normalized.split("/").filter((s) => s.length > 0);
  if (segments.length === 0 || segments[0] !== ".sureflow" || segments[1] !== "state") {
    throw new Error(`refused: ${relativePath} is outside .sureflow/state/`);
  }
  if (segments.includes("..")) {
    throw new Error(`refused: ${relativePath} escapes .sureflow/state/`);
  }
  assertRuntimePathContained(rootDir, segments.join("/"), ".sureflow/state");
  const cleanRoot = rootDir.replace(/\/+$/, "");
  return `${cleanRoot}/${segments.join("/")}`;
}

export function createTaskState(taskId: string, nowIso: string): TaskState {
  return {
    schemaVersion: STATE_SCHEMA_VERSION,
    taskId,
    status: "pending",
    createdAt: nowIso,
    updatedAt: nowIso,
  };
}

/** Minimal project state factory (T5 init). */
export function createProjectState(projectName: string, nowIso: string): ProjectState {
  return {
    schemaVersion: STATE_SCHEMA_VERSION,
    projectName,
    initializedAt: nowIso,
  };
}

/** Minimal active-task pointer factory (T5 init: no active task). */
export function createActiveState(nowIso: string): ActiveState {
  return {
    schemaVersion: STATE_SCHEMA_VERSION,
    activeTaskId: null,
    updatedAt: nowIso,
  };
}

export function isProjectState(value: unknown): value is ProjectState {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    v["schemaVersion"] === STATE_SCHEMA_VERSION &&
    typeof v["projectName"] === "string" &&
    typeof v["initializedAt"] === "string"
  );
}

export function isActiveState(value: unknown): value is ActiveState {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    v["schemaVersion"] === STATE_SCHEMA_VERSION &&
    (v["activeTaskId"] === null || typeof v["activeTaskId"] === "string") &&
    typeof v["updatedAt"] === "string"
  );
}

export function isTaskState(value: unknown): value is TaskState {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    v["schemaVersion"] === STATE_SCHEMA_VERSION &&
    typeof v["taskId"] === "string" &&
    (v["status"] === "pending" ||
      v["status"] === "running" ||
      v["status"] === "accepted" ||
      v["status"] === "halted") &&
    typeof v["createdAt"] === "string" &&
    typeof v["updatedAt"] === "string"
  );
}
