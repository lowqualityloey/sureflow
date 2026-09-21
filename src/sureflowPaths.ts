/**
 * Approved `.sureflow/` runtime layout and its path jail (T5).
 *
 * Single owner of the runtime namespace layout. Each domain still
 * owns its own boundary check: `state.ts#resolveStatePath` remains
 * the authoritative state resolver (including its `docs/STATE.md`
 * refusal), and `evidencePaths.ts` remains the evidence resolver.
 * This module only adds the layout that `init` must create.
 */
import { assertRuntimePathContained } from "./runtimeContainment.js";

export const SUREFLOW_DIRECTORY = ".sureflow" as const;

/** Directories created by `sureflow init` (M1 spec §5). */
export const RUNTIME_SUBDIRECTORIES: readonly string[] = [
  ".sureflow/state",
  ".sureflow/state/tasks",
  ".sureflow/events",
  ".sureflow/evidence",
  ".sureflow/policy",
] as const;

/** Approved static default-deny policy file (M1 spec §4). */
export const POLICY_RELATIVE_PATH = ".sureflow/policy/default.json" as const;

/**
 * Resolve a path inside the approved `.sureflow/` runtime namespace.
 * Refuses absolute paths, `..` traversal, and anything outside
 * `.sureflow/` — which includes `docs/STATE.md` and any PromptKit
 * record path, since none live under `.sureflow/`.
 */
export function resolveSureflowPath(rootDir: string, relativePath: string): string {
  const normalized = relativePath.replace(/\\/g, "/");
  if (normalized.startsWith("/")) {
    throw new Error(`refused: ${relativePath} is absolute`);
  }
  const segments = normalized.split("/").filter((segment) => segment.length > 0);
  if (segments.length < 2 || segments[0] !== SUREFLOW_DIRECTORY) {
    throw new Error(`refused: ${relativePath} is outside ${SUREFLOW_DIRECTORY}/`);
  }
  if (segments.includes("..")) {
    throw new Error(`refused: ${relativePath} escapes ${SUREFLOW_DIRECTORY}/`);
  }
  assertRuntimePathContained(rootDir, segments.join("/"), SUREFLOW_DIRECTORY);
  const cleanRoot = rootDir.replace(/\/+$/, "");
  return `${cleanRoot}/${segments.join("/")}`;
}
