import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { APPROVED_COMMANDS, type CliIo, runCli } from "../src/cli.js";
import { appendEvidence, readEvidence } from "../src/evidenceStore.js";
import { readExecutionEvents } from "../src/eventStore.js";
import { readRuntimeState } from "../src/stateReader.js";
import { beginTask, transitionTask } from "../src/taskStateStore.js";
import { initRuntimeState } from "../src/stateWriter.js";

const TASK_ID = "TASK-T0-BASIC";
const FIXTURE = {
  taskId: TASK_ID,
  capability: "repo.test" as const,
  target: "fixtures/t0-basic/output.txt",
  expectedResult: "ok",
  testProfile: "npm-test" as const,
};

const FIXTURE_PACKAGE = JSON.stringify({
  name: "sureflow-t10-fixture",
  private: true,
  scripts: { test: "node --test fixture.test.mjs" },
}, null, 2) + "\n";

const FIXTURE_TEST = [
  'import assert from "node:assert/strict";',
  'import { realpathSync } from "node:fs";',
  'import test from "node:test";',
  'import { fileURLToPath } from "node:url";',
  "",
  'test("runs in the bounded fixture root", () => {',
  '  assert.equal(realpathSync(process.cwd()), realpathSync(fileURLToPath(new URL(".", import.meta.url))));',
  "});",
  "",
].join("\n");

const temps: string[] = [];

interface Captured {
  readonly code: number;
  readonly out: string;
  readonly err: string;
}

