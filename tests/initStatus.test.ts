import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { atomicReplaceTextFile } from "../src/atomicStateWrite.js";
import { type CliIo, runCli } from "../src/cli.js";
import { readRuntimeState } from "../src/stateReader.js";
import { isActiveState, isProjectState, type TaskStatus } from "../src/state.js";

interface Captured {
  readonly code: number;
  readonly out: string;
  readonly err: string;
}

const temps: string[] = [];

function tempRoot(): string {
  const dir = mkdtempSync(join(tmpdir(), "sureflow-t5-"));
  temps.push(dir);
  return dir;
}

afterEach(() => {
  for (const dir of temps.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

function cli(argv: readonly string[], cwd: string): Captured {
  const outLines: string[] = [];
  const errLines: string[] = [];
  const io: CliIo = {
    out: (line) => outLines.push(line),
    err: (line) => errLines.push(line),
  };
  const code = runCli(argv, cwd, io);
  return { code, out: outLines.join("\n"), err: errLines.join("\n") };
}

/** Snapshot every file under the root, so mutations are detectable. */
function snapshot(root: string): string {
  const entries: string[] = [];
  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir, { withFileTypes: true }).sort((a, b) =>
      a.name.localeCompare(b.name),
    )) {
      const child = join(dir, entry.name);
      if (entry.isDirectory()) {
        entries.push(`${entry.name}/`);
        walk(child);
      } else {
        entries.push(`${entry.name}:${readFileSync(child, "utf8")}`);
      }
    }
  };
  walk(root);
  return entries.join("\n");
}

function writeTaskState(root: string, taskId: string, status: TaskStatus): void {
  writeFileSync(
    join(root, ".sureflow/state/tasks", `${taskId}.json`),
    `${JSON.stringify({
      schemaVersion: 1,
      taskId,
      status,
      createdAt: "2026-09-21T00:00:00.000Z",
      updatedAt: "2026-09-21T00:00:00.000Z",
    }, null, 2)}\n`,
    "utf8",
  );
}

function writeActiveState(root: string, activeTaskId: string | null): void {
  writeFileSync(
    join(root, ".sureflow/state/active.json"),
    `${JSON.stringify({
      schemaVersion: 1,
      activeTaskId,
      updatedAt: "2026-09-21T00:00:00.000Z",
    }, null, 2)}\n`,
    "utf8",
  );
}

describe("H4 atomic state writes", () => {
  it("replaces a final file with complete valid JSON and leaves no temporary", () => {
    const root = tempRoot();
    const target = join(root, "state.json");
    writeFileSync(target, '{"schemaVersion":1}\n', "utf8");

    atomicReplaceTextFile(target, `${JSON.stringify({ schemaVersion: 1, activeTaskId: null })}\n`);

    expect(JSON.parse(readFileSync(target, "utf8"))).toEqual({
      schemaVersion: 1,
      activeTaskId: null,
    });
    expect(readdirSync(root).filter((name) => name.includes(".state.json.tmp-"))).toEqual([]);
  });
});

