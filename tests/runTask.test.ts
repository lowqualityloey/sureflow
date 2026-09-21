import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { appendExecutionEvent, readExecutionEvents } from "../src/eventStore.js";
import { appendEvidence, readEvidence } from "../src/evidenceStore.js";
import { DEFAULT_M1_POLICY } from "../src/policy.js";
import { REDACTED } from "../src/redaction.js";
import { runT0Task } from "../src/runTask.js";
import { readRuntimeState } from "../src/stateReader.js";
import { initRuntimeState } from "../src/stateWriter.js";
import type { T0TaskFixture } from "../src/t0Fixture.js";
import { verifyEvidence } from "../src/verifier.js";
import {
  dispatchNpmTest,
  repoRead,
  repoWrite,
  type NpmTestProcessOutcome,
} from "../src/worker.js";

const temps: string[] = [];
const DEFAULT_FIXTURE: T0TaskFixture = {
  taskId: "TASK-T0-BASIC",
  capability: "repo.test",
  target: "fixtures/t0-basic/output.txt",
  expectedResult: "ok",
  testProfile: "npm-test",
};

function tempRoot(): string {
  const root = mkdtempSync(join(tmpdir(), "sureflow-t6-"));
  temps.push(root);
  return root;
}

afterEach(() => {
  for (const root of temps.splice(0)) rmSync(root, { recursive: true, force: true });
});

function setup(fixture: unknown = DEFAULT_FIXTURE): string {
  const root = tempRoot();
  mkdirSync(join(root, "fixtures/t0-basic"), { recursive: true });
  writeFileSync(
    join(root, "fixtures/t0-basic/task.json"),
    `${JSON.stringify(fixture, null, 2)}\n`,
    "utf8",
  );
  initRuntimeState({
    rootDir: root,
    projectName: "t6-test",
    nowIso: "2026-09-21T00:00:00.000Z",
    force: false,
  });
  return root;
}

function setPolicy(root: string, allowlist: readonly string[], protectedOperations: readonly string[]): void {
  writeFileSync(
    join(root, ".sureflow/policy/default.json"),
    `${JSON.stringify({ allowlist, protectedOperations }, null, 2)}\n`,
    "utf8",
  );
}

function queued(outcomes: readonly NpmTestProcessOutcome[]): {
  readonly execute: (workerRoot: string) => NpmTestProcessOutcome;
  readonly calls: string[];
} {
  const queue = [...outcomes];
  const calls: string[] = [];
  return {
    calls,
    execute: (workerRoot) => {
      calls.push(workerRoot);
      const outcome = queue.shift();
      if (outcome === undefined) throw new Error("unexpected third execution");
      return outcome;
    },
  };
}

function taskStatus(root: string): string {
  const value: unknown = JSON.parse(
    readFileSync(join(root, ".sureflow/state/tasks/TASK-T0-BASIC.json"), "utf8"),
  );
  return (value as Record<string, unknown>)["status"] as string;
}

function evidenceRecords(root: string): readonly Extract<ReturnType<typeof readEvidence>[number], { kind: "record" }>[] {
  return readEvidence(root).filter((entry) => entry.kind === "record");
}

function eventRecords(root: string): readonly Extract<ReturnType<typeof readExecutionEvents>[number], { kind: "record" }>[] {
  return readExecutionEvents(root).filter((entry) => entry.kind === "record");
}

function eventsPath(root: string): string {
  return join(root, ".sureflow/events/events.jsonl");
}

function ensureEventsDirectory(root: string): void {
  mkdirSync(join(root, ".sureflow/events"), { recursive: true });
}

function eventJson(result: string): string {
  return JSON.stringify({
    schemaVersion: 1,
    actor: "worker:t0",
    recordedAt: "2026-09-21T00:00:00.000Z",
    taskId: DEFAULT_FIXTURE.taskId,
    capability: DEFAULT_FIXTURE.capability,
    policyDecision: "ALLOW",
    target: DEFAULT_FIXTURE.target,
    result,
    provenance: "npm test; shell=false",
  });
}

describe("T6 closed npm-test dispatch", () => {
  it("always dispatches npm test with shell false and bounded cwd", () => {
    const calls: unknown[][] = [];
    const outcome = dispatchNpmTest("/bounded/worker", (executable, argv, options) => {
      calls.push([executable, argv, options]);
      return { status: 0, signal: null };
    });
    expect(outcome).toEqual({ kind: "exited", exitCode: 0 });
    expect(calls).toEqual([
      ["npm", ["test"], { cwd: "/bounded/worker", shell: false, stdio: "ignore" }],
    ]);
  });
});

