import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { runCli, type CliIo } from "../src/cli.js";
import {
  acquireMutationLock,
  executionLockPath,
  MutationLockBusyError,
  MutationLockReleaseError,
  releaseMutationLock,
} from "../src/mutationLock.js";
import { appendEvidence } from "../src/evidenceStore.js";
import { runT0Task } from "../src/runTask.js";
import { beginTask, transitionTask } from "../src/taskStateStore.js";
import { initRuntimeState } from "../src/stateWriter.js";
import { verifyT0Task } from "../src/verifyTask.js";

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
  const root = mkdtempSync(join(tmpdir(), "sureflow-h5-"));
  temps.push(root);
  return root;
}

afterEach(() => {
  for (const root of temps.splice(0)) rmSync(root, { recursive: true, force: true });
});

function cli(argv: readonly string[], cwd: string): Captured {
  const out: string[] = [];
  const err: string[] = [];
  const io: CliIo = {
    out: (line) => out.push(line),
    err: (line) => err.push(line),
  };
  return { code: runCli(argv, cwd, io), out: out.join("\n"), err: err.join("\n") };
}

function snapshot(root: string): string {
  const entries: string[] = [];
  const walk = (dir: string, prefix = ""): void => {
    for (const entry of readdirSync(dir, { withFileTypes: true }).sort((a, b) =>
      a.name.localeCompare(b.name),
    )) {
      const child = join(dir, entry.name);
      const relative = `${prefix}${entry.name}`;
      if (entry.isDirectory()) {
        entries.push(`${relative}/`);
        walk(child, `${relative}/`);
      } else {
        entries.push(`${relative}:${readFileSync(child, "utf8")}`);
      }
    }
  };
  walk(root);
  return entries.join("\n");
}

function setupRun(): string {
  const root = tempRoot();
  const fixtureDir = join(root, "fixtures/t0-basic");
  mkdirSync(fixtureDir, { recursive: true });
  writeFileSync(join(fixtureDir, "task.json"), `${JSON.stringify(FIXTURE)}\n`, "utf8");
  initRuntimeState({
    rootDir: root,
    projectName: "h5-test",
    nowIso: "2026-09-21T00:00:00.000Z",
    force: false,
  });
  return root;
}

function setupVerify(): string {
  const root = setupRun();
  beginTask(root, FIXTURE.taskId, "2026-09-21T00:00:01.000Z");
  transitionTask(root, FIXTURE.taskId, "accepted", "2026-09-21T00:00:02.000Z");
  appendEvidence(root, {
    actor: "worker:t0",
    recordedAt: "2026-09-21T00:00:03.000Z",
    taskId: FIXTURE.taskId,
    capability: FIXTURE.capability,
    policyDecision: "ALLOW",
    target: FIXTURE.target,
    result: "wrong",
    provenance: "npm test; shell=false",
  });
  return root;
}

function taskStatus(root: string): string {
  const raw: unknown = JSON.parse(
    readFileSync(join(root, ".sureflow/state/tasks/TASK-T0-BASIC.json"), "utf8"),
  );
  return (raw as { status: string }).status;
}

