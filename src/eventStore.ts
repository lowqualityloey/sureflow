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

export function appendExecutionEvent(rootDir: string, draft: ExecutionEventDraft): ExecutionEvent {
  const path = defaultEventsPath(rootDir);
  mkdirSync(dirname(path), { recursive: true });
  const event = toPersistedEvent(draft);
  appendFileSync(path, `${JSON.stringify(event)}\n`, "utf8");
  return event;
}

export function readExecutionEvents(rootDir: string): readonly ExecutionEvent[] {
  let text: string;
  try {
    text = readFileSync(defaultEventsPath(rootDir), "utf8");
  } catch {
    return [];
  }
  const events: ExecutionEvent[] = [];
  for (const line of text.split("\n")) {
    if (line.trim().length === 0) continue;
    const parsed: unknown = JSON.parse(line);
    if (typeof parsed !== "object" || parsed === null) continue;
    const value = parsed as Record<string, unknown>;
    if (
      value["schemaVersion"] === EVENT_SCHEMA_VERSION &&
      typeof value["actor"] === "string" &&
      typeof value["recordedAt"] === "string" &&
      typeof value["taskId"] === "string" &&
      typeof value["capability"] === "string" &&
      (value["policyDecision"] === "ALLOW" ||
        value["policyDecision"] === "DENY" ||
        value["policyDecision"] === "REQUIRE_APPROVAL") &&
      typeof value["target"] === "string" &&
      typeof value["result"] === "string" &&
      typeof value["provenance"] === "string"
    ) {
      events.push(value as unknown as ExecutionEvent);
    }
  }
  return events;
}
