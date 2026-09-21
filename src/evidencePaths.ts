/**
 * Resolve a path claimed to live under `.sureflow/evidence/`.
 * Throws on `docs/STATE.md`, anything outside the namespace,
 * `..` escapes, and non-`.jsonl` files.
 */
import { EVIDENCE_RELATIVE_PATH } from "./evidenceConstants.js";
import { assertRuntimePathContained } from "./runtimeContainment.js";

export function resolveEvidencePath(rootDir: string, relativePath: string): string {
  const normalized = relativePath.replace(/\\/g, "/");
  if (normalized === "docs/STATE.md" || normalized.endsWith("/docs/STATE.md")) {
    throw new Error(`refused: ${relativePath} is not evidence storage`);
  }
  const segments = normalized.split("/").filter((s) => s.length > 0);
  if (segments.length < 3 || segments[0] !== ".sureflow" || segments[1] !== "evidence") {
    throw new Error(`refused: ${relativePath} is outside .sureflow/evidence/`);
  }
  if (segments.includes("..")) {
    throw new Error(`refused: ${relativePath} escapes .sureflow/evidence/`);
  }
  const file = segments[segments.length - 1] ?? "";
  if (!file.endsWith(".jsonl")) {
    throw new Error(`refused: ${relativePath} is not a .jsonl evidence file`);
  }
  assertRuntimePathContained(rootDir, segments.join("/"), ".sureflow/evidence");
  const cleanRoot = rootDir.replace(/\/+$/, "");
  return `${cleanRoot}/${segments.join("/")}`;
}

/** Default evidence file for a project root. */
export function defaultEvidencePath(rootDir: string): string {
  return resolveEvidencePath(rootDir, EVIDENCE_RELATIVE_PATH);
}
