import {
  existsSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { type CliIo, runCli } from "../src/cli.js";
import { readEvidence } from "../src/evidenceStore.js";
import { readExecutionEvents } from "../src/eventStore.js";
import {
  DEFAULT_M1_POLICY,
  M1_PROTECTED_OPERATIONS,
  decidePolicy,
} from "../src/policy.js";
import { runT0Task } from "../src/runTask.js";
import { readRuntimeState } from "../src/stateReader.js";
import { beginTask, transitionTask } from "../src/taskStateStore.js";
import type { T0TaskFixture } from "../src/t0Fixture.js";
import { initRuntimeState } from "../src/stateWriter.js";
import type { NpmTestProcessOutcome } from "../src/worker.js";

const DEFAULT_FIXTURE: T0TaskFixture = {
  taskId: "TASK-T0-BASIC",
  capability: "repo.test",
  target: "fixtures/t0-basic/output.txt",
  expectedResult: "ok",
  testProfile: "npm-test",
};

const temps: string[] = [];

interface Captured {
  readonly code: number;
  readonly out: string;
  readonly err: string;
}

function tempRoot(): string {
  const root = mkdtempSync(join(tmpdir(), "sureflow-t9-"));
  temps.push(root);
  return root;
}

function cli(argv: readonly string[], cwd: string): Captured {
  const out: string[] = [];
  const err: string[] = [];
  const io: CliIo = {
    out: (line) => out.push(line),
    err: (line) => err.push(line),
  };
  return { code: runCli(argv, cwd, io), out: out.join("\n"), err: err.join("\n") };
}

function setup(fixture: T0TaskFixture = DEFAULT_FIXTURE): string {
  const root = tempRoot();
  mkdirSync(join(root, "fixtures/t0-basic"), { recursive: true });
  writeFileSync(
    join(root, "fixtures/t0-basic/task.json"),
    JSON.stringify(fixture, null, 2) + "\n",
    "utf8",
  );
  initRuntimeState({
    rootDir: root,
    projectName: "t9-test",
    nowIso: "2026-09-21T00:00:00.000Z",
    force: false,
  });
  return root;
}

function setPolicy(
  root: string,
  allowlist: readonly string[],
  protectedOperations: readonly string[],
): void {
  writeFileSync(
    join(root, ".sureflow/policy/default.json"),
    JSON.stringify({ allowlist, protectedOperations }, null, 2) + "\n",
    "utf8",
  );
}

function accepted(root: string): void {
  beginTask(root, DEFAULT_FIXTURE.taskId, "2026-09-21T00:00:01.000Z");
  transitionTask(root, DEFAULT_FIXTURE.taskId, "accepted", "2026-09-21T00:00:02.000Z");
}

function taskStatus(root: string): string {
  const raw: unknown = JSON.parse(
    readFileSync(join(root, ".sureflow/state/tasks/TASK-T0-BASIC.json"), "utf8"),
  );
  return (raw as { status: string }).status;
}

function activeTaskId(root: string): string | null {
  const raw: unknown = JSON.parse(
    readFileSync(join(root, ".sureflow/state/active.json"), "utf8"),
  );
  return (raw as { activeTaskId: string | null }).activeTaskId;
}

function snapshot(root: string): string {
  const files: string[] = [];
  const walk = (dir: string, prefix = ""): void => {
    for (const entry of readdirSync(dir, { withFileTypes: true }).sort((a, b) =>
      a.name.localeCompare(b.name),
    )) {
      const child = join(dir, entry.name);
      const relative = prefix + entry.name;
      if (entry.isDirectory()) {
        files.push(relative + "/");
        walk(child, relative + "/");
      } else {
        files.push(relative + ":" + readFileSync(child, "utf8"));
      }
    }
  };
  walk(root);
  return files.join("\n");
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
      if (outcome === undefined) throw new Error("unexpected extra execution");
      return outcome;
    },
  };
}


function terminalResult(root: string): string | null {
  const entry = readEvidence(root).find((candidate) => candidate.kind === "record");
  return entry?.kind === "record" ? entry.record.result : null;
}

