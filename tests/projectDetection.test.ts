import {
  cpSync,
  lstatSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  symlinkSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  loadValidatedExecutionPlan,
  M2_ADAPTER_ID,
} from "../src/taskContract.js";
import {
  detectProject,
} from "../src/projectDetection.js";

const fixtureRoot = resolve("fixtures/m2-node-ts-project");
const temporaryRoots: string[] = [];

function temporaryProject(): { root: string; plan: ReturnType<typeof loadValidatedExecutionPlan> } {
  const root = mkdtempSync(join(tmpdir(), "sureflow-m2-t2-"));
  temporaryRoots.push(root);
  cpSync(fixtureRoot, root, { recursive: true });
  mkdirSync(join(root, ".sureflow"), { recursive: true });
  writeFileSync(
    join(root, ".sureflow/task.json"),
    readFileSync(join(fixtureRoot, "task.example.json")),
  );
  return { root, plan: loadValidatedExecutionPlan(root) };
}

function packageJsonPath(root: string): string {
  return join(root, "package.json");
}

function readPackage(root: string): Record<string, unknown> {
  return JSON.parse(readFileSync(packageJsonPath(root), "utf8")) as Record<string, unknown>;
}

function writePackage(root: string, packageJson: Record<string, unknown>): void {
  writeFileSync(packageJsonPath(root), `${JSON.stringify(packageJson)}\n`);
}