describe("T6 event persistence boundary", () => {
  it("redacts execution-derived event data before appending bytes", () => {
    const root = tempRoot();
    const secret = "sk-12345678-abcd1234";
    appendExecutionEvent(root, {
      actor: "worker:t0",
      recordedAt: "2026-09-21T00:00:00.000Z",
      taskId: "TASK-T0-BASIC",
      capability: "repo.test",
      policyDecision: "ALLOW",
      target: `fixtures/t0-basic/${secret}.txt`,
      result: secret,
      provenance: `npm test ${secret}`,
    });

    const persisted = readFileSync(
      join(root, ".sureflow/events/events.jsonl"),
      "utf8",
    );
    expect(persisted).not.toContain(secret);
    expect(persisted).toContain(REDACTED);
  });
});

describe("H6 event corruption surfacing", () => {
  it("treats a missing events.jsonl as empty history without creating it", () => {
    const root = tempRoot();

    expect(readExecutionEvents(root)).toEqual([]);
    expect(existsSync(eventsPath(root))).toBe(false);
  });

  it("preserves valid event entries in source order", () => {
    const root = tempRoot();
    appendExecutionEvent(root, {
      actor: "worker:t0",
      recordedAt: "2026-09-21T00:00:00.000Z",
      taskId: DEFAULT_FIXTURE.taskId,
      capability: DEFAULT_FIXTURE.capability,
      policyDecision: "ALLOW",
      target: DEFAULT_FIXTURE.target,
      result: "first",
      provenance: "npm test; shell=false",
    });
    appendExecutionEvent(root, {
      actor: "worker:t0",
      recordedAt: "2026-09-21T00:00:01.000Z",
      taskId: DEFAULT_FIXTURE.taskId,
      capability: DEFAULT_FIXTURE.capability,
      policyDecision: "ALLOW",
      target: DEFAULT_FIXTURE.target,
      result: "second",
      provenance: "npm test; shell=false",
    });

    expect(eventRecords(root).map((entry) => entry.event.result)).toEqual(["first", "second"]);
  });

  it("surfaces malformed JSON without throwing or changing bytes", () => {
    const root = tempRoot();
    ensureEventsDirectory(root);
    const raw = "{malformed event\n";
    writeFileSync(eventsPath(root), raw, "utf8");

    expect(() => readExecutionEvents(root)).not.toThrow();
    const entries = readExecutionEvents(root);
    expect(entries).toHaveLength(1);
    const entry = entries[0];
    expect(entry?.kind).toBe("corrupt");
    if (entry?.kind === "corrupt") {
      expect(entry.line).toBe(1);
      expect(entry.raw).toBe("{malformed event");
      expect(entry.error).toBeTruthy();
    }
    expect(readFileSync(eventsPath(root), "utf8")).toBe(raw);
  });

  it("surfaces schema-invalid JSON rather than skipping it", () => {
    const root = tempRoot();
    ensureEventsDirectory(root);
    writeFileSync(eventsPath(root), `${JSON.stringify({ schemaVersion: 1, result: "missing fields" })}\n`, "utf8");

    const entries = readExecutionEvents(root);
    expect(entries).toHaveLength(1);
    const entry = entries[0];
    expect(entry?.kind).toBe("corrupt");
    if (entry?.kind === "corrupt") {
      expect(entry.line).toBe(1);
      expect(entry.raw).toContain("missing fields");
      expect(entry.error).toBe("line is not a valid ExecutionEvent");
    }
  });

  it("surfaces primitive and non-object lines as corruption", () => {
    const root = tempRoot();
    ensureEventsDirectory(root);
    writeFileSync(eventsPath(root), `null\n42\n"event"\n`, "utf8");

    expect(readExecutionEvents(root).map((entry) => entry.kind)).toEqual(["corrupt", "corrupt", "corrupt"]);
    expect(readExecutionEvents(root).map((entry) => entry.line)).toEqual([1, 2, 3]);
  });

  it("preserves valid and corrupt entries together in source order", () => {
    const root = tempRoot();
    ensureEventsDirectory(root);
    writeFileSync(eventsPath(root), `${eventJson("first")}\n{bad\n${eventJson("last")}\n`, "utf8");

    const entries = readExecutionEvents(root);
    expect(entries.map((entry) => entry.kind)).toEqual(["record", "corrupt", "record"]);
    expect(entries[0]?.kind === "record" ? entries[0].event.result : undefined).toBe("first");
    expect(entries[1]?.kind === "corrupt" ? entries[1].line : undefined).toBe(2);
    expect(entries[2]?.kind === "record" ? entries[2].event.result : undefined).toBe("last");
  });

  it("surfaces an unreadable existing event representation", () => {
    const root = tempRoot();
    mkdirSync(eventsPath(root), { recursive: true });

    const entries = readExecutionEvents(root);
    expect(entries).toHaveLength(1);
    const entry = entries[0];
    expect(entry?.kind).toBe("corrupt");
    if (entry?.kind === "corrupt") {
      expect(entry.line).toBe(0);
      expect(entry.raw).toBe("");
      expect(entry.error).toContain("unreadable event file");
    }
  });

  it("leaves corrupt event bytes unchanged after a read", () => {
    const root = tempRoot();
    ensureEventsDirectory(root);
    const raw = `${eventJson("valid")}\n{corrupt prefix\n`;
    writeFileSync(eventsPath(root), raw, "utf8");

    readExecutionEvents(root);

    expect(readFileSync(eventsPath(root), "utf8")).toBe(raw);
  });

  it("appends after corruption without rewriting the corrupt prefix", () => {
    const root = tempRoot();
    ensureEventsDirectory(root);
    const corruptPrefix = "{corrupt prefix\n";
    writeFileSync(eventsPath(root), corruptPrefix, "utf8");

    appendExecutionEvent(root, {
      actor: "worker:t0",
      recordedAt: "2026-09-21T00:00:00.000Z",
      taskId: DEFAULT_FIXTURE.taskId,
      capability: DEFAULT_FIXTURE.capability,
      policyDecision: "ALLOW",
      target: DEFAULT_FIXTURE.target,
      result: "appended",
      provenance: "npm test; shell=false",
    });

    const bytes = readFileSync(eventsPath(root), "utf8");
    expect(bytes.startsWith(corruptPrefix)).toBe(true);
    expect(eventRecords(root).map((entry) => entry.event.result)).toEqual(["appended"]);
  });

  it("keeps event corruption non-authoritative for verification and state", () => {
    const root = setup();
    appendEvidence(root, {
      actor: "worker:t0",
      recordedAt: "2026-09-21T00:00:03.000Z",
      taskId: DEFAULT_FIXTURE.taskId,
      capability: DEFAULT_FIXTURE.capability,
      policyDecision: "ALLOW",
      target: DEFAULT_FIXTURE.target,
      result: "ok",
      provenance: "npm test; shell=false",
    });
    ensureEventsDirectory(root);
    writeFileSync(eventsPath(root), "{corrupt event\n", "utf8");
    const beforeState = readRuntimeState(root);

    expect(readExecutionEvents(root)[0]?.kind).toBe("corrupt");
    expect(verifyEvidence({
      taskId: DEFAULT_FIXTURE.taskId,
      capability: DEFAULT_FIXTURE.capability,
      target: DEFAULT_FIXTURE.target,
      expectedResult: DEFAULT_FIXTURE.expectedResult,
    }, readEvidence(root))).toMatchObject({ verdict: "PASS" });
    expect(readRuntimeState(root)).toEqual(beforeState);
  });
});

