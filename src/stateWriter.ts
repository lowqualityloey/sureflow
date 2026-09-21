/**
 * `sureflow init` writer (T5).
 *
 * Creates only the approved M1 runtime layout: the `.sureflow/`
 * subdirectories, the static default-deny policy file, and the
 * minimum authoritative state (`project.json`, `active.json`).
 * No task records, no evidence, no events, no fixtures, no
 * migration machinery. Refuses to overwrite existing state unless
 * explicitly forced.
 */
import { existsSync, mkdirSync } from "node:fs";
import { atomicReplaceTextFile } from "./atomicStateWrite.js";
import { DEFAULT_M1_POLICY } from "./policy.js";
import {
  POLICY_RELATIVE_PATH,
  RUNTIME_SUBDIRECTORIES,
  resolveSureflowPath,
} from "./sureflowPaths.js";
import {
  createActiveState,
  createProjectState,
  isActiveState,
  isProjectState,
  resolveStatePath,
} from "./state.js";
import {
  ACTIVE_RELATIVE_PATH,
  PROJECT_RELATIVE_PATH,
  TASKS_RELATIVE_PATH,
  readRuntimeState,
} from "./stateReader.js";

export interface InitRequest {
  readonly rootDir: string;
  readonly projectName: string;
  readonly nowIso: string;
  readonly force: boolean;
}

export type InitOutcome =
  | {
      readonly kind: "initialized";
      readonly createdPaths: readonly string[];
      readonly verified: string;
    }
  | { readonly kind: "already-initialized"; readonly existingPath: string };

function writeJson(absPath: string, value: unknown): void {
  atomicReplaceTextFile(absPath, `${JSON.stringify(value, null, 2)}\n`);
}

export function initRuntimeState(request: InitRequest): InitOutcome {
  const { rootDir, force } = request;
  // State paths go through the T2 authoritative resolver (AC-6 boundary).
  const projectPath = resolveStatePath(rootDir, PROJECT_RELATIVE_PATH);
  const activePath = resolveStatePath(rootDir, ACTIVE_RELATIVE_PATH);
  const tasksPath = resolveStatePath(rootDir, TASKS_RELATIVE_PATH);
  if (existsSync(projectPath) && !force) {
    return { kind: "already-initialized", existingPath: PROJECT_RELATIVE_PATH };
  }
  if (force && (existsSync(projectPath) || existsSync(activePath) || existsSync(tasksPath))) {
    const existing = readRuntimeState(rootDir);
    if (existing.kind === "invalid") {
      // Force must not detach a non-terminal task or rewrite malformed state.
      // Keep the existing CLI refusal surface; callers can inspect the state
      // without any mutation having occurred.
      return { kind: "already-initialized", existingPath: PROJECT_RELATIVE_PATH };
    }
    if (existing.kind === "ok" && existing.tasks.some((task) =>
      task.status === "pending" || task.status === "running"
    )) {
      return { kind: "already-initialized", existingPath: PROJECT_RELATIVE_PATH };
    }
  }

  const createdPaths: string[] = [];
  for (const relative of RUNTIME_SUBDIRECTORIES) {
    const absolute = resolveSureflowPath(rootDir, relative);
    if (!existsSync(absolute)) {
      mkdirSync(absolute, { recursive: true });
      createdPaths.push(relative);
    }
  }

  const policyPath = resolveSureflowPath(rootDir, POLICY_RELATIVE_PATH);
  writeJson(policyPath, DEFAULT_M1_POLICY);
  createdPaths.push(POLICY_RELATIVE_PATH);

  writeJson(projectPath, createProjectState(request.projectName, request.nowIso));
  createdPaths.push(PROJECT_RELATIVE_PATH);
  writeJson(
    resolveStatePath(rootDir, ACTIVE_RELATIVE_PATH),
    createActiveState(request.nowIso),
  );
  createdPaths.push(ACTIVE_RELATIVE_PATH);

  // "What was verified": re-read the state we just wrote through the
  // read-only path and confirm it satisfies the T2 contracts.
  const outcome = readRuntimeState(rootDir);
  if (outcome.kind !== "ok") {
    throw new Error(
      `init wrote state that failed T2 contract validation (${outcome.kind}): ` +
        (outcome.kind === "invalid" ? outcome.problems.join("; ") : outcome.detail),
    );
  }
  const verified =
    isProjectState(outcome.project) && isActiveState(outcome.active)
      ? "state schemaVersion 1 validates against the T2 contracts (project.json, active.json)"
      : "state validation could not be confirmed";

  return { kind: "initialized", createdPaths, verified };
}
