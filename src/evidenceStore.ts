/**
 * Append-only JSONL evidence store (T3).
 *
 * - One complete valid JSON object per line; append semantics only
 *   (never overwrites prior records during normal writes).
 * - Malformed existing lines are SURFACED via `readEvidence()` as
 *   `corrupt` entries — never silently discarded, never repaired,
 *   and never interpreted as a verification verdict (T4 owns that).
 * - Supports both v1 and v2 evidence records; unknown schema versions
 *   surface as corrupt.
 */
import { appendFileSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, isAbsolute, relative, resolve } from "node:path";
import {
  type EvidenceDraft,
  type EvidenceRecord,
} from "./evidence.js";
import {
  isEvidenceRecordV2,
  type EvidenceRecordV2,
  parseStoredEvidenceRecord,
} from "./evidenceV2.js";
import { defaultEvidencePath, resolveEvidencePath } from "./evidencePaths.js";
import { toPersistedRecord } from "./redaction.js";

export type EvidenceReadEntry =
  | { readonly kind: "record"; readonly line: number; readonly record: EvidenceRecord | EvidenceRecordV2 }
  | { readonly kind: "corrupt"; readonly line: number; readonly raw: string; readonly error: string };

function resolveEvidenceFilePath(rootDir: string, filePath?: string): string {
  if (filePath === undefined) return defaultEvidencePath(rootDir);
  if (filePath.replace(/\\/g, "/").split("/").includes("..")) {
    throw new Error(`refused: ${filePath} escapes .sureflow/evidence/`);
  }
  if (!isAbsolute(filePath)) return resolveEvidencePath(rootDir, filePath);

  const relativePath = relative(resolve(rootDir), resolve(filePath)).replace(/\\/g, "/");
  if (relativePath === "" || relativePath === ".." || relativePath.startsWith("../")) {
    throw new Error(`refused: ${filePath} is outside .sureflow/evidence/`);
  }
  return resolveEvidencePath(rootDir, relativePath);
}

/** Append one redacted record. Creates parent dirs; never truncates. */
export function appendEvidence(
  rootDir: string,
  draft: EvidenceDraft,
  filePath?: string,
): EvidenceRecord {
  const absolute = resolveEvidenceFilePath(rootDir, filePath);
  mkdirSync(dirname(absolute), { recursive: true });
  const record = toPersistedRecord(draft);
  appendFileSync(absolute, `${JSON.stringify(record)}\n`, { encoding: "utf8" });
  return record;
}

/** Append a strictly validated v2 record. Fails fast on invalid input. */
export function appendEvidenceV2(
  rootDir: string,
  draft: Omit<EvidenceRecordV2, "schemaVersion">,
  filePath?: string,
): EvidenceRecordV2 {
  const absolute = resolveEvidenceFilePath(rootDir, filePath);
  mkdirSync(dirname(absolute), { recursive: true });
  const record = { ...draft, schemaVersion: 2 } as EvidenceRecordV2;
  if (!isEvidenceRecordV2(record)) throw new Error("invalid EvidenceRecord v2 draft");
  appendFileSync(absolute, `${JSON.stringify(record)}\n`, { encoding: "utf8" });
  return record;
}

/**
 * Read every line: valid records parse to `record` entries (v1 or v2);
 * blank lines are skipped; anything else surfaces as `corrupt`
 * with its line number, raw text, and parse/validation error.
 */
export function readEvidence(rootDir: string, filePath?: string): readonly EvidenceReadEntry[] {
  const absolute = resolveEvidenceFilePath(rootDir, filePath);
  let text: string;
  try {
    text = readFileSync(absolute, { encoding: "utf8" });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return [{ kind: "corrupt", line: 0, raw: "", error: `unreadable evidence file: ${message}` }];
  }
  const entries: EvidenceReadEntry[] = [];
  const lines = text.split("\n");
  for (let index = 0; index < lines.length; index += 1) {
    const raw = lines[index] ?? "";
    if (raw.trim().length === 0) continue;
    const line = index + 1;
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw) as unknown;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      entries.push({ kind: "corrupt", line, raw, error: message });
      continue;
    }
    const outcome = parseStoredEvidenceRecord(parsed);
    if (outcome.kind === "unknown") {
      entries.push({ kind: "corrupt", line, raw, error: "unknown schema version or malformed record" });
      continue;
    }
    entries.push({ kind: "record", line, record: outcome.record });
  }
  return entries;
}

export { resolveEvidencePath };
