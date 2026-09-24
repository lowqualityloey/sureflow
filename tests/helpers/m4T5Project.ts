import { createHash, randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { initRuntimeState } from "../../src/stateWriter.js";
import { M2_ADAPTER_ID } from "../../src/taskContract.js";

export interface M4T5Project {
  readonly root: string;
  readonly taskId: string;
  readonly paths: readonly string[];
  readonly before: ReadonlyMap<string, string>;
  readonly replacements: ReadonlyMap<string, string>;
}

export function digestText(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

export function prepareM4T5Project(targetCount = 2, pathOverride?: readonly string[]): M4T5Project {
  if (targetCount < 2 || targetCount > 5) throw new Error("fixture target count must be from two to five");
  const root = mkdtempSync(join(tmpdir(), "sureflow-m4-t5-"));
  const taskId = `TASK-M4-T5-${randomUUID().slice(0, 8)}`;
  const paths = pathOverride === undefined
    ? Array.from({ length: targetCount }, (_, index) => `src/target-${String(index)}.ts`)
    : [...pathOverride];
  if (paths.length < 2 || paths.length > 5) throw new Error("fixture paths must contain two to five targets");
  const replacements = new Map(paths.map((path, index) => [path, `after-${String(index)}\n`]));
  mkdirSync(join(root, "src"), { recursive: true });
  writeFileSync(join(root, ".gitignore"), ".sureflow/\nnode_modules/\n");
  const packageContent = JSON.stringify({
    name: "m4-t5-fixture",
    version: "1.0.0",
    packageManager: "npm@11.19.0",
    scripts: {
      typecheck: "node -e \"process.exit(0)\"",
      test: "node -e \"process.exit(0)\"",
      lint: "node -e \"process.exit(0)\"",
      build: "node -e \"process.exit(0)\"",
    },
  }, null, 2);
  writeFileSync(join(root, "package.json"), packageContent);
  writeFileSync(join(root, "package-lock.json"), '{"lockfileVersion":3}\n');
  writeFileSync(join(root, "tsconfig.json"), '{"compilerOptions":{"strict":true}}\n');
  const before = new Map(paths.map((path, index) => [
    path,
    path === "package.json" ? packageContent : `before-${String(index)}\n`,
  ]));
  for (const path of paths) {
    if (path === "package.json") continue;
    const targetPath = join(root, path);
    mkdirSync(dirname(targetPath), { recursive: true });
    writeFileSync(targetPath, before.get(path) ?? "");
  }
  try {
    for (const args of [
      ["init", "--quiet"],
      ["config", "user.email", "m4-t5@example.invalid"],
      ["config", "user.name", "M4 T5 Test"],
      ["add", "--all"],
      ["commit", "--quiet", "-m", "fixture baseline"],
    ]) execFileSync("git", args, { cwd: root });
  } catch (error: unknown) {
    rmSync(root, { recursive: true, force: true });
    throw error;
  }
  const initialized = initRuntimeState({
    rootDir: root,
    projectName: "m4-t5-fixture",
    nowIso: "2026-09-25T00:00:00.000Z",
    force: false,
  });
  if (initialized.kind !== "initialized") throw new Error("M4 T5 fixture runtime state did not initialize");
  writeFileSync(join(root, ".sureflow", "task.json"), JSON.stringify({
    schemaVersion: 2,
    taskId,
    adapter: M2_ADAPTER_ID,
    operation: "replace-existing-files",
    targets: paths.slice().reverse().map((path) => ({
      path,
      expectedBeforeSha256: digestText(before.get(path) ?? ""),
      replacementContent: replacements.get(path) ?? "",
    })),
    requiredVerification: ["typecheck", "test", "lint", "build"],
  }));
  return Object.freeze({ root, taskId, paths: Object.freeze(paths), before, replacements });
}

export function readM4T5File(project: M4T5Project, path: string): string {
  return readFileSync(join(project.root, path), "utf8");
}

export function cleanupM4T5Project(project: M4T5Project): void {
  rmSync(project.root, { recursive: true, force: true });
}
