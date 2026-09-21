import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  rmSync,
  symlinkSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  M2_ADAPTER_ID,
  M2_REPLACEMENT_OPERATION,
  M2_TASK_CONTRACT_SCHEMA_VERSION,
} from "../src/taskContract.js";
import {
  inspectPostWriteScope,
  inspectProjectBaseline,
  parsePorcelainV1Z,
  type GitStatusObservation,
  type GitStatusRunner,
  type ProjectScopeDependencies,
} from "../src/projectScope.js";
import type {
  DetectedNodeTypeScriptProject,
} from "../src/projectDetection.js";
import type { ValidatedExecutionPlan } from "../src/taskContract.js";

const temporaryRoots: string[] = [];

function runGit(root: string, args: readonly string[]): void {
  const result = spawnSync("git", [...args], {
    cwd: root,
    shell: false,
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (result.status !== 0) {
    throw new Error(`git ${args.join(" ")} failed: ${result.stderr.toString("utf8")}`);
  }
}

function temporaryGitRepository(): string {
  const root = mkdtempSync(join(tmpdir(), "sureflow-m2-t5-"));
  temporaryRoots.push(root);
  runGit(root, ["init"]);
  runGit(root, ["config", "user.email", "sureflow-tests@example.invalid"]);
  runGit(root, ["config", "user.name", "Sureflow Tests"]);
  mkdirSync(join(root, "src"));
  writeFileSync(join(root, "src/target.ts"), "export const target = 1;\n");
  writeFileSync(join(root, "src/other.ts"), "export const other = 1;\n");
  runGit(root, ["add", "src"]);
  runGit(root, ["commit", "-m", "baseline"]);
  return root;
}

function project(root: string, targetPath = "src/target.ts"): DetectedNodeTypeScriptProject {
  return {
    adapter: M2_ADAPTER_ID,
    root: realpathSync(root),
    manifestPath: "package.json",
    lockfilePath: "package-lock.json",
    tsconfigPath: "tsconfig.json",
    targetPath,
    supportedChecks: Object.freeze(["typecheck", "test", "lint", "build"]),
  };
}

function plan(targetPath = "src/target.ts"): ValidatedExecutionPlan {
  return {
    schemaVersion: M2_TASK_CONTRACT_SCHEMA_VERSION,
    taskId: "task-t5-test",
    adapter: M2_ADAPTER_ID,
    requiredVerification: Object.freeze(["typecheck", "test", "lint", "build"]),
    operation: M2_REPLACEMENT_OPERATION,
    targetPath,
    expectedBeforeSha256: "0".repeat(64),
    replacementContent: "export const target = 2;\n",
    contractSha256: "0".repeat(64),
    source: {
      path: ".sureflow/task.json",
      sha256: "0".repeat(64),
    },
  };
}

function statusOutput(...records: string[]): Buffer {
  return Buffer.from(`${records.join("\0")}\0`, "utf8");
}

function injectedRunner(
  output: Buffer,
  overrides: Partial<GitStatusObservation> = {},
  calls: Array<{ executable: string; argv: readonly string[]; cwd: string; shell: boolean }> = [],
): ProjectScopeDependencies {
  const runner: GitStatusRunner = (executable, argv, options) => {
    calls.push({ executable, argv, cwd: options.cwd, shell: options.shell });
    return {
      status: 0,
      signal: null,
      stdout: output,
      ...overrides,
    };
  };
  return { gitStatusRunner: runner };
}

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe("M2-T5 project scope inspection", () => {
  it("reports a clean repository baseline", () => {
    const root = temporaryGitRepository();

    expect(inspectProjectBaseline(project(root))).toEqual({
      kind: "clean",
      snapshot: { changedPaths: [] },
    });
  });

  it("excludes .sureflow changes from the project baseline", () => {
    const root = temporaryGitRepository();
    mkdirSync(join(root, ".sureflow"));
    writeFileSync(join(root, ".sureflow/state.json"), "runtime\n");

    expect(inspectProjectBaseline(project(root))).toEqual({
      kind: "clean",
      snapshot: { changedPaths: [] },
    });
  });

  it("reports an unstaged tracked modification as a dirty baseline", () => {
    const root = temporaryGitRepository();
    writeFileSync(join(root, "src/target.ts"), "changed\n");

    expect(inspectProjectBaseline(project(root))).toEqual({
      kind: "dirty",
      snapshot: { changedPaths: ["src/target.ts"] },
    });
  });

  it("reports a tracked deletion as a dirty baseline", () => {
    const root = temporaryGitRepository();
    unlinkSync(join(root, "src/other.ts"));

    expect(inspectProjectBaseline(project(root))).toEqual({
      kind: "dirty",
      snapshot: { changedPaths: ["src/other.ts"] },
    });
  });

  it("reports a staged addition as a dirty baseline", () => {
    const root = temporaryGitRepository();
    writeFileSync(join(root, "src/staged.ts"), "staged\n");
    runGit(root, ["add", "src/staged.ts"]);

    expect(inspectProjectBaseline(project(root))).toEqual({
      kind: "dirty",
      snapshot: { changedPaths: ["src/staged.ts"] },
    });
  });

  it("reports a non-ignored untracked path as a dirty baseline", () => {
    const root = temporaryGitRepository();
    writeFileSync(join(root, "untracked.txt"), "untracked\n");

    expect(inspectProjectBaseline(project(root))).toEqual({
      kind: "dirty",
      snapshot: { changedPaths: ["untracked.txt"] },
    });
  });

  it("does not claim ignored-file enforcement", () => {
    const root = temporaryGitRepository();
    writeFileSync(join(root, ".gitignore"), "ignored.txt\n");
    runGit(root, ["add", ".gitignore"]);
    runGit(root, ["commit", "-m", "ignore test file"]);
    writeFileSync(join(root, "ignored.txt"), "ignored\n");

    expect(inspectProjectBaseline(project(root))).toEqual({
      kind: "clean",
      snapshot: { changedPaths: [] },
    });
  });

  it("reports exactly the authorized target as compliant post-write scope", () => {
    const root = temporaryGitRepository();
    writeFileSync(join(root, "src/target.ts"), "replacement\n");

    expect(inspectPostWriteScope(project(root), plan())).toEqual({
      kind: "compliant",
      compliant: true,
      changedPaths: ["src/target.ts"],
      unauthorizedPaths: [],
    });
  });

  it("reports an unrelated tracked modification as a scope violation", () => {
    const root = temporaryGitRepository();
    writeFileSync(join(root, "src/target.ts"), "replacement\n");
    writeFileSync(join(root, "src/other.ts"), "unrelated\n");

    expect(inspectPostWriteScope(project(root), plan())).toMatchObject({
      kind: "violation",
      compliant: false,
      changedPaths: ["src/other.ts", "src/target.ts"],
      unauthorizedPaths: ["src/other.ts"],
    });
  });

  it("reports an unrelated non-ignored untracked path as a scope violation", () => {
    const root = temporaryGitRepository();
    writeFileSync(join(root, "src/target.ts"), "replacement\n");
    writeFileSync(join(root, "unrelated.txt"), "unrelated\n");

    expect(inspectPostWriteScope(project(root), plan())).toMatchObject({
      kind: "violation",
      compliant: false,
      unauthorizedPaths: ["unrelated.txt"],
    });
  });

  it("reports only an unrelated project change as a violation", () => {
    const root = temporaryGitRepository();
    writeFileSync(join(root, "src/other.ts"), "unrelated\n");

    expect(inspectPostWriteScope(project(root), plan())).toMatchObject({
      kind: "violation",
      compliant: false,
      changedPaths: ["src/other.ts"],
      unauthorizedPaths: ["src/other.ts"],
      reason: "authorized target change was not observed",
    });
  });

  it("does not treat a rename record as an approved replacement", () => {
    const root = temporaryGitRepository();
    const dependencies = injectedRunner(statusOutput("R  src/renamed.ts", "src/target.ts"));

    expect(inspectPostWriteScope(project(root), plan(), dependencies)).toMatchObject({
      kind: "violation",
      compliant: false,
      changedPaths: ["src/renamed.ts", "src/target.ts"],
      unauthorizedPaths: ["src/renamed.ts"],
      reason: "rename or copy structure is not an approved replacement",
    });
  });

  it("parses filenames with spaces and quoting characters", () => {
    const parsed = parsePorcelainV1Z(statusOutput('?? file with "quotes"\\backslash.txt'));

    expect(parsed).toEqual({
      kind: "parsed",
      entries: [{ paths: ['file with "quotes"\\backslash.txt'], renameOrCopy: false }],
    });
  });

  it("sorts output paths independently of Git output order", () => {
    const dependencies = injectedRunner(statusOutput(" M z.txt", " M a.txt"));
    const root = temporaryGitRepository();

    expect(inspectProjectBaseline(project(root), dependencies)).toEqual({
      kind: "dirty",
      snapshot: { changedPaths: ["a.txt", "z.txt"] },
    });
  });

  it("deduplicates observed paths", () => {
    const dependencies = injectedRunner(statusOutput(" M src/target.ts", " M src/target.ts"));
    const root = temporaryGitRepository();

    expect(inspectProjectBaseline(project(root), dependencies)).toEqual({
      kind: "dirty",
      snapshot: { changedPaths: ["src/target.ts"] },
    });
  });

  it("rejects malformed porcelain output instead of reporting clean", () => {
    const root = temporaryGitRepository();
    const result = inspectProjectBaseline(project(root), injectedRunner(Buffer.from(" M missing nul")));

    expect(result).toMatchObject({ kind: "invalid" });
  });

  it("reports a Git spawn error as unavailable", () => {
    const root = temporaryGitRepository();
    const result = inspectProjectBaseline(
      project(root),
      injectedRunner(Buffer.alloc(0), { error: new Error("spawn failed"), status: null }),
    );

    expect(result).toMatchObject({ kind: "unavailable" });
  });

  it("reports signal termination as unavailable", () => {
    const root = temporaryGitRepository();
    const result = inspectProjectBaseline(
      project(root),
      injectedRunner(Buffer.alloc(0), { signal: "SIGTERM", status: null }),
    );

    expect(result).toMatchObject({ kind: "unavailable" });
  });

  it("dispatches exactly the approved Git status command", () => {
    const root = temporaryGitRepository();
    const calls: Array<{ executable: string; argv: readonly string[]; cwd: string; shell: boolean }> = [];

    expect(inspectProjectBaseline(project(root), injectedRunner(Buffer.alloc(0), {}, calls))).toMatchObject({
      kind: "clean",
    });
    expect(calls).toEqual([{
      executable: "git",
      argv: ["status", "--porcelain=v1", "-z", "--untracked-files=all"],
      cwd: realpathSync(root),
      shell: false,
    }]);
  });

  it("uses the canonical detected project root as cwd", () => {
    const root = temporaryGitRepository();
    const alias = mkdtempSync(join(tmpdir(), "sureflow-m2-t5-alias-"));
    temporaryRoots.push(alias);
    rmSync(alias, { recursive: true, force: true });
    symlinkSync(root, alias, "dir");
    const calls: Array<{ executable: string; argv: readonly string[]; cwd: string; shell: boolean }> = [];

    expect(inspectProjectBaseline(project(alias), injectedRunner(Buffer.alloc(0), {}, calls))).toMatchObject({
      kind: "clean",
    });
    expect(calls[0]?.cwd).toBe(realpathSync(root));
  });

  it("does not write project files while inspecting", () => {
    const root = temporaryGitRepository();
    const target = join(root, "src/target.ts");
    const before = readFileSync(target);
    const result = inspectProjectBaseline(project(root));

    expect(result.kind).toBe("clean");
    expect(readFileSync(target)).toEqual(before);
  });

  it("does not execute a mutating Git command", () => {
    const root = temporaryGitRepository();
    const calls: Array<{ executable: string; argv: readonly string[]; cwd: string; shell: boolean }> = [];

    inspectProjectBaseline(project(root), injectedRunner(Buffer.alloc(0), {}, calls));

    expect(calls).toHaveLength(1);
    expect(calls[0]?.argv).toEqual(["status", "--porcelain=v1", "-z", "--untracked-files=all"]);
  });

  it("excludes .sureflow from post-write scope while retaining project changes", () => {
    const root = temporaryGitRepository();
    mkdirSync(join(root, ".sureflow"));
    writeFileSync(join(root, ".sureflow/state.json"), "runtime\n");
    writeFileSync(join(root, "src/target.ts"), "replacement\n");

    expect(inspectPostWriteScope(project(root), plan())).toEqual({
      kind: "compliant",
      compliant: true,
      changedPaths: ["src/target.ts"],
      unauthorizedPaths: [],
    });
  });

  it("rejects a target path that is not a normalized project-relative path", () => {
    const root = temporaryGitRepository();

    expect(inspectPostWriteScope(project(root, "../outside.ts"), plan("../outside.ts"))).toMatchObject({
      kind: "invalid",
      compliant: false,
    });
  });

  it("does not claim compliance when the authorized target is absent", () => {
    const root = temporaryGitRepository();
    const dependencies = injectedRunner(statusOutput(" M src/other.ts"));

    expect(inspectPostWriteScope(project(root), plan(), dependencies)).toMatchObject({
      kind: "violation",
      compliant: false,
      unauthorizedPaths: ["src/other.ts"],
    });
  });

  it("reports nonzero Git status as unavailable", () => {
    const root = temporaryGitRepository();
    const result = inspectProjectBaseline(
      project(root),
      injectedRunner(Buffer.from("garbage"), { status: 128 }),
    );

    expect(result).toMatchObject({ kind: "unavailable" });
  });
});