function symlinkSupport(): boolean {
  const root = mkdtempSync(join(tmpdir(), "sureflow-m2-t2-support-"));
  try {
    mkdirSync(join(root, "target"));
    symlinkSync(join(root, "target"), join(root, "link"), "dir");
    return true;
  } catch {
    return false;
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

const canCreateSymlinks = symlinkSupport();

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe("M2-T2 project detection", () => {
  it("detects the approved independent fixture as the closed adapter", () => {
    const { root, plan } = temporaryProject();

    const result = detectProject(root, plan);

    expect(result).toEqual({
      kind: "supported",
      project: {
        adapter: M2_ADAPTER_ID,
        root: resolve(root),
        manifestPath: "package.json",
        lockfilePath: "package-lock.json",
        tsconfigPath: "tsconfig.json",
        targetPath: "src/displayName.ts",
        supportedChecks: ["typecheck", "test", "lint", "build"],
      },
    });
    if (result.kind === "supported") {
      expect(Object.isFrozen(result)).toBe(true);
      expect(Object.isFrozen(result.project)).toBe(true);
      expect(Object.isFrozen(result.project.supportedChecks)).toBe(true);
    }
  });

  it("returns unsupported when package.json is missing", () => {
    const { root, plan } = temporaryProject();
    unlinkSync(packageJsonPath(root));

    expect(detectProject(root, plan)).toMatchObject({
      kind: "unsupported",
      reason: "package.json is missing",
    });
  });

  it("returns invalid for malformed package.json", () => {
    const { root, plan } = temporaryProject();
    writeFileSync(packageJsonPath(root), "{\n");

    expect(detectProject(root, plan)).toMatchObject({
      kind: "invalid",
      reason: "package.json is malformed JSON",
    });
  });

  it("returns invalid when package.json has the wrong top-level type", () => {
    const { root, plan } = temporaryProject();
    writeFileSync(packageJsonPath(root), "[]\n");

    expect(detectProject(root, plan)).toMatchObject({
      kind: "invalid",
      reason: "package.json must have an object top level",
    });
  });

  it("returns unsupported when required TypeScript evidence is missing", () => {
    const { root, plan } = temporaryProject();
    unlinkSync(join(root, "tsconfig.json"));

    expect(detectProject(root, plan)).toMatchObject({
      kind: "unsupported",
      reason: "tsconfig.json is missing",
    });
  });

  it("returns unsupported when npm lockfile evidence is missing", () => {
    const { root, plan } = temporaryProject();
    unlinkSync(join(root, "package-lock.json"));

    expect(detectProject(root, plan)).toMatchObject({
      kind: "unsupported",
      reason: "package-lock.json is missing",
    });
  });

  it("returns invalid when package-lock.json is malformed", () => {
    const { root, plan } = temporaryProject();
    writeFileSync(join(root, "package-lock.json"), "{\n");

    expect(detectProject(root, plan)).toMatchObject({
      kind: "invalid",
      reason: "package-lock.json is malformed JSON",
    });
  });

  it("returns unsupported when a required npm script is missing", () => {
    const { root, plan } = temporaryProject();
    const packageJson = readPackage(root);
    const scripts = packageJson.scripts as Record<string, unknown>;
    delete scripts.test;
    writePackage(root, packageJson);

    expect(detectProject(root, plan)).toMatchObject({
      kind: "unsupported",
      reason: "package.json is missing required npm scripts: test",
    });
  });

  it("returns unsupported for an incompatible Node project shape", () => {
    const { root, plan } = temporaryProject();
    writePackage(root, { ...readPackage(root), type: "python" });

    expect(detectProject(root, plan)).toMatchObject({
      kind: "unsupported",
      reason: "package.json has an unsupported Node module type",
    });
  });

  it("rejects a missing target before any later mutation task", () => {
    const { root, plan } = temporaryProject();
    unlinkSync(join(root, "src/displayName.ts"));

    expect(detectProject(root, plan)).toMatchObject({
      kind: "unsupported",
      reason: "task target is missing",
    });
  });

  it("rejects a target that is not a regular file", () => {
    const { root, plan } = temporaryProject();
    unlinkSync(join(root, "src/displayName.ts"));
    mkdirSync(join(root, "src/displayName.ts"));

    expect(detectProject(root, plan)).toMatchObject({
      kind: "unsupported",
      reason: "task target must be a regular file",
    });
  });

  it.skipIf(!canCreateSymlinks)("rejects a target ancestor that escapes through a symlink", () => {
    const { root, plan } = temporaryProject();
    const outside = mkdtempSync(join(tmpdir(), "sureflow-m2-t2-outside-"));
    temporaryRoots.push(outside);
    rmSync(join(root, "src"), { recursive: true, force: true });
    symlinkSync(outside, join(root, "src"), "dir");

    expect(detectProject(root, plan)).toMatchObject({
      kind: "unsupported",
      reason: "task target escapes the project root through a symlink",
    });
  });

  it.skipIf(!canCreateSymlinks)("rejects evidence that escapes through a symlinked ancestor", () => {
    const { root, plan } = temporaryProject();
    const outside = mkdtempSync(join(tmpdir(), "sureflow-m2-t2-outside-"));
    temporaryRoots.push(outside);
    writeFileSync(join(outside, "package.json"), readFileSync(packageJsonPath(root)));
    rmSync(packageJsonPath(root));
    symlinkSync(join(outside, "package.json"), packageJsonPath(root), "file");

    expect(detectProject(root, plan)).toMatchObject({
      kind: "unsupported",
      reason: "package.json escapes the project root through a symlink",
    });
  });

  it("does not write while detecting and does not execute project scripts", () => {
    const { root, plan } = temporaryProject();
    const beforeTask = readFileSync(join(root, ".sureflow/task.json"));
    const beforeEntries = lstatSync(root).mtimeMs;
    const packageJson = readPackage(root);
    packageJson.scripts = {
      typecheck: 'node -e "process.exit(97)"',
      test: 'node -e "process.exit(97)"',
      lint: 'node -e "process.exit(97)"',
      build: 'node -e "process.exit(97)"',
    };
    writePackage(root, packageJson);
    const beforeDetection = readFileSync(packageJsonPath(root));
    const beforeDetectionMtime = lstatSync(root).mtimeMs;

    expect(detectProject(root, plan)).toMatchObject({ kind: "supported" });
    expect(readFileSync(join(root, ".sureflow/task.json"))).toEqual(beforeTask);
    expect(readFileSync(packageJsonPath(root))).toEqual(beforeDetection);
    expect(beforeEntries).toBeLessThanOrEqual(beforeDetectionMtime);
    expect(lstatSync(root).mtimeMs).toBe(beforeDetectionMtime);
    expect(lstatSync(join(root, ".sureflow/task.json")).isFile()).toBe(true);
  });

  it("does not fall back when the immutable plan selects another adapter", () => {
    const { root, plan } = temporaryProject();
    const unsupportedPlan = { ...plan, adapter: "other-adapter" } as unknown as typeof plan;

    expect(detectProject(root, unsupportedPlan)).toMatchObject({
      kind: "unsupported",
      reason: "task plan selects an unsupported adapter",
    });
  });
});
