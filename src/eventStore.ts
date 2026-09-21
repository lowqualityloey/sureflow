/** Minimal M1 execution-event JSONL store. */
import { appendFileSync, mkdirSync, readFileSync } from "node:fs";
import { dirname } from "node:path";
import type { PolicyDecision } from "./policy.js";
import { redactUnknownValue } from "./redaction.js";
import { resolveSureflowPath } from "./sureflowPaths.js";

export const EVENTS_RELATIVE_PATH = ".sureflow/events/events.jsonl" as const;
export const EVENT_SCHEMA_VERSION = 1 as const;

export interface ExecutionEvent {
  readonly schemaVersion: typeof EVENT_SCHEMA_VERSION;
  readonly actor: string;
  readonly recordedAt: string;
  readonly taskId: string;
  readonly capability: string;
  readonly policyDecision: PolicyDecision;
  readonly target: string;
  readonly result: string;
  readonly provenance: string;
}

export type ExecutionEventDraft = Omit<ExecutionEvent, "schemaVersion">;

export type ExecutionEventReadEntry =
  | { readonly kind: "record"; readonly line: number; readonly event: ExecutionEvent }
  | { readonly kind: "corrupt"; readonly line: number; readonly raw: string; readonly error: string };

export function defaultEventsPath(rootDir: string): string {
  return resolveSureflowPath(rootDir, EVENTS_RELATIVE_PATH);
}

function toPersistedEvent(draft: ExecutionEventDraft): ExecutionEvent {
  const value = redactUnknownValue({ ...draft }) as Record<string, unknown>;
  return {
    schemaVersion: EVENT_SCHEMA_VERSION,
    actor: value["actor"] as string,
    recordedAt: value["recordedAt"] as string,
    taskId: value["taskId"] as string,
    capability: value["capability"] as string,
    policyDecision: value["policyDecision"] as PolicyDecision,
    target: value["target"] as string,
    result: value["result"] as string,
    provenance: value["provenance"] as string,
  };
}

export function isExecutionEvent(value: unknown): value is ExecutionEvent {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    v["schemaVersion"] === EVENT_SCHEMA_VERSION &&
    typeof v["actor"] === "string" &&
    typeof v["recordedAt"] === "string" &&
    typeof v["taskId"] === "string" &&
    typeof v["capability"] === "string" &&
    (v["policyDecision"] === "ALLOW" ||
      v["policyDecision"] === "DENY" ||
      v["policyDecision"] === "REQUIRE_APPROVAL") &&
    typeof v["target"] === "string" &&
    typeof v["result"] === "string" &&
    typeof v["provenance"] === "string"
  );
}

export function appendExecutionEvent(rootDir: string, draft: ExecutionEventDraft): ExecutionEvent {
  const path = defaultEventsPath(rootDir);
  mkdirSync(dirname(path), { recursive: true });
  const event = toPersistedEvent(draft);
  appendFileSync(path, `${JSON.stringify(event)}\n`, "utf8");
  return event;
}

export function readExecutionEvents(rootDir: string): readonly ExecutionEventReadEntry[] {
  let text: string;
  try {
    text = readFileSync(defaultEventsPath(rootDir), "utf8");
  } catch (error: unknown) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT") {
      return [];
    }
    const message = error instanceof Error ? error.message : String(error);
    return [{ kind: "corrupt", line: 0, raw: "", error: `unreadable event file: ${message}` }];
  }
  const entries: ExecutionEventReadEntry[] = [];
  const lines = text.split("\n");
  for (let index = 0; index < lines.length; index += 1) {
    const line = index + 1;
    const raw = lines[index] ?? "";
    if (raw.trim().length === 0) continue;
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw) as unknown;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      entries.push({ kind: "corrupt", line, raw, error: message });
      continue;
    }
    if (!isExecutionEvent(parsed)) {
      entries.push({ kind: "corrupt", line, raw, error: "line is not a valid ExecutionEvent" });
      continue;
    }
    entries.push({ kind: "record", line, event: parsed });
  }
  return entries;
}
