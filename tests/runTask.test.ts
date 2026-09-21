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
    expect(readExecutionEvents(root)[0]?.result).toBe("policy-denied");
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
    expect(readExecutionEvents(root)[0]?.result).toBe("approval-required");
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
    expect(readExecutionEvents(root).map((event) => event.result)).toEqual(["test-failed"]);
    expect(Object.keys(readExecutionEvents(root)[0] ?? {})).toEqual([
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
    expect(readExecutionEvents(root)).toHaveLength(1);
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
    expect(readExecutionEvents(root)).toHaveLength(0);
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
