/**
 * Read the approved authoritative runtime state (T5, read-only).
 *
 * Never creates, repairs, migrates, or mutates state. Unknown or
 * unsupported state is reported as a problem, never as success
 * (UNKNOWN-never-PASS discipline applied to status reporting).
 */
import { existsSync, readFileSync } from "node:fs";
import {
  type ActiveState,
  type ProjectState,
  isActiveState,
  isProjectState,
} from "./state.js";
import { resolveStatePath } from "./state.js";

export const PROJECT_RELATIVE_PATH = ".sureflow/state/project.json" as const;
export const ACTIVE_RELATIVE_PATH = ".sureflow/state/active.json" as const;

export type StateReadOutcome =
  | { readonly kind: "ok"; readonly project: ProjectState; readonly active: ActiveState }
  | { readonly kind: "not-initialized"; readonly detail: string }
  | { readonly kind: "invalid"; readonly problems: readonly string[] };

function readJson(absPath: string, label: string, problems: string[]): unknown {
  try {
    return JSON.parse(readFileSync(absPath, { encoding: "utf8" })) as unknown;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    problems.push(`${label}: unreadable or malformed JSON (${message})`);
    return undefined;
  }
}

export function readRuntimeState(rootDir: string): StateReadOutcome {
  const projectPath = resolveStatePath(rootDir, PROJECT_RELATIVE_PATH);
  const activePath = resolveStatePath(rootDir, ACTIVE_RELATIVE_PATH);
  if (!existsSync(projectPath) && !existsSync(activePath)) {
    return { kind: "not-initialized", detail: "no state files under .sureflow/state/" };
  }

  const problems: string[] = [];
  const projectRaw = existsSync(projectPath)
    ? readJson(projectPath, "project.json", problems)
    : undefined;
  const activeRaw = existsSync(activePath)
    ? readJson(activePath, "active.json", problems)
    : undefined;
  if (!existsSync(projectPath)) problems.push("project.json: missing");
  if (!existsSync(activePath)) problems.push("active.json: missing");
  if (projectRaw !== undefined && !isProjectState(projectRaw)) {
    problems.push("project.json: does not satisfy the T2 ProjectState contract");
  }
  if (activeRaw !== undefined && !isActiveState(activeRaw)) {
    problems.push("active.json: does not satisfy the T2 ActiveState contract");
  }
  if (problems.length > 0) {
    return { kind: "invalid", problems };
  }
  return {
    kind: "ok",
    project: projectRaw as ProjectState,
    active: activeRaw as ActiveState,
  };
}