describe("H5 mutation lock", () => {
  it("acquires exclusively with the required metadata and blocks a second owner", () => {
    const root = setupRun();
    const first = acquireMutationLock(root, "run");
    try {
      const persisted: unknown = JSON.parse(readFileSync(first.path, "utf8"));
      expect(persisted).toMatchObject({
        ownerToken: first.ownerToken,
        operation: "run",
        pid: process.pid,
        hostname: first.metadata.hostname,
      });
      expect((persisted as { acquiredAt: unknown }).acquiredAt).toEqual(first.metadata.acquiredAt);
      expect(() => acquireMutationLock(root, "verify")).toThrow(MutationLockBusyError);
    } finally {
      releaseMutationLock(first);
    }
  });

  it("releases only its own owner token", () => {
    const root = setupRun();
    const lock = acquireMutationLock(root, "run");
    releaseMutationLock(lock);
    expect(existsSync(executionLockPath(root))).toBe(false);
  });

  it("leaves the replacement owner lock during an A-delete-replace-B race", () => {
    const root = setupRun();
    const ownerA = acquireMutationLock(root, "run");
    unlinkSync(ownerA.path);
    const ownerB = acquireMutationLock(root, "verify");
    try {
      expect(() => {
        releaseMutationLock(ownerA);
      }).toThrow(MutationLockReleaseError);
      expect(JSON.parse(readFileSync(ownerB.path, "utf8"))).toMatchObject({
        ownerToken: ownerB.ownerToken,
        operation: "verify",
      });
    } finally {
      releaseMutationLock(ownerB);
    }
  });

  it("blocks malformed and stale locks without attempting recovery", () => {
    const root = setupRun();
    const path = executionLockPath(root);
    writeFileSync(path, "{malformed\n", "utf8");
    expect(() => acquireMutationLock(root, "run")).toThrow(MutationLockBusyError);
    expect(readFileSync(path, "utf8")).toBe("{malformed\n");

    writeFileSync(
      path,
      `${JSON.stringify({
        ownerToken: "human-owner",
        operation: "run",
        pid: 1,
        hostname: "old-host",
        acquiredAt: "2000-01-01T00:00:00.000Z",
      })}\n`,
      "utf8",
    );
    expect(() => acquireMutationLock(root, "verify")).toThrow(MutationLockBusyError);
    expect(readFileSync(path, "utf8")).toContain("human-owner");
  });

  it("blocks init before authoritative mutation when a lock already exists", () => {
    const root = tempRoot();
    mkdirSync(join(root, ".sureflow/state"), { recursive: true });
    const lock = acquireMutationLock(root, "run");
    try {
      const before = snapshot(root);
      const outcome = initRuntimeState({
        rootDir: root,
        projectName: "h5-blocked-init",
        nowIso: "2026-09-21T00:00:00.000Z",
        force: false,
      });
      expect(outcome).toEqual({
        kind: "blocked",
        reason: "mutation already in progress; execution.lock is held",
      });
      expect(snapshot(root)).toBe(before);
    } finally {
      releaseMutationLock(lock);
    }
  });

  it("bootstraps only the lock ancestry before first-init authoritative writes", () => {
    const root = tempRoot();
    let beforeWrites = "";
    const outcome = initRuntimeState({
      rootDir: root,
      projectName: "h5-bootstrap",
      nowIso: "2026-09-21T00:00:00.000Z",
      force: false,
      onLockAcquired: () => {
        beforeWrites = snapshot(root);
        expect(readdirSync(join(root, ".sureflow"))).toEqual(["state"]);
        expect(readdirSync(join(root, ".sureflow/state"))).toEqual(["execution.lock"]);
      },
    });
    expect(outcome.kind).toBe("initialized");
    expect(beforeWrites).toContain(".sureflow/state/execution.lock:");
    expect(existsSync(join(root, ".sureflow/state/project.json"))).toBe(true);
    expect(existsSync(executionLockPath(root))).toBe(false);
  });

  it("blocks run without worker, task, evidence, or event mutation", () => {
    const root = setupRun();
    const lock = acquireMutationLock(root, "verify");
    try {
      const before = snapshot(root);
      let calls = 0;
      const outcome = runT0Task(
        { rootDir: root, requestedTaskId: FIXTURE.taskId },
        {
          executeNpmTest: () => {
            calls += 1;
            return { kind: "exited", exitCode: 0 };
          },
        },
      );
      expect(outcome.kind).toBe("halted");
      expect(outcome.reason).toContain("execution.lock");
      expect(calls).toBe(0);
      expect(snapshot(root)).toBe(before);
    } finally {
      releaseMutationLock(lock);
    }
  });

  it("blocks verify before stale accepted-state reconciliation", () => {
    const root = setupVerify();
    const lock = acquireMutationLock(root, "run");
    try {
      const outcome = verifyT0Task({ rootDir: root, requestedTaskId: FIXTURE.taskId });
      expect(outcome.kind).toBe("halted");
      expect(outcome.reason).toContain("execution.lock");
      expect(taskStatus(root)).toBe("accepted");
    } finally {
      releaseMutationLock(lock);
    }
  });

  it("holds the lock through the active worker seam and releases it afterward", () => {
    const root = setupRun();
    let sawLock = false;
    const outcome = runT0Task(
      { rootDir: root, requestedTaskId: FIXTURE.taskId },
      {
        executeNpmTest: () => {
          sawLock = existsSync(executionLockPath(root));
          return { kind: "exited", exitCode: 0 };
        },
      },
    );
    expect(outcome.kind).toBe("accepted");
    expect(sawLock).toBe(true);
    expect(existsSync(executionLockPath(root))).toBe(false);
  });

  it("reports a locked project without reading authoritative state", () => {
    const root = setupRun();
    const lock = acquireMutationLock(root, "run");
    try {
      writeFileSync(join(root, ".sureflow/state/active.json"), "{partial\n", "utf8");
      const result = cli(["status"], root);
      expect(result.code).toBe(2);
      expect(result.out).toContain("mutation in progress; stable snapshot unavailable");
      expect(result.out).toContain("authoritative state was not read");
      expect(result.out).not.toContain("runtime state present but not interpretable");
    } finally {
      releaseMutationLock(lock);
    }
  });

  it("keeps status read-only and stable when no lock is present", () => {
    const root = setupRun();
    const result = cli(["status"], root);
    expect(result.code).toBe(0);
    expect(result.out).toContain("Sureflow status (read-only)");
    expect(result.out).toContain("state contract valid");
  });
});