describe("H4 authoritative state consistency", () => {
  it("rejects an active pointer to a missing task", () => {
    const root = tempRoot();
    cli(["init"], root);
    writeActiveState(root, "TASK-MISSING");

    const result = readRuntimeState(root);
    expect(result.kind).toBe("invalid");
    expect(result.kind === "invalid" && result.problems.join(" ")).toContain("missing task");
  });

  it.each(["accepted", "halted"] as const)(
    "rejects an active pointer to a %s task",
    (status) => {
      const root = tempRoot();
      cli(["init"], root);
      writeTaskState(root, "TASK-TERMINAL", status);
      writeActiveState(root, "TASK-TERMINAL");

      const result = readRuntimeState(root);
      expect(result.kind).toBe("invalid");
      expect(result.kind === "invalid" && result.problems.join(" ")).toContain("non-active task");
    },
  );

  it.each(["pending", "running"] as const)(
    "rejects activeTaskId null with a %s task",
    (status) => {
      const root = tempRoot();
      cli(["init"], root);
      writeTaskState(root, "TASK-NONTERMINAL", status);

      const result = readRuntimeState(root);
      expect(result.kind).toBe("invalid");
      expect(result.kind === "invalid" && result.problems.join(" ")).toContain("must identify");
    },
  );

  it("rejects more than one pending or running task", () => {
    const root = tempRoot();
    cli(["init"], root);
    writeTaskState(root, "TASK-A", "pending");
    writeTaskState(root, "TASK-B", "running");
    writeActiveState(root, "TASK-A");

    const result = readRuntimeState(root);
    expect(result.kind).toBe("invalid");
    expect(result.kind === "invalid" && result.problems.join(" ")).toContain("more than one");
  });

  it.each(["pending", "running"] as const)(
    "accepts a matching active pointer to a %s task",
    (status) => {
      const root = tempRoot();
      cli(["init"], root);
      writeTaskState(root, "TASK-ACTIVE", status);
      writeActiveState(root, "TASK-ACTIVE");

      expect(readRuntimeState(root).kind).toBe("ok");
    },
  );

  it("accepts terminal task history with no active task", () => {
    const root = tempRoot();
    cli(["init"], root);
    writeTaskState(root, "TASK-ACCEPTED", "accepted");
    writeTaskState(root, "TASK-HALTED", "halted");

    expect(readRuntimeState(root).kind).toBe("ok");
  });

  it("does not repair malformed active state", () => {
    const root = tempRoot();
    cli(["init"], root);
    writeFileSync(join(root, ".sureflow/state/active.json"), "{partial\n", "utf8");
    const before = snapshot(root);

    const result = cli(["status"], root);
    expect(result.code).toBe(2);
    expect(snapshot(root)).toBe(before);
  });

  it("refuses --force before detaching a non-terminal task", () => {
    const root = tempRoot();
    cli(["init"], root);
    writeTaskState(root, "TASK-PENDING", "pending");
    writeActiveState(root, "TASK-PENDING");
    const before = snapshot(root);

    const result = cli(["init", "--force"], root);
    expect(result.code).toBe(2);
    expect(result.err).toContain("refused");
    expect(snapshot(root)).toBe(before);
  });
});

describe("T5 init", () => {
  it("creates the minimum approved runtime layout and valid state", () => {
    const root = tempRoot();
    const result = cli(["init"], root);
    expect(result.code).toBe(0);
    expect(result.out).toContain("Verified: state schemaVersion 1 validates");

    const projectRaw: unknown = JSON.parse(
      readFileSync(join(root, ".sureflow/state/project.json"), "utf8"),
    );
    const activeRaw: unknown = JSON.parse(
      readFileSync(join(root, ".sureflow/state/active.json"), "utf8"),
    );
    expect(isProjectState(projectRaw)).toBe(true);
    expect(isActiveState(activeRaw)).toBe(true);
    expect(readRuntimeState(root).kind).toBe("ok");

    // No task records, evidence, events, or fixtures.
    expect(readdirSync(join(root, ".sureflow/state/tasks"))).toEqual([]);
    expect(readdirSync(join(root, ".sureflow/evidence"))).toEqual([]);
    expect(readdirSync(join(root, ".sureflow/events"))).toEqual([]);
    expect(readdirSync(join(root, ".sureflow/policy"))).toEqual(["default.json"]);
  });

  it("refuses to overwrite existing state without --force and does not mutate it", () => {
    const root = tempRoot();
    expect(cli(["init"], root).code).toBe(0);
    const before = snapshot(root);

    const second = cli(["init"], root);
    expect(second.code).toBe(2);
    expect(second.err).toContain("refused");
    expect(snapshot(root)).toBe(before);

    expect(cli(["init", "--force"], root).code).toBe(0);
  });
});