describe("T6 worker path jail", () => {
  it("permits bounded read/write and rejects absolute, traversal, normalized, and symlink escapes", () => {
    const root = tempRoot();
    const workerRoot = join(root, "fixtures/t0-basic");
    mkdirSync(workerRoot, { recursive: true });
    repoWrite(root, workerRoot, "fixtures/t0-basic/inside.txt", "inside");
    expect(repoRead(root, workerRoot, "fixtures/t0-basic/inside.txt")).toBe("inside");

    const outside = join(root, "outside.txt");
    writeFileSync(outside, "outside", "utf8");
    expect(() => repoRead(root, workerRoot, outside)).toThrow(/absolute/);
    expect(() => repoRead(root, workerRoot, "fixtures/t0-basic/../outside.txt")).toThrow(/traversal/);
    expect(() => repoRead(root, workerRoot, "outside.txt")).toThrow(/normalized escape/);

    symlinkSync(outside, join(workerRoot, "link.txt"));
    expect(() => repoRead(root, workerRoot, "fixtures/t0-basic/link.txt")).toThrow(/symlink/);
    expect(readFileSync(outside, "utf8")).toBe("outside");
  });
});

describe("T6 policy, retry, evidence, verification, and state", () => {
  it("halts a mismatched CLI task identity before execution, retry, or evidence", () => {
    const root = setup();
    const process = queued([]);
    const outcome = runT0Task(
      { rootDir: root, requestedTaskId: "TASK-OTHER" },
      { executeNpmTest: process.execute },
    );
    expect(outcome.kind).toBe("halted");
    expect(outcome.reason).toMatch(/does not match/);
    expect(outcome.attempts).toBe(0);
    expect(process.calls).toHaveLength(0);
    expect(
      existsSync(join(root, ".sureflow/evidence/evidence.jsonl")),
    ).toBe(false);
  });

  it("evaluates ALLOW before one successful execution and accepts only after PASS", () => {
    const root = setup();
    const process = queued([{ kind: "exited", exitCode: 0 }]);
    let verificationCalls = 0;
    const outcome = runT0Task(
      { rootDir: root, requestedTaskId: DEFAULT_FIXTURE.taskId },
      {
        executeNpmTest: process.execute,
        nowIso: () => "2026-09-21T00:00:01.000Z",
        verify: (request, entries) => {
          verificationCalls += 1;
          return verifyEvidence(request, entries);
        },
      },
    );

    expect(outcome.kind).toBe("accepted");
    expect(outcome.policyDecision).toBe("ALLOW");
    expect(outcome.verdict).toBe("PASS");
    expect(outcome.result).toBe("ok");
    expect(outcome.transitions).toEqual(["pending", "running", "accepted"]);
    expect(process.calls).toHaveLength(1);
    expect(verificationCalls).toBe(1);
    expect(taskStatus(root)).toBe("accepted");
    expect(evidenceRecords(root)).toHaveLength(1);
    expect(evidenceRecords(root)[0]?.record.result).toBe("ok");
  });

  it("DENY causes zero execution, zero retry, no verifier call, and a halted task", () => {
    const root = setup();
    setPolicy(root, [], DEFAULT_M1_POLICY.protectedOperations);
    const process = queued([]);
    const outcome = runT0Task(
      { rootDir: root, requestedTaskId: DEFAULT_FIXTURE.taskId },
      { executeNpmTest: process.execute },
    );
    expect(outcome.policyDecision).toBe("DENY");
    expect(outcome.attempts).toBe(0);
    expect(outcome.verdict).toBeNull();
    expect(process.calls).toHaveLength(0);
    expect(taskStatus(root)).toBe("halted");
    expect(eventRecords(root)[0]?.event.result).toBe("policy-denied");
  });

  it("REQUIRE_APPROVAL is a terminal policy halt with zero execution and retry", () => {
    const root = setup();
    setPolicy(root, ["repo.test"], ["repo.test"]);
    const process = queued([]);
    const outcome = runT0Task(
      { rootDir: root, requestedTaskId: DEFAULT_FIXTURE.taskId },
      { executeNpmTest: process.execute },
    );
    expect(outcome.policyDecision).toBe("REQUIRE_APPROVAL");
    expect(outcome.attempts).toBe(0);
    expect(outcome.verdict).toBeNull();
    expect(process.calls).toHaveLength(0);
    expect(eventRecords(root)[0]?.event.result).toBe("approval-required");
  });

  it("rejects unsupported profile and jail escape before process execution", () => {
    const invalidProfile = setup({ ...DEFAULT_FIXTURE, testProfile: "custom" });
    const profileProcess = queued([]);
    expect(
      runT0Task(
        { rootDir: invalidProfile, requestedTaskId: DEFAULT_FIXTURE.taskId },
        { executeNpmTest: profileProcess.execute },
      ).attempts,
    ).toBe(0);
    expect(profileProcess.calls).toHaveLength(0);

    const escape = setup({ ...DEFAULT_FIXTURE, target: "../outside.txt" });
    const escapeProcess = queued([]);
    expect(
      runT0Task(
        { rootDir: escape, requestedTaskId: DEFAULT_FIXTURE.taskId },
        { executeNpmTest: escapeProcess.execute },
      ).reason,
    ).toMatch(/jail/);
    expect(escapeProcess.calls).toHaveLength(0);
  });

  it("treats an unsafe fixture taskId as a controlled zero-execution halt", () => {
    const root = setup({ ...DEFAULT_FIXTURE, taskId: "../escape" });
    const process = queued([]);
    const outcome = runT0Task(
      { rootDir: root, requestedTaskId: "../escape" },
      { executeNpmTest: process.execute },
    );
    expect(outcome.kind).toBe("halted");
    expect(outcome.reason).toMatch(/invalid fixture taskId/);
    expect(outcome.attempts).toBe(0);
    expect(process.calls).toHaveLength(0);
  });

  it("retains the first nonzero exit as an event, retries once, then accepts", () => {
    const root = setup();
    const process = queued([
      { kind: "exited", exitCode: 1 },
      { kind: "exited", exitCode: 0 },
    ]);
    const outcome = runT0Task(
      { rootDir: root, requestedTaskId: DEFAULT_FIXTURE.taskId },
      { executeNpmTest: process.execute },
    );
    expect(outcome.kind).toBe("accepted");
    expect(outcome.attempts).toBe(2);
    expect(process.calls).toHaveLength(2);
    expect(eventRecords(root).map((entry) => entry.event.result)).toEqual(["test-failed"]);
    expect(Object.keys(eventRecords(root)[0]?.event ?? {})).toEqual([
      "schemaVersion",
      "actor",
      "recordedAt",
      "taskId",
      "capability",
      "policyDecision",
      "target",
      "result",
      "provenance",
    ]);
    expect(evidenceRecords(root)).toHaveLength(1);
    expect(evidenceRecords(root)[0]?.record.result).toBe("ok");
  });

  it("stops after two nonzero exits and writes one terminal test-failed record", () => {
    const root = setup();
    const process = queued([
      { kind: "exited", exitCode: 1 },
      { kind: "exited", exitCode: 2 },
    ]);
    const outcome = runT0Task(
      { rootDir: root, requestedTaskId: DEFAULT_FIXTURE.taskId },
      { executeNpmTest: process.execute },
    );
    expect(outcome.kind).toBe("halted");
    expect(outcome.attempts).toBe(2);
    expect(outcome.verdict).toBe("FAIL");
    expect(process.calls).toHaveLength(2);
    expect(eventRecords(root)).toHaveLength(1);
    expect(evidenceRecords(root)).toHaveLength(1);
    expect(evidenceRecords(root)[0]?.record.result).toBe("test-failed");
    expect(taskStatus(root)).toBe("halted");
  });

  it.each([
    [{ kind: "spawn-error" } as const, "spawn-error"],
    [{ kind: "signaled", signal: "SIGTERM" } as const, "test-terminated"],
  ])("does not retry %j and persists terminal result %s", (processOutcome, expectedResult) => {
    const root = setup();
    const process = queued([processOutcome]);
    const outcome = runT0Task(
      { rootDir: root, requestedTaskId: DEFAULT_FIXTURE.taskId },
      { executeNpmTest: process.execute },
    );
    expect(outcome.kind).toBe("halted");
    expect(outcome.attempts).toBe(1);
    expect(process.calls).toHaveLength(1);
    expect(eventRecords(root)).toHaveLength(0);
    expect(evidenceRecords(root)[0]?.record.result).toBe(expectedResult);
  });

  it("keeps expectedResult fixture-owned rather than deriving it from exit-zero evidence", () => {
    const root = setup({ ...DEFAULT_FIXTURE, expectedResult: "fixture-specific" });
    const process = queued([{ kind: "exited", exitCode: 0 }]);
    const outcome = runT0Task(
      { rootDir: root, requestedTaskId: DEFAULT_FIXTURE.taskId },
      { executeNpmTest: process.execute },
    );
    expect(outcome.result).toBe("ok");
    expect(outcome.verdict).toBe("FAIL");
    expect(outcome.kind).toBe("halted");
    expect(taskStatus(root)).toBe("halted");
  });

  it("never accepts UNKNOWN and never produces duplicate terminal evidence", () => {
    const unknownRoot = setup();
    mkdirSync(join(unknownRoot, ".sureflow/evidence"), { recursive: true });
    writeFileSync(join(unknownRoot, ".sureflow/evidence/evidence.jsonl"), "{bad-json\n", "utf8");
    const unknownProcess = queued([{ kind: "exited", exitCode: 0 }]);
    const unknown = runT0Task(
      { rootDir: unknownRoot, requestedTaskId: DEFAULT_FIXTURE.taskId },
      { executeNpmTest: unknownProcess.execute },
    );
    expect(unknown.verdict).toBe("UNKNOWN");
    expect(unknown.kind).toBe("halted");

    const duplicateRoot = setup();
    appendEvidence(duplicateRoot, {
      actor: "worker:t0",
      recordedAt: "2026-09-21T00:00:00.000Z",
      taskId: DEFAULT_FIXTURE.taskId,
      capability: DEFAULT_FIXTURE.capability,
      policyDecision: "ALLOW",
      target: DEFAULT_FIXTURE.target,
      result: "ok",
      provenance: "fixture",
    });
    const duplicateProcess = queued([]);
    const duplicate = runT0Task(
      { rootDir: duplicateRoot, requestedTaskId: DEFAULT_FIXTURE.taskId },
      { executeNpmTest: duplicateProcess.execute },
    );
    expect(duplicate.reason).toMatch(/already exists/);
    expect(duplicateProcess.calls).toHaveLength(0);
    expect(evidenceRecords(duplicateRoot)).toHaveLength(1);
  });
});
