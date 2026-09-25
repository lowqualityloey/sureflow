import {
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  symlinkSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  inspectProjectBaseline,
  parsePorcelainV1Z,
} from "../src/projectScope.js";
import {
  cleanupTemporaryRepositories,
  detectedProject,
  injectedRunner,
  statusOutput,
  trackTemporaryRepository,
  temporaryGitRepository,
} from "./helpers/projectScope.js";

afterEach(cleanupTemporaryRepositories);

describe("Git-visible project scope observations", () => {
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

    expect(inspectProjectBaseline(detectedProject(root), dependencies)).toEqual({
      kind: "dirty",
      snapshot: { changedPaths: ["a.txt", "z.txt"] },
    });
  });

  it("deduplicates observed paths", () => {
    const dependencies = injectedRunner(statusOutput(" M src/target.ts", " M src/target.ts"));
    const root = temporaryGitRepository();

    expect(inspectProjectBaseline(detectedProject(root), dependencies)).toEqual({
      kind: "dirty",
      snapshot: { changedPaths: ["src/target.ts"] },
    });
  });

  it("rejects malformed porcelain output instead of reporting clean", () => {
    const root = temporaryGitRepository();
    const result = inspectProjectBaseline(detectedProject(root), injectedRunner(Buffer.from(" M missing nul")));

    expect(result).toMatchObject({ kind: "invalid" });
  });

  it("reports a Git spawn error as unavailable", () => {
    const root = temporaryGitRepository();
    const result = inspectProjectBaseline(
      detectedProject(root),
      injectedRunner(Buffer.alloc(0), { error: new Error("spawn failed"), status: null }),
    );

    expect(result).toMatchObject({ kind: "unavailable" });
  });

  it("reports signal termination as unavailable", () => {
    const root = temporaryGitRepository();
    const result = inspectProjectBaseline(
      detectedProject(root),
      injectedRunner(Buffer.alloc(0), { signal: "SIGTERM", status: null }),
    );

    expect(result).toMatchObject({ kind: "unavailable" });
  });

  it("dispatches exactly the approved Git status command", () => {
    const root = temporaryGitRepository();
    const calls: Array<{ executable: string; argv: readonly string[]; cwd: string; shell: boolean }> = [];

    expect(inspectProjectBaseline(detectedProject(root), injectedRunner(Buffer.alloc(0), {}, calls))).toMatchObject({
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
    trackTemporaryRepository(alias);
    rmSync(alias, { recursive: true, force: true });
    symlinkSync(root, alias, "dir");
    const calls: Array<{ executable: string; argv: readonly string[]; cwd: string; shell: boolean }> = [];

    expect(inspectProjectBaseline(detectedProject(alias), injectedRunner(Buffer.alloc(0), {}, calls))).toMatchObject({
      kind: "clean",
    });
    expect(calls[0]?.cwd).toBe(realpathSync(root));
  });

  it("does not write project files while inspecting", () => {
    const root = temporaryGitRepository();
    const target = join(root, "src/target.ts");
    const before = readFileSync(target);
    const result = inspectProjectBaseline(detectedProject(root));

    expect(result.kind).toBe("clean");
    expect(readFileSync(target)).toEqual(before);
  });

  it("does not execute a mutating Git command", () => {
    const root = temporaryGitRepository();
    const calls: Array<{ executable: string; argv: readonly string[]; cwd: string; shell: boolean }> = [];

    inspectProjectBaseline(detectedProject(root), injectedRunner(Buffer.alloc(0), {}, calls));

    expect(calls).toHaveLength(1);
    expect(calls[0]?.argv).toEqual(["status", "--porcelain=v1", "-z", "--untracked-files=all"]);
  });

  it("reports nonzero Git status as unavailable", () => {
    const root = temporaryGitRepository();
    const result = inspectProjectBaseline(
      detectedProject(root),
      injectedRunner(Buffer.from("garbage"), { status: 128 }),
    );

    expect(result).toMatchObject({ kind: "unavailable" });
  });
});