describe("T5 status", () => {
  it("reports not-initialized without creating state", () => {
    const root = tempRoot();
    const result = cli(["status"], root);
    expect(result.code).toBe(2);
    expect(result.out).toContain("run `sureflow init`");
    expect(readRuntimeState(root).kind).toBe("not-initialized");
    expect(snapshot(root)).toBe("");
  });

  it("is read-only: repeated calls leave runtime bytes unchanged", () => {
    const root = tempRoot();
    cli(["init"], root);
    const before = snapshot(root);
    const first = cli(["status"], root);
    const second = cli(["status"], root);
    expect(first.code).toBe(0);
    expect(second.code).toBe(0);
    expect(first.out).toBe(second.out);
    expect(snapshot(root)).toBe(before);
  });

  it("surfaces persisted accepted tasks while activeTaskId remains null without manufacturing a verdict", () => {
    const root = tempRoot();
    cli(["init"], root);
    writeTaskState(root, "TASK-T0-BASIC", "accepted");
    writeFileSync(join(root, ".sureflow/evidence/evidence.jsonl"), "{corrupt evidence\n", "utf8");
    const before = snapshot(root);

    const first = cli(["status"], root);
    const second = cli(["status"], root);

    expect(first.code).toBe(0);
    expect(first.out).toContain("TASK-T0-BASIC: accepted");
    expect(first.out).toContain("active task: none");
    expect(first.out).toContain("verification verdicts: none recorded");
    expect(first.out).toBe(second.out);
    expect(snapshot(root)).toBe(before);
  });

  it("displays multiple persisted tasks by lexicographic taskId", () => {
    const root = tempRoot();
    cli(["init"], root);
    writeTaskState(root, "TASK-Z", "halted");
    writeTaskState(root, "TASK-A", "accepted");

    const output = cli(["status"], root).out;
    expect(output.indexOf("TASK-A: accepted")).toBeLessThan(output.indexOf("TASK-Z: halted"));
  });
});
describe("T5 malformed state and AC-6", () => {
  it("does not silently repair malformed or unsupported runtime state", () => {
    const root = tempRoot();
    cli(["init"], root);
    writeFileSync(join(root, ".sureflow/state/project.json"), "{ not json\n", "utf8");
    const broken = snapshot(root);
    const result = cli(["status"], root);
    expect(result.code).toBe(2);
    expect(result.out).toContain("no automatic repair exists");
    expect(snapshot(root)).toBe(broken);

    writeFileSync(
      join(root, ".sureflow/state/project.json"),
      `${JSON.stringify({ schemaVersion: 999 }, null, 2)}\n`,
      "utf8",
    );
    const unsupported = snapshot(root);
    const second = cli(["status"], root);
    expect(second.code).toBe(2);
    expect(second.out).toContain("ProjectState contract");
    expect(snapshot(root)).toBe(unsupported);
  });

  it("surfaces malformed task state without repairing it", () => {
    const root = tempRoot();
    cli(["init"], root);
    const taskPath = join(root, ".sureflow/state/tasks/BROKEN.json");
    writeFileSync(taskPath, "{ not json\n", "utf8");
    const before = snapshot(root);

    const result = cli(["status"], root);
    expect(result.code).toBe(2);
    expect(result.out).toContain("tasks/BROKEN.json");
    expect(snapshot(root)).toBe(before);
  });

  it("derives status only from .sureflow/state/ (AC-6)", () => {
    const root = tempRoot();
    cli(["init"], root);
    writeTaskState(root, "TASK-T0-BASIC", "accepted");
    const baseline = cli(["status"], root).out;
    expect(baseline).toContain("TASK-T0-BASIC: accepted");

    // PromptKit process documentation must not influence runtime status.
    mkdirSync(join(root, "docs"), { recursive: true });
    writeFileSync(
      join(root, "docs/STATE.md"),
      "- **Overall Status**: COMPLETED\n- **Blockers**: none\n",
      "utf8",
    );
    const withDocs = cli(["status"], root).out;
    expect(withDocs).toBe(baseline);
    expect(withDocs).not.toContain("COMPLETED");

    writeFileSync(join(root, "docs/STATE.md"), "- **Overall Status**: HALTED\n", "utf8");
    expect(cli(["status"], root).out).toBe(baseline);

    rmSync(join(root, "docs/STATE.md"));
    expect(cli(["status"], root).out).toBe(baseline);
  });
});

describe("T5 public CLI surface", () => {
  it("keeps exactly the approved M1 commands and stub exit behaviour", () => {
    const root = tempRoot();
    const help = cli(["--help"], root);
    expect(help.code).toBe(0);
    for (const command of ["init", "run", "status", "verify"]) {
      expect(help.out).toContain(command);
    }
    expect(cli(["run"], root).code).toBe(2);
    expect(cli(["verify"], root).code).toBe(2);
    expect(cli(["deploy"], root).code).toBe(2);
    expect(cli(["deploy"], root).err).toContain("unknown command");
    expect(cli(["status", "--json"], root).code).toBe(2);
  });
});
