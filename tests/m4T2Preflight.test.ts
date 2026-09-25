import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import {
  linkSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  readlinkSync,
  rmSync,
  symlinkSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { runCli } from "../src/cli.js";
import { M2_ADAPTER_ID, M3_PNPM_ADAPTER_ID } from "../src/taskContract.js";
import type { M3AdapterId } from "../src/taskContract.js";

const roots: string[] = [];
const taskId = "TASK-M4-T2-PREFLIGHT";
const firstPath = "src/first.ts", secondPath = "src/second.ts";

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

function digest(bytes: Uint8Array): string { return createHash("sha256").update(bytes).digest("hex"); }

function temporaryDirectory(): string {
  const root = mkdtempSync(join(tmpdir(), "sureflow-m4-t2-"));
  roots.push(root);
  return root;
}

function makeProject(
  manager: "npm" | "pnpm",
  trackedPaths: readonly string[] = [firstPath, secondPath],
): string {
  const root = temporaryDirectory();
  const scripts = {
    typecheck: "node -e process.exit(0)",
    test: "node -e process.exit(0)",
    lint: "node -e process.exit(0)",
    build: "node -e process.exit(0)",
  };
  writeFileSync(
    join(root, "package.json"),
    `${JSON.stringify({
      type: "module",
      packageManager: manager === "pnpm" ? "pnpm@9.15.4" : undefined,
      scripts,
    })}\n`,
  );
  writeFileSync(join(root, "tsconfig.json"), "{}\n");
  if (manager === "npm") writeFileSync(join(root, "package-lock.json"), '{"lockfileVersion":3}\n');
  else writeFileSync(join(root, "pnpm-lock.yaml"), "lockfileVersion: '9.0'\n");
  for (const [index, path] of trackedPaths.entries()) {
    const absolutePath = join(root, path);
    mkdirSync(join(absolutePath, ".."), { recursive: true });
    writeFileSync(absolutePath, `original-${String(index)}\n`);
  }

  execFileSync("git", ["init", "--quiet"], { cwd: root });
  execFileSync("git", ["config", "user.email", "m4-t2@example.invalid"], { cwd: root });
  execFileSync("git", ["config", "user.name", "M4 T2 Test"], { cwd: root });
  execFileSync("git", ["add", "--all"], { cwd: root });
  execFileSync("git", ["commit", "--quiet", "-m", "fixture baseline"], { cwd: root });
  return root;
}

type TargetInput = {
  readonly path: string;
  readonly expectedBeforeSha256?: string;
  readonly replacementContent?: string;
};

function writeTask(
  root: string,
  targets: readonly TargetInput[],
  adapter: M3AdapterId = M2_ADAPTER_ID,
): void {
  mkdirSync(join(root, ".sureflow"), { recursive: true });
  const taskTargets = targets.map((target, index) => {
    let before: Uint8Array;
    try {
      before = readFileSync(join(root, target.path));
    } catch {
      before = Buffer.from(`missing-${String(index)}`);
    }
    return {
      path: target.path,
      expectedBeforeSha256: target.expectedBeforeSha256 ?? digest(before),
      replacementContent: target.replacementContent ?? `replacement-${String(index)}\n`,
    };
  });
  writeFileSync(
    join(root, ".sureflow/task.json"),
    `${JSON.stringify({
      schemaVersion: 2,
      taskId,
      adapter,
      operation: "replace-existing-files",
      targets: taskTargets,
      requiredVerification: ["typecheck", "test", "lint", "build"],
    })}\n`,
  );
}

function runPreflight(root: string): { readonly code: number; readonly out: string; readonly err: string } {
  const out: string[] = [];
  const err: string[] = [];
  const code = runCli(["preflight", taskId], root, {
    out: (line) => out.push(line),
    err: (line) => err.push(line),
  });
  return { code, out: out.join("\n"), err: err.join("\n") };
}

function snapshotFiles(root: string): string {
  const entries: string[] = [];
  const visit = (directory: string): void => {
    for (const entry of readdirSync(directory).sort()) {
      if (entry === ".git" && directory === root) continue;
      const path = join(directory, entry);
      const pathFromRoot = relative(root, path);
      const stat = lstatSync(path);
      if (stat.isSymbolicLink()) entries.push(`L:${pathFromRoot}:${readlinkSync(path)}`);
      else if (stat.isDirectory()) {
        entries.push(`D:${pathFromRoot}`);
        visit(path);
      } else entries.push(`F:${pathFromRoot}:${readFileSync(path).toString("hex")}`);
    }
  };
  visit(root);
  return JSON.stringify(entries);
}

describe("M4-T2 complete-set preflight", () => {
  it.each([
    ["npm", M2_ADAPTER_ID, [firstPath, secondPath]],
    ["pnpm", M3_PNPM_ADAPTER_ID, [firstPath, secondPath]],
    ["npm five-target", M2_ADAPTER_ID, [firstPath, secondPath, "src/third.ts", "src/fourth.ts", "src/fifth.ts"]],
  ] as const)("accepts a complete %s target set without writes", (_label, adapter, paths) => {
    const manager = adapter === M3_PNPM_ADAPTER_ID ? "pnpm" : "npm";
    const root = makeProject(manager, paths);
    writeTask(root, paths.map((path) => ({ path })), adapter);
    const before = snapshotFiles(root);

    const result = runPreflight(root);

    expect(result.code).toBe(0);
    expect(result.out).toContain("ELIGIBLE");
    expect(result.out).toContain(adapter);
    expect(snapshotFiles(root)).toBe(before);
  });

  it.each([
    ["missing target", [firstPath, "src/missing.ts"], undefined, "is missing"],
    ["untracked target", [firstPath, "src/untracked.ts"], "untracked", "not an exact Git-tracked file"],
    ["preimage mismatch", [firstPath, secondPath], "stale", "preimage digest"],
  ] as const)("refuses the whole set for a %s and writes nothing", (_label, paths, mutation, reason) => {
    const root = makeProject("npm");
    if (mutation === "untracked") writeFileSync(join(root, paths[1]), "untracked\n");
    if (mutation === "stale") writeFileSync(join(root, secondPath), "externally changed\n");
    writeTask(root, paths.map((path) => ({
      path,
      ...(mutation === "stale" && path === secondPath
        ? { expectedBeforeSha256: digest(Buffer.from("original-1\n")) }
        : {}),
    })));
    const before = snapshotFiles(root);

    const result = runPreflight(root);

    expect(result.code).toBe(2);
    expect(result.err).toContain(reason);
    expect(snapshotFiles(root)).toBe(before);
  });

  it("refuses a directory used as a target", () => {
    const root = makeProject("npm");
    unlinkSync(join(root, secondPath));
    mkdirSync(join(root, secondPath));
    writeTask(root, [{ path: firstPath }, { path: secondPath }]);
    const before = snapshotFiles(root);

    const result = runPreflight(root);

    expect(result.code).toBe(2);
    expect(result.err).toContain("regular file");
    expect(snapshotFiles(root)).toBe(before);
  });

  it("refuses targets whose canonical realpaths are aliases", () => {
    const root = makeProject("npm");
    symlinkSync(join(root, "src"), join(root, "src-alias"), "dir");
    const paths = [firstPath, "src-alias/first.ts"] as const;
    writeTask(root, paths.map((path) => ({ path })));
    const before = snapshotFiles(root);

    expect(runPreflight(root).code).toBe(2);
    expect(snapshotFiles(root)).toBe(before);
  });

  it("refuses targets with the same usable device and inode", () => {
    const root = makeProject("npm");
    const alias = "src/hardlink.ts";
    linkSync(join(root, firstPath), join(root, alias));
    const paths = [firstPath, alias] as const;
    writeTask(root, paths.map((path) => ({ path })));
    const before = snapshotFiles(root);

    expect(runPreflight(root).code).toBe(2);
    expect(snapshotFiles(root)).toBe(before);
  });

  it("refuses a target reached through a symlink outside the project root", () => {
    const root = makeProject("npm");
    const outside = temporaryDirectory();
    mkdirSync(join(outside, "src"));
    writeFileSync(join(outside, "src/escape.ts"), "outside\n");
    symlinkSync(outside, join(root, "escape"), "dir");
    const paths = [firstPath, "escape/src/escape.ts"] as const;
    writeTask(root, paths.map((path) => ({ path })));
    const before = snapshotFiles(root);

    expect(runPreflight(root).code).toBe(2);
    expect(snapshotFiles(root)).toBe(before);
  });

  it("refuses invalid UTF-8 in any target without modifying repository state", () => {
    const root = makeProject("npm");
    writeFileSync(join(root, secondPath), Buffer.from([0xc3, 0x28]));
    writeTask(root, [
      { path: firstPath },
      { path: secondPath, expectedBeforeSha256: digest(readFileSync(join(root, secondPath))) },
    ]);
    const before = snapshotFiles(root);

    expect(runPreflight(root).code).toBe(2);
    expect(snapshotFiles(root)).toBe(before);
  });

  it("refuses a dirty project baseline after validating the complete set", () => {
    const root = makeProject("npm");
    writeFileSync(join(root, "tsconfig.json"), '{"strict":true}\n');
    writeTask(root, [{ path: firstPath }, { path: secondPath }]);
    const before = snapshotFiles(root);

    expect(runPreflight(root).code).toBe(2);
    expect(snapshotFiles(root)).toBe(before);
  });

  it("uses literal Git path matching for metacharacter targets", () => {
    const path = "src/[literal].ts";
    const root = makeProject("npm", [firstPath, path]);
    writeTask(root, [{ path: firstPath }, { path }]);

    const result = runPreflight(root);

    expect(result.code).toBe(0);
    expect(result.out).toContain("ELIGIBLE");
  });

  it("does not reinterpret a duplicate schemaVersion that hides a v2 declaration", () => {
    const root = makeProject("npm");
    const expectedBeforeSha256 = digest(readFileSync(join(root, firstPath)));
    mkdirSync(join(root, ".sureflow"), { recursive: true });
    writeFileSync(
      join(root, ".sureflow/task.json"),
      `{"schemaVersion":2,"schemaVersion":1,"taskId":"${taskId}","adapter":"${M2_ADAPTER_ID}","operation":"replace-existing-file","targetPath":"${firstPath}","expectedBeforeSha256":"${expectedBeforeSha256}","replacementContent":"replacement\\n","requiredVerification":["test"]}`,
    );
    const before = snapshotFiles(root);

    const result = runPreflight(root);

    expect(result.code).toBe(2);
    expect(result.err).toContain("invalid M4 task contract");
    expect(snapshotFiles(root)).toBe(before);
  });
});
