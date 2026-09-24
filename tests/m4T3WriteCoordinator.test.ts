import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import {
  chmodSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readdirSync,
  renameSync, rmSync, rmdirSync, statSync, symlinkSync, writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { validateM4CompleteTargetSet } from "../src/completeTargetSet.js";
import { executeM4WriteCoordinator } from "../src/m4WriteCoordinator.js";
import { M2_ADAPTER_ID, loadValidatedM4ExecutionPlan } from "../src/taskContract.js";
import type { M4ValidatedExecutionPlan } from "../src/taskContract.js";

type FileSpec = { readonly path: string; readonly before: string; readonly replacement?: string };
type Project = {
  readonly root: string;
  readonly plan: M4ValidatedExecutionPlan;
  readonly eligibleSet: Extract<ReturnType<typeof validateM4CompleteTargetSet>, { kind: "validated" }>;
};
const roots: string[] = [];

function digest(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function prepare(specs: readonly FileSpec[], testScript = "node -e \"\""): Project {
  const root = mkdtempSync(join(tmpdir(), "sureflow-m4-t3-"));
  roots.push(root);
  writeFileSync(join(root, "package.json"), JSON.stringify({ scripts: { test: testScript } }));
  writeFileSync(join(root, "package-lock.json"), '{"lockfileVersion":3}\n');
  for (const spec of specs) {
    const path = join(root, spec.path);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, spec.before);
  }
  mkdirSync(join(root, ".sureflow"));
  writeFileSync(join(root, ".sureflow/task.json"), JSON.stringify({
    schemaVersion: 2,
    taskId: "TASK-M4-T3-COORDINATOR",
    adapter: M2_ADAPTER_ID,
    operation: "replace-existing-files",
    targets: specs.map((spec) => ({
      path: spec.path,
      expectedBeforeSha256: digest(spec.before),
      replacementContent: spec.replacement ?? `replacement for ${spec.path}\n`,
    })),
    requiredVerification: ["test"],
  }));
  for (const args of [
    ["init", "--quiet"], ["config", "user.email", "m4-t3@example.invalid"],
    ["config", "user.name", "M4 T3 Test"], ["add", "--all"],
    ["commit", "--quiet", "-m", "fixture baseline"],
  ]) execFileSync("git", args, { cwd: root });
  const plan = loadValidatedM4ExecutionPlan(root);
  const eligibleSet = validateM4CompleteTargetSet(root, plan.targets);
  if (eligibleSet.kind !== "validated") throw new Error(`fixture rejected: ${eligibleSet.reason}`);
  return { root, plan, eligibleSet };
}

function run(project: Project, dependencies?: Parameters<typeof executeM4WriteCoordinator>[0]["dependencies"]) {
  return executeM4WriteCoordinator({
    projectRoot: project.root, plan: project.plan, eligibleSet: project.eligibleSet,
  ...(dependencies === undefined ? {} : { dependencies }),
  });
}

function halted(result: ReturnType<typeof executeM4WriteCoordinator>) {
  if (result.kind !== "halted") throw new Error("expected a halted write result");
  return result;
}

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe("M4-T3 ordered write coordinator", () => {
  it("writes two authorized targets in canonical order", () => {
    const project = prepare([
      { path: "src/z.ts", before: "z-before\n" }, { path: "src/a.ts", before: "a-before\n" },
    ]);
    const result = run(project);
    expect(result.kind).toBe("completed");
    expect(result.completed.map((target) => target.path)).toEqual(["src/a.ts", "src/z.ts"]);
    expect(readFileSync(join(project.root, "src/a.ts"), "utf8")).toContain("replacement for");
  });

  it("writes every target in a valid five-target set", () => {
    const paths = ["src/e.ts", "src/c.ts", "src/a.ts", "src/d.ts", "src/b.ts"];
    const project = prepare(paths.map((path) => ({ path, before: `before ${path}\n` })));
    const result = run(project);
    expect(result.kind).toBe("completed");
    expect(result.completed.map(({ path }) => path)).toEqual(paths.slice().sort());
    for (const path of paths) expect(readFileSync(join(project.root, path), "utf8")).toContain("replacement for");
  });

  it("fails closed if complete-set trackedness inspection throws", () => {
    const project = prepare([
      { path: "src/a.ts", before: "a-before\n" }, { path: "src/b.ts", before: "b-before\n" },
    ]);
    expect(validateM4CompleteTargetSet(project.root, project.plan.targets, {
      hasExactGitTrackedPath: () => { throw new Error("injected trackedness failure"); },
    })).toMatchObject({ kind: "refused" });
    expect(readFileSync(join(project.root, "src/a.ts"), "utf8")).toBe("a-before\n");
    expect(readFileSync(join(project.root, "src/b.ts"), "utf8")).toBe("b-before\n");
  });

  it("orders non-ASCII paths by UTF-8 bytes, not declaration or locale order", () => {
    const paths = ["src/é.ts", "src/z.ts", "src/ä.ts", "src/a.ts"];
    const project = prepare(paths.map((path) => ({ path, before: `before ${path}\n` })));
    const expected = paths.slice().sort((a, b) => Buffer.compare(Buffer.from(a), Buffer.from(b)));
    expect(run(project).completed.map(({ path }) => path)).toEqual(expected);
  });

  it("refuses a stale first target with an empty prefix", () => {
    const project = prepare([
      { path: "src/a.ts", before: "a-before\n" }, { path: "src/b.ts", before: "b-before\n" },
    ]);
    writeFileSync(join(project.root, "src/a.ts"), "stale\n");
    const result = halted(run(project));
    expect(result.completed).toEqual([]);
    expect(result.failedTarget).toMatchObject({ path: "src/a.ts", code: "stale-preimage" });
    expect(result.notAttempted).toEqual(["src/b.ts"]);
    expect(readFileSync(join(project.root, "src/b.ts"), "utf8")).toBe("b-before\n");
  });

  it("halts on later stale input and preserves only the completed prefix", () => {
    const project = prepare(["a", "b", "c"].map((name) => ({
      path: `src/${name}.ts`, before: `${name}-before\n`,
    })));
    writeFileSync(join(project.root, "src/b.ts"), "stale\n");
    const result = halted(run(project));
    expect(result.completed.map(({ path }) => path)).toEqual(["src/a.ts"]);
    expect(result.failedTarget).toMatchObject({ path: "src/b.ts", code: "stale-preimage" });
    expect(result.notAttempted).toEqual(["src/c.ts"]);
    expect(readFileSync(join(project.root, "src/a.ts"), "utf8")).toContain("replacement for");
    expect(readFileSync(join(project.root, "src/c.ts"), "utf8")).toBe("c-before\n");
  });

  it("refuses changed device/inode identity before writing that target", () => {
    const project = prepare([
      { path: "src/a.ts", before: "a-before\n" }, { path: "src/b.ts", before: "b-before\n" },
    ]);
    const changed = join(project.root, "src/b.ts");
    const result = halted(run(project, { inspection: { readFileIdentity: (path) => {
      const current = statSync(path, { bigint: true });
      return path === changed
        ? { device: current.dev, inode: current.ino + 1n }
        : { device: current.dev, inode: current.ino };
    } } }));
    expect(result.failedTarget).toMatchObject({ path: "src/b.ts", code: "identity-changed" });
    expect(result.completed.map(({ path }) => path)).toEqual(["src/a.ts"]);
  });

  it("refuses changed canonical path while remaining inside the project", () => {
    const project = prepare([
      { path: "src/redirect/target.ts", before: "before\n" }, { path: "src/z.ts", before: "z\n" },
    ]);
    const redirect = join(project.root, "src/redirect"), alternate = join(project.root, "src/alternate");
    mkdirSync(alternate);
    writeFileSync(join(alternate, "target.ts"), "before\n");
    rmSync(join(redirect, "target.ts"));
    rmdirSync(redirect);
    symlinkSync(relative(join(project.root, "src"), alternate), redirect, "dir");
    const result = halted(run(project));
    expect(result.completed).toEqual([]);
    expect(result.failedTarget).toMatchObject({ path: "src/redirect/target.ts", code: "identity-changed" });
  });

  it("refuses lost exact trackedness and does not attempt the suffix", () => {
    const project = prepare(["a", "b", "c"].map((name) => ({
      path: `src/${name}.ts`, before: `${name}-before\n`,
    })));
    const result = halted(run(project, {
      inspection: { hasExactGitTrackedPath: (_root, path) => path !== "src/b.ts" },
    }));
    expect(result.completed.map(({ path }) => path)).toEqual(["src/a.ts"]);
    expect(result.failedTarget).toMatchObject({ path: "src/b.ts", code: "trackedness-lost" });
    expect(result.notAttempted).toEqual(["src/c.ts"]);
  });

  it("maps later rename failure, cleans its temp, and never rolls back or writes the suffix", () => {
    const project = prepare(["a", "b", "c"].map((name) => ({
      path: `src/${name}.ts`, before: `${name}-before\n`,
    })));
    const failedPath = join(project.root, "src/b.ts");
    const result = halted(run(project, { atomicRename: (temp, target) => {
      if (target === failedPath) throw new Error("injected rename failure");
      renameSync(temp, target);
    } }));
    expect(result.completed.map(({ path }) => path)).toEqual(["src/a.ts"]);
    expect(result.failedTarget).toMatchObject({ path: "src/b.ts", code: "apply-failed" });
    expect(result.notAttempted).toEqual(["src/c.ts"]);
    expect(readFileSync(join(project.root, "src/a.ts"), "utf8")).toContain("replacement for");
    expect(readFileSync(join(project.root, "src/b.ts"), "utf8")).toBe("b-before\n");
    expect(readFileSync(join(project.root, "src/c.ts"), "utf8")).toBe("c-before\n");
    expect(readdirSync(join(project.root, "src")).filter((name) => name.includes(".tmp-"))).toEqual([]);
  });

  it("preserves target file modes", () => {
    const project = prepare([
      { path: "src/a.ts", before: "a\n" }, { path: "src/b.ts", before: "b\n" },
    ]);
    chmodSync(join(project.root, "src/a.ts"), 0o640);
    expect(run(project).kind).toBe("completed");
    expect(lstatSync(join(project.root, "src/a.ts")).mode & 0o7777).toBe(0o640);
  });

  it("leaves non-target files unchanged and does not run project verification", () => {
    const marker = "verification-was-run";
    const project = prepare([
      { path: "src/a.ts", before: "a\n" }, { path: "src/b.ts", before: "b\n" },
    ], `node -e "require('fs').writeFileSync('${marker}', 'ran')"`);
    const outsideSet = join(project.root, "src/extra.ts");
    writeFileSync(outsideSet, "extra-before\n");
    expect(run(project).kind).toBe("completed");
    expect(readFileSync(outsideSet, "utf8")).toBe("extra-before\n");
    expect(() => lstatSync(join(project.root, marker))).toThrow();
  });

  it("delivers callbacks synchronously in target order", () => {
    const project = prepare([
      { path: "src/z.ts", before: "z\n" }, { path: "src/a.ts", before: "a\n" },
    ]);
    const order: string[] = [];
    const result = run(project, {
      atomicRename: (temp, target) => { order.push(`write:${target}`); renameSync(temp, target); },
      onTargetOutcome: (event) => { order.push(`event:${event.path}`); },
    });
    expect(result.kind).toBe("completed");
    expect(order.map((entry) => entry.startsWith("event:") ? entry : `write:${entry.slice(entry.lastIndexOf("/") + 1)}`))
      .toEqual(["write:a.ts", "event:src/a.ts", "write:z.ts", "event:src/z.ts"]);
  });

  it("stops after callback failure but keeps a successful rename completed", () => {
    const project = prepare([
      { path: "src/a.ts", before: "a\n" }, { path: "src/b.ts", before: "b\n" },
    ]);
    const result = halted(run(project, { onTargetOutcome: () => { throw new Error("callback failed"); } }));
    expect(result.completed.map(({ path }) => path)).toEqual(["src/a.ts"]);
    expect(result.failedTarget).toBeNull();
    expect(result.halt).toMatchObject({ stage: "outcome-callback", path: "src/a.ts" });
    expect(result.notAttempted).toEqual(["src/b.ts"]);
  });

  it("preserves refusal when reporting that refusal also fails", () => {
    const project = prepare([
      { path: "src/a.ts", before: "a\n" }, { path: "src/b.ts", before: "b\n" },
    ]);
    writeFileSync(join(project.root, "src/a.ts"), "stale\n");
    const result = halted(run(project, { onTargetOutcome: () => { throw new Error("callback failed"); } }));
    expect(result.failedTarget).toMatchObject({ path: "src/a.ts", code: "stale-preimage" });
    expect(result.halt).toMatchObject({ stage: "outcome-callback", path: "src/a.ts" });
    expect(result.notAttempted).toEqual(["src/b.ts"]);
  });

  it("rejects a plan/snapshot set mismatch before any write", () => {
    const project = prepare([
      { path: "src/a.ts", before: "a\n" }, { path: "src/b.ts", before: "b\n" },
    ]);
    const result = halted(executeM4WriteCoordinator({
      projectRoot: project.root,
      plan: project.plan,
      eligibleSet: { kind: "validated", targets: project.eligibleSet.targets.slice(0, 1) },
    }));
    expect(result.completed).toEqual([]);
    expect(result.failedTarget).toBeNull();
    expect(result.notAttempted).toEqual(["src/a.ts", "src/b.ts"]);
    expect(readFileSync(join(project.root, "src/a.ts"), "utf8")).toBe("a\n");
  });
});