function tempRoot(): string {
  const root = mkdtempSync(join(tmpdir(), "sureflow-t10-"));
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

function setupFixtureRoot(): string {
  const root = tempRoot();
  const fixtureRoot = join(root, "fixtures/t0-basic");
  mkdirSync(fixtureRoot, { recursive: true });
  writeFileSync(join(fixtureRoot, "task.json"), JSON.stringify(FIXTURE, null, 2) + "\n", "utf8");
  writeFileSync(join(fixtureRoot, "package.json"), FIXTURE_PACKAGE, "utf8");
  writeFileSync(join(fixtureRoot, "fixture.test.mjs"), FIXTURE_TEST, "utf8");
  initRuntimeState({
    rootDir: root,
    projectName: "t10-determinism",
    nowIso: "2026-09-21T00:00:00.000Z",
    force: false,
  });
  return root;
}

function setupAcceptedRoot(): string {
  const root = setupFixtureRoot();
  beginTask(root, TASK_ID, "2026-09-21T00:00:01.000Z");
  transitionTask(root, TASK_ID, "accepted", "2026-09-21T00:00:02.000Z");
  appendEvidence(root, {
    actor: "worker:t0",
    recordedAt: "2026-09-21T00:00:03.000Z",
    taskId: TASK_ID,
    capability: FIXTURE.capability,
    policyDecision: "ALLOW",
    target: FIXTURE.target,
    result: "ok",
    provenance: "npm test; shell=false",
  });
  return root;
}

function runtimeSemantics(root: string): {
  readonly policyDecision: string;
  readonly attempts: number;
  readonly retry: boolean;
  readonly terminalResult: string;
  readonly state: string;
  readonly verifyCode: number;
  readonly verifyVerdict: string;
  readonly statusCode: number;
} {
  const runtime = readRuntimeState(root);
  const evidence = readEvidence(root).filter((entry) => entry.kind === "record");
  const events = readExecutionEvents(root)
    .filter((entry) => entry.kind === "record")
    .map((entry) => entry.event);
  const verification = cli(["verify", TASK_ID], root);
  const status = cli(["status"], root);
  const task = runtime.kind === "ok" ? runtime.tasks.find((item) => item.taskId === TASK_ID) : undefined;
  const record = evidence[0];
  if (runtime.kind !== "ok" || task === undefined || record?.kind !== "record") {
    throw new Error("test fixture did not produce complete runtime semantics");
  }
  return {
    policyDecision: record.record.policyDecision,
    attempts: events.some((event) => event.result === "test-failed") ? 2 : 1,
    retry: events.some((event) => event.result === "test-failed"),
    terminalResult: record.record.result,
    state: task.status,
    verifyCode: verification.code,
    verifyVerdict: verification.out,
    statusCode: status.code,
  };
}

afterEach(() => {
  for (const root of temps.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe("T10 public M1 surface", () => {
  it("exposes exactly init, run, status, and verify plus normal help", () => {
    expect(APPROVED_COMMANDS).toEqual(["init", "run", "status", "verify"]);
    for (const flag of ["--help", "-h", ""]) {
      const args = flag === "" ? [] : [flag];
      const result = cli(args, tempRoot());
      expect(result.code).toBe(0);
      expect(result.out).toContain("approved commands: init, run, status, verify");
    }
    const unknown = cli(["help"], tempRoot());
    expect(unknown.code).toBe(2);
    expect(unknown.err).toContain("unknown command");
  });
});

describe("T10 semantic determinism", () => {
  it("produces identical semantic outcomes in equivalent clean isolated roots", () => {
    const firstRoot = setupFixtureRoot();
    const secondRoot = setupFixtureRoot();

    const firstRun = cli(["run", TASK_ID], firstRoot);
    const secondRun = cli(["run", TASK_ID], secondRoot);

    expect(firstRun.code).toBe(0);
    expect(secondRun.code).toBe(0);
    expect(runtimeSemantics(firstRoot)).toEqual(runtimeSemantics(secondRoot));
    const semantics = runtimeSemantics(firstRoot);
    expect(semantics).toMatchObject({
      policyDecision: "ALLOW",
      attempts: 1,
      retry: false,
      terminalResult: "ok",
      state: "accepted",
      verifyCode: 0,
      statusCode: 0,
    });
    expect(semantics.verifyVerdict).toContain("PASS");
  });
});

describe("T10 stability and immutability", () => {
  it("keeps repeated status and PASS verification semantically and byte stable", () => {
    const root = setupAcceptedRoot();
    const evidencePath = join(root, ".sureflow/evidence/evidence.jsonl");
    const taskPath = join(root, ".sureflow/state/tasks", TASK_ID + ".json");
    const activePath = join(root, ".sureflow/state/active.json");
    const beforeEvidence = readFileSync(evidencePath, "utf8");
    const beforeTask = readFileSync(taskPath, "utf8");
    const beforeActive = readFileSync(activePath, "utf8");

    const firstStatus = cli(["status"], root);
    const secondStatus = cli(["status"], root);
    const firstVerify = cli(["verify", TASK_ID], root);
    const secondVerify = cli(["verify", TASK_ID], root);

    expect(firstStatus.code).toBe(0);
    expect(secondStatus.code).toBe(0);
    expect(firstStatus.out).toBe(secondStatus.out);
    expect(firstVerify.code).toBe(0);
    expect(secondVerify.code).toBe(0);
    expect(firstVerify.out).toContain("PASS");
    expect(secondVerify.out).toBe(firstVerify.out);
    expect(readFileSync(evidencePath, "utf8")).toBe(beforeEvidence);
    expect(readFileSync(taskPath, "utf8")).toBe(beforeTask);
    expect(readFileSync(activePath, "utf8")).toBe(beforeActive);
  });

  it("does not apply latest-wins semantics to duplicate terminal evidence", () => {
    const root = setupAcceptedRoot();
    appendEvidence(root, {
      actor: "worker:t0",
      recordedAt: "2099-01-01T00:00:00.000Z",
      taskId: TASK_ID,
      capability: FIXTURE.capability,
      policyDecision: "ALLOW",
      target: FIXTURE.target,
      result: "test-failed",
      provenance: "npm test; shell=false",
    });
    const result = cli(["verify", TASK_ID], root);
    expect(result.code).toBe(2);
    expect(result.err).toContain("UNKNOWN");
    const runtime = readRuntimeState(root);
    expect(runtime.kind).toBe("ok");
    if (runtime.kind === "ok") {
      expect(runtime.tasks.some((task) => task.taskId === TASK_ID && task.status === "halted")).toBe(true);
    }
  });
});