function eventRecords(root: string): readonly Extract<ReturnType<typeof readExecutionEvents>[number], { kind: "record" }>[] {
  return readExecutionEvents(root).filter((entry) => entry.kind === "record");
}

function appendValidEvidence(root: string, result = "ok"): void {
  mkdirSync(join(root, ".sureflow/evidence"), { recursive: true });
  writeFileSync(
    join(root, ".sureflow/evidence/evidence.jsonl"),
    JSON.stringify({
      schemaVersion: 1,
      actor: "worker:t0",
      recordedAt: "2026-09-21T00:00:03.000Z",
      taskId: DEFAULT_FIXTURE.taskId,
      capability: DEFAULT_FIXTURE.capability,
      policyDecision: "ALLOW",
      target: DEFAULT_FIXTURE.target,
      result,
      provenance: "npm test; shell=false",
    }) + "\n",
    "utf8",
  );
}

afterEach(() => {
  for (const root of temps.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe("T9 AC-2/AC-3 policy denial and protected operations", () => {
  it("default-denies unknown capabilities without entering execution", () => {
    expect(decidePolicy(DEFAULT_M1_POLICY, "shell.exec")).toBe("DENY");
    expect(decidePolicy(DEFAULT_M1_POLICY, "repo.unknown")).toBe("DENY");
  });

  it("halts DENY before execution with exit 2, no terminal evidence, and no active task", () => {
    const root = setup();
    setPolicy(root, [], DEFAULT_M1_POLICY.protectedOperations);

    const result = cli(["run", DEFAULT_FIXTURE.taskId], root);

    expect(result.code).toBe(2);
    expect(result.err).toContain("HALT");
    expect(eventRecords(root).map((entry) => entry.event.result)).toEqual(["policy-denied"]);
    expect(readEvidence(root).filter((entry) => entry.kind === "record")).toEqual([]);
    expect(taskStatus(root)).toBe("halted");
    expect(activeTaskId(root)).toBeNull();
  });

  it("maps every approved protected operation to REQUIRE_APPROVAL", () => {
    for (const operation of M1_PROTECTED_OPERATIONS) {
      expect(decidePolicy(DEFAULT_M1_POLICY, operation)).toBe("REQUIRE_APPROVAL");
    }
  });

  it("halts REQUIRE_APPROVAL before execution with zero retry and no evidence", () => {
    const root = setup();
    setPolicy(root, ["repo.test"], ["repo.test"]);

    const result = cli(["run", DEFAULT_FIXTURE.taskId], root);

    expect(result.code).toBe(2);
    expect(result.err).toContain("approval required");
    expect(eventRecords(root).map((entry) => entry.event.result)).toEqual([
      "approval-required",
    ]);
    expect(readEvidence(root).filter((entry) => entry.kind === "record")).toEqual([]);
    expect(taskStatus(root)).toBe("halted");
    expect(activeTaskId(root)).toBeNull();
  });
});

describe("T9 AC-4 verification uncertainty", () => {
  it("halts accepted state on mixed valid plus corrupt evidence without repairing bytes", () => {
    const root = setup();
    accepted(root);
    appendValidEvidence(root);
    const evidencePath = join(root, ".sureflow/evidence/evidence.jsonl");
    const before = readFileSync(evidencePath, "utf8");
    writeFileSync(evidencePath, before + "{corrupt\n", "utf8");

    const result = cli(["verify", DEFAULT_FIXTURE.taskId], root);

    expect(result.code).toBe(2);
    expect(result.err).toContain("UNKNOWN");
    expect(taskStatus(root)).toBe("halted");
    expect(readFileSync(evidencePath, "utf8")).toBe(before + "{corrupt\n");
    expect(activeTaskId(root)).toBeNull();
  });

  it("halts accepted state on schema-invalid evidence without deleting or rewriting it", () => {
    const root = setup();
    accepted(root);
    const evidencePath = join(root, ".sureflow/evidence/evidence.jsonl");
    const invalid = JSON.stringify({ schemaVersion: 999, result: "ok" }) + "\n";
    writeFileSync(evidencePath, invalid, "utf8");

    const result = cli(["verify", DEFAULT_FIXTURE.taskId], root);

    expect(result.code).toBe(2);
    expect(result.err).toContain("UNKNOWN");
    expect(taskStatus(root)).toBe("halted");
    expect(readFileSync(evidencePath, "utf8")).toBe(invalid);
  });

  it("treats an unreadable evidence representation as UNKNOWN and preserves it", () => {
    const root = setup();
    accepted(root);
    const evidencePath = join(root, ".sureflow/evidence/evidence.jsonl");
    mkdirSync(evidencePath);
    const result = cli(["verify", DEFAULT_FIXTURE.taskId], root);

    expect(result.code).toBe(2);
    expect(result.err).toContain("UNKNOWN");
    expect(taskStatus(root)).toBe("halted");
    expect(existsSync(evidencePath)).toBe(true);
  });

  it("keeps status and verification independent from PromptKit documents", () => {
    const root = setup();
    accepted(root);
    appendValidEvidence(root);
    mkdirSync(join(root, "docs"), { recursive: true });
    writeFileSync(
      join(root, "docs/STATE.md"),
      "- **Overall Status**: HALTED\n",
      "utf8",
    );
    writeFileSync(
      join(root, "docs/tasks-record.md"),
      "- **Status**: NOT STARTED\n",
      "utf8",
    );

    const before = snapshot(root);
    const verifyResult = cli(["verify", DEFAULT_FIXTURE.taskId], root);
    const statusResult = cli(["status"], root);

    expect(verifyResult.code).toBe(0);
    expect(statusResult.code).toBe(0);
    expect(statusResult.out).toContain("TASK-T0-BASIC: accepted");
    expect(statusResult.out).not.toContain("HALTED");
    expect(taskStatus(root)).toBe("accepted");
    expect(snapshot(root)).toBe(before);
    expect(readRuntimeState(root).kind).toBe("ok");
  });
});

describe("T9 AC-5/AC-6 and path/state safety", () => {
  it("rejects absolute, traversal, normalized, and symlink escapes before execution", () => {
    const cases: Array<{ readonly target: string; readonly setup?: (root: string) => void }> = [
      { target: "/tmp/outside.txt" },
      { target: "../outside.txt" },
      { target: "outside.txt" },
      {
        target: "fixtures/t0-basic/link.txt",
        setup: (root) => {
          const outside = join(root, "outside.txt");
          writeFileSync(outside, "outside", "utf8");
          symlinkSync(outside, join(root, "fixtures/t0-basic/link.txt"));
        },
      },
    ];

    for (const testCase of cases) {
      const root = setup({ ...DEFAULT_FIXTURE, target: testCase.target });
      testCase.setup?.(root);
      const process = queued([]);

      const outcome = runT0Task(
        { rootDir: root, requestedTaskId: DEFAULT_FIXTURE.taskId },
        { executeNpmTest: process.execute },
      );

      expect(outcome.kind).toBe("halted");
      expect(outcome.attempts).toBe(0);
      expect(process.calls).toHaveLength(0);
      expect(taskStatus(root)).toBe("halted");
      expect(activeTaskId(root)).toBeNull();
      expect(readEvidence(root).filter((entry) => entry.kind === "record")).toEqual([]);
    }
  });

  it("preserves the retry bound and terminal evidence cardinality after two failures", () => {
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
    expect(process.calls).toHaveLength(2);
    expect(readExecutionEvents(root)).toHaveLength(1);
    expect(readEvidence(root)).toHaveLength(1);
    expect(taskStatus(root)).toBe("halted");
    expect(activeTaskId(root)).toBeNull();
  });

  it.each([
    [{ kind: "spawn-error" } as const, "spawn-error"],
    [{ kind: "signaled", signal: "SIGTERM" } as const, "test-terminated"],
  ])("does not retry %j and leaves one terminal record", (processOutcome, expectedResult) => {
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
    expect(readEvidence(root)).toHaveLength(1);
    expect(terminalResult(root)).toBe(expectedResult);
    expect(taskStatus(root)).toBe("halted");
    expect(activeTaskId(root)).toBeNull();
  });
});
