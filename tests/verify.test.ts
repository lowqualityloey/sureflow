import {
  existsSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { type CliIo, runCli } from "../src/cli.js";
import { appendEvidence } from "../src/evidenceStore.js";
import { beginTask, transitionTask } from "../src/taskStateStore.js";
import { initRuntimeState } from "../src/stateWriter.js";

const FIXTURE = {
  taskId: "TASK-T0-BASIC",
  capability: "repo.test" as const,
  target: "fixtures/t0-basic/output.txt",
  expectedResult: "ok",
  testProfile: "npm-test" as const,
};

const temps: string[] = [];

interface Captured {
  readonly code: number;
  readonly out: string;
  readonly err: string;
}

function tempRoot(): string {
  const root = mkdtempSync(join(tmpdir(), "sureflow-t7-"));
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

function setup(): string {
  const root = tempRoot();
  const fixtureDir = join(root, "fixtures/t0-basic");
  mkdirSync(fixtureDir, { recursive: true });
  writeFileSync(
    join(fixtureDir, "task.json"),
    JSON.stringify(FIXTURE, null, 2) + "\n",
    "utf8",
  );
  initRuntimeState({
    rootDir: root,
    projectName: "t7-test",
    nowIso: "2026-09-21T00:00:00.000Z",
    force: false,
  });
  beginTask(root, FIXTURE.taskId, "2026-09-21T00:00:01.000Z");
  transitionTask(root, FIXTURE.taskId, "accepted", "2026-09-21T00:00:02.000Z");
  return root;
}

function appendResult(root: string, result: string): void {
  appendEvidence(root, {
    actor: "worker:t0",
    recordedAt: "2026-09-21T00:00:03.000Z",
    taskId: FIXTURE.taskId,
    capability: FIXTURE.capability,
    policyDecision: "ALLOW",
    target: FIXTURE.target,
    result,
    provenance: "npm test; shell=false",
  });
}

function taskStatus(root: string): string {
  const raw: unknown = JSON.parse(
    readFileSync(join(root, ".sureflow/state/tasks/TASK-T0-BASIC.json"), "utf8"),
  );
  return (raw as { status: string }).status;
}

function snapshot(root: string): string {
  const files: string[] = [];
  const walk = (dir: string, prefix = ""): void => {
    for (const entry of readdirSync(dir, { withFileTypes: true }).sort((a, b) =>
      a.name.localeCompare(b.name),
    )) {
      const path = join(dir, entry.name);
      const relative = prefix + entry.name;
      if (entry.isDirectory()) {
        files.push(relative + "/");
        walk(path, relative + "/");
      } else {
        files.push(relative + ":" + readFileSync(path, "utf8"));
      }
    }
  };
  walk(root);
  return files.join("\n");
}

afterEach(() => {
  for (const root of temps.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe("T7 verify CLI", () => {
  it("returns PASS for matching terminal evidence and leaves accepted state/evidence unchanged", () => {
    const root = setup();
    appendResult(root, "ok");
    const before = snapshot(root);
    const result = cli(["verify", FIXTURE.taskId], root);
    expect(result.code).toBe(0);
    expect(result.out).toContain("PASS");
    expect(result.out).toContain(FIXTURE.taskId);
    expect(taskStatus(root)).toBe("accepted");
    expect(snapshot(root)).toBe(before);
  });

  it("returns UNKNOWN and halts stale accepted state when evidence is deleted", () => {
    const root = setup();
    appendResult(root, "ok");
    unlinkSync(join(root, ".sureflow/evidence/evidence.jsonl"));
    const result = cli(["verify", FIXTURE.taskId], root);
    expect(result.code).toBe(2);
    expect(result.err).toContain("UNKNOWN");
    expect(taskStatus(root)).toBe("halted");
    expect(existsSync(join(root, ".sureflow/evidence/evidence.jsonl"))).toBe(false);
  });

  it("returns UNKNOWN and halts stale accepted state for corrupt evidence", () => {
    const root = setup();
    writeFileSync(join(root, ".sureflow/evidence/evidence.jsonl"), "{corrupt\n", "utf8");
    const beforeEvidence = readFileSync(join(root, ".sureflow/evidence/evidence.jsonl"), "utf8");
    const result = cli(["verify", FIXTURE.taskId], root);
    expect(result.code).toBe(2);
    expect(result.err).toContain("UNKNOWN");
    expect(taskStatus(root)).toBe("halted");
    expect(readFileSync(join(root, ".sureflow/evidence/evidence.jsonl"), "utf8")).toBe(beforeEvidence);
  });

  it("returns FAIL and halts stale accepted state for mismatching evidence", () => {
    const root = setup();
    appendResult(root, "test-failed");
    const result = cli(["verify", FIXTURE.taskId], root);
    expect(result.code).toBe(2);
    expect(result.err).toContain("FAIL");
    expect(taskStatus(root)).toBe("halted");
  });

  it("returns UNKNOWN and halts stale accepted state for duplicate applicable evidence", () => {
    const root = setup();
    appendResult(root, "ok");
    appendResult(root, "ok");
    const result = cli(["verify", FIXTURE.taskId], root);
    expect(result.code).toBe(2);
    expect(result.err).toContain("UNKNOWN");
    expect(taskStatus(root)).toBe("halted");
  });

  it("rejects a mismatched task identity without changing runtime state", () => {
    const root = setup();
    appendResult(root, "ok");
    const before = snapshot(root);
    const result = cli(["verify", "TASK-OTHER"], root);
    expect(result.code).toBe(2);
    expect(result.err).toContain("does not match");
    expect(snapshot(root)).toBe(before);
  });
});
