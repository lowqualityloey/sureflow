import { createHash } from "node:crypto";
import {
  chmodSync,
  cpSync,
  lstatSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  applyBoundedReplacement,
  type BoundedReplacementDependencies,
  type TrackedTargetProbe,
} from "../src/boundedReplacement.js";
import { DEFAULT_M1_POLICY } from "../src/policy.js";
import type { DetectedNodeTypeScriptProject } from "../src/projectDetection.js";
import {
  loadValidatedExecutionPlan,
  M2_ADAPTER_ID,
} from "../src/taskContract.js";
import type { ValidatedExecutionPlan } from "../src/taskContract.js";

const fixtureRoot = resolve("fixtures/m2-node-ts-project");
const replacementContent = "export function formatDisplayName(value: string): string {\n  return value.trim();\n}\n";
const temporaryRoots: string[] = [];

function temporaryProject(): {
  root: string;
  plan: ValidatedExecutionPlan;
  project: DetectedNodeTypeScriptProject;
  targetPath: string;
} {
  const root = mkdtempSync(join(tmpdir(), "sureflow-m2-t4-"));
  temporaryRoots.push(root);
  cpSync(fixtureRoot, root, { recursive: true });
  mkdirSync(join(root, ".sureflow"), { recursive: true });
  writeFileSync(
    join(root, ".sureflow/task.json"),
    readFileSync(join(fixtureRoot, "task.example.json")),
  );
  const plan = loadValidatedExecutionPlan(root);
  const targetPath = plan.targetPath;
  return {
    root,
    plan,
    targetPath,
    project: {
      adapter: M2_ADAPTER_ID,
      root: resolve(root),
      manifestPath: "package.json",
      lockfilePath: "package-lock.json",
      tsconfigPath: "tsconfig.json",
      targetPath,
      supportedChecks: ["typecheck", "test", "lint", "build"],
    },
  };
}

function successfulTrackedProbe(calls: string[][] = []): TrackedTargetProbe {
  return (cwd, targetPath) => {
    calls.push([cwd, targetPath]);
    return { status: 0, signal: null };
  };
}

function dependencies(
  trackedTargetProbe: TrackedTargetProbe = successfulTrackedProbe(),
  atomicRename?: BoundedReplacementDependencies["atomicRename"],
): BoundedReplacementDependencies {
  if (atomicRename === undefined) return { trackedTargetProbe };
  return { trackedTargetProbe, atomicRename };
}

function planWith(
  plan: ValidatedExecutionPlan,
  overrides: Partial<ValidatedExecutionPlan>,
): ValidatedExecutionPlan {
  return Object.freeze({ ...plan, ...overrides });
}

function projectWith(
  project: DetectedNodeTypeScriptProject,
  overrides: Partial<DetectedNodeTypeScriptProject>,
): DetectedNodeTypeScriptProject {
  return Object.freeze({ ...project, ...overrides });
}

function targetBytes(root: string, targetPath: string): Buffer {
  return readFileSync(join(root, targetPath));
}

function targetTemporaryFiles(root: string): string[] {
  return readdirSync(join(root, "src")).filter((name) => name.startsWith(".displayName.ts.tmp-"));
}

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe("M2-T4 bounded replacement", () => {
  it("applies the plan-owned replacement and returns exact before/after digests", () => {
    const { root, plan, project, targetPath } = temporaryProject();
    const before = targetBytes(root, targetPath);
    const replacementPlan = planWith(plan, { replacementContent });

    const result = applyBoundedReplacement(
      project,
      replacementPlan,
      DEFAULT_M1_POLICY,
      dependencies(),
    );

    expect(result).toEqual({
      kind: "applied",
      path: targetPath,
      beforeSha256: createHash("sha256").update(before).digest("hex"),
      afterSha256: createHash("sha256").update(Buffer.from(replacementContent, "utf8")).digest("hex"),
    });
    expect(readFileSync(join(root, targetPath))).toEqual(Buffer.from(replacementContent, "utf8"));
  });

  it("returns the immutable plan target rather than an alternate physical path", () => {
    const { plan, project } = temporaryProject();
    const result = applyBoundedReplacement(
      project,
      planWith(plan, { replacementContent }),
      DEFAULT_M1_POLICY,
      dependencies(),
    );

    expect(result.kind).toBe("applied");
    if (result.kind === "applied") expect(result.path).toBe(plan.targetPath);
  });

  it("writes replacement bytes exactly as UTF-8 without newline changes", () => {
    const { root, plan, project, targetPath } = temporaryProject();
    const exactContent = "héllo\n\n";

    const result = applyBoundedReplacement(
      project,
      planWith(plan, { replacementContent: exactContent }),
      DEFAULT_M1_POLICY,
      dependencies(),
    );

    expect(result.kind).toBe("applied");
    expect(readFileSync(join(root, targetPath))).toEqual(Buffer.from(exactContent, "utf8"));
  });

  it("refuses a stale preimage without mutating the target", () => {
    const { root, plan, project, targetPath } = temporaryProject();
    const before = targetBytes(root, targetPath);
    const result = applyBoundedReplacement(
      project,
      planWith(plan, { expectedBeforeSha256: "0".repeat(64), replacementContent }),
      DEFAULT_M1_POLICY,
      dependencies(),
    );

    expect(result.kind).toBe("refused");
    if (result.kind === "refused") expect(result.reason).toContain("preimage");
    expect(targetBytes(root, targetPath)).toEqual(before);
  });

  it.each([
    ["DENY", { allowlist: [], protectedOperations: [] }],
    ["REQUIRE_APPROVAL", { allowlist: ["repo.write"], protectedOperations: ["repo.write"] }],
  ] as const)("refuses %s policy before project mutation", (_name, policy) => {
    const { root, plan, project, targetPath } = temporaryProject();
    const before = targetBytes(root, targetPath);
    const calls: string[][] = [];

    const result = applyBoundedReplacement(
      project,
      planWith(plan, { replacementContent }),
      policy,
      dependencies(successfulTrackedProbe(calls)),
    );

    expect(result.kind).toBe("refused");
    expect(calls).toEqual([]);
    expect(targetBytes(root, targetPath)).toEqual(before);
  });

  it("refuses an untracked target before replacement", () => {
    const { root, plan, project, targetPath } = temporaryProject();
    const before = targetBytes(root, targetPath);
    const result = applyBoundedReplacement(
      project,
      planWith(plan, { replacementContent }),
      DEFAULT_M1_POLICY,
      dependencies(() => ({ status: 1, signal: null })),
    );

    expect(result.kind).toBe("refused");
    if (result.kind === "refused") expect(result.reason).toContain("Git-tracked");
    expect(targetBytes(root, targetPath)).toEqual(before);
  });

  it.each([
    ["non-zero", { status: 2, signal: null }],
    ["spawn error", { status: null, signal: null, error: new Error("spawn") }],
    ["signal", { status: null, signal: "SIGTERM" as const }],
  ] as const)("refuses a Git trackedness probe %s", (_name, probeResult) => {
    const { root, plan, project, targetPath } = temporaryProject();
    const before = targetBytes(root, targetPath);
    const result = applyBoundedReplacement(
      project,
      planWith(plan, { replacementContent }),
      DEFAULT_M1_POLICY,
      dependencies(() => probeResult),
    );

    expect(result.kind).toBe("refused");
    expect(targetBytes(root, targetPath)).toEqual(before);
  });

  it.each([
    ["target", { targetPath: "src/other.ts" }],
    ["adapter", { adapter: "forged-adapter" }],
    ["operation", { operation: "arbitrary-write" }],
  ] as const)("refuses inconsistent %s authority before mutation", (_name, override) => {
    const { root, plan, project, targetPath } = temporaryProject();
    const before = targetBytes(root, targetPath);
    const candidatePlan = planWith(plan, override as Partial<ValidatedExecutionPlan>);

    const result = applyBoundedReplacement(
      project,
      candidatePlan,
      DEFAULT_M1_POLICY,
      dependencies(),
    );

    expect(result.kind).toBe("refused");
    expect(targetBytes(root, targetPath)).toEqual(before);
  });

  it("refuses a missing target and never creates it", () => {
    const { root, plan, project } = temporaryProject();
    const missingTarget = "src/missing.ts";
    const result = applyBoundedReplacement(
      projectWith(project, { targetPath: missingTarget }),
      planWith(plan, { targetPath: missingTarget, replacementContent }),
      DEFAULT_M1_POLICY,
      dependencies(),
    );

    expect(result.kind).toBe("refused");
    if (result.kind === "refused") expect(result.reason).toContain("does not exist");
    expect(() => lstatSync(join(root, missingTarget))).toThrow();
  });

  it("refuses a directory target without mutation", () => {
    const { plan, project } = temporaryProject();
    const directoryTarget = "src";
    const result = applyBoundedReplacement(
      projectWith(project, { targetPath: directoryTarget }),
      planWith(plan, { targetPath: directoryTarget, replacementContent }),
      DEFAULT_M1_POLICY,
      dependencies(),
    );

    expect(result.kind).toBe("refused");
    if (result.kind === "refused") expect(result.reason).toContain("regular file");
  });

  it("refuses a non-UTF-8 target without mutation", () => {
    const { root, plan, project, targetPath } = temporaryProject();
    const invalidBytes = Buffer.from([0xff, 0xfe, 0xfd]);
    writeFileSync(join(root, targetPath), invalidBytes);
    const result = applyBoundedReplacement(
      project,
      planWith(plan, {
        expectedBeforeSha256: createHash("sha256").update(invalidBytes).digest("hex"),
        replacementContent,
      }),
      DEFAULT_M1_POLICY,
      dependencies(),
    );

    expect(result.kind).toBe("refused");
    if (result.kind === "refused") expect(result.reason).toContain("UTF-8");
    expect(targetBytes(root, targetPath)).toEqual(invalidBytes);
  });

  it.each([".git/config", ".sureflow/task.json"])(
    "refuses control-plane target %s",
    (targetPath) => {
      const { plan, project } = temporaryProject();
      const result = applyBoundedReplacement(
        projectWith(project, { targetPath }),
        planWith(plan, { targetPath, replacementContent }),
        DEFAULT_M1_POLICY,
        dependencies(),
      );

      expect(result.kind).toBe("refused");
    },
  );

  it.each([
    ["../outside.ts", "traversal"],
    ["/absolute.ts", "absolute"],
    ["src/./displayName.ts", "dot segment"],
    ["src\\displayName.ts", "backslash"],
  ])("refuses %s (%s) before mutation", (targetPath) => {
    const { plan, project } = temporaryProject();
    const result = applyBoundedReplacement(
      projectWith(project, { targetPath }),
      planWith(plan, { targetPath, replacementContent }),
      DEFAULT_M1_POLICY,
      dependencies(),
    );

    expect(result.kind).toBe("refused");
  });

  it("refuses an escaping symlink ancestor without mutation", () => {
    const { root, plan, project } = temporaryProject();
    const outside = mkdtempSync(join(tmpdir(), "sureflow-m2-t4-outside-"));
    temporaryRoots.push(outside);
    rmSync(join(root, "src"), { recursive: true, force: true });
    symlinkSync(outside, join(root, "src"), "dir");
    const result = applyBoundedReplacement(
      project,
      planWith(plan, { replacementContent }),
      DEFAULT_M1_POLICY,
      dependencies(),
    );

    expect(result.kind).toBe("refused");
    if (result.kind === "refused") expect(result.reason).toContain("symlink");
    expect(readdirSync(outside)).toEqual([]);
  });

  it("canonicalizes a symlinked project root before containment and writing", () => {
    const { root, plan, project, targetPath } = temporaryProject();
    const parent = mkdtempSync(join(tmpdir(), "sureflow-m2-t4-root-parent-"));
    temporaryRoots.push(parent);
    const rootLink = join(parent, "project-link");
    symlinkSync(root, rootLink, "dir");

    const result = applyBoundedReplacement(
      projectWith(project, { root: rootLink }),
      planWith(plan, { replacementContent }),
      DEFAULT_M1_POLICY,
      dependencies(),
    );

    expect(result.kind).toBe("applied");
    expect(readFileSync(join(root, targetPath))).toEqual(Buffer.from(replacementContent, "utf8"));
  });

  it("preserves the original relevant file mode", () => {
    const { root, plan, project, targetPath } = temporaryProject();
    chmodSync(join(root, targetPath), 0o640);

    const result = applyBoundedReplacement(
      project,
      planWith(plan, { replacementContent }),
      DEFAULT_M1_POLICY,
      dependencies(),
    );

    expect(result.kind).toBe("applied");
    expect(lstatSync(join(root, targetPath)).mode & 0o7777).toBe(0o640);
  });

  it("leaves no helper-owned temporary after successful replacement", () => {
    const { root, plan, project } = temporaryProject();
    const result = applyBoundedReplacement(
      project,
      planWith(plan, { replacementContent }),
      DEFAULT_M1_POLICY,
      dependencies(),
    );

    expect(result.kind).toBe("applied");
    expect(targetTemporaryFiles(root)).toEqual([]);
  });

  it("cleans only the owned temporary after an injected pre-rename failure", () => {
    const { root, plan, project, targetPath } = temporaryProject();
    const before = targetBytes(root, targetPath);
    const result = applyBoundedReplacement(
      project,
      planWith(plan, { replacementContent }),
      DEFAULT_M1_POLICY,
      dependencies(successfulTrackedProbe(), () => {
        throw new Error("injected rename failure");
      }),
    );

    expect(result.kind).toBe("refused");
    if (result.kind === "refused") expect(result.reason).toContain("failed");
    expect(targetBytes(root, targetPath)).toEqual(before);
    expect(targetTemporaryFiles(root)).toEqual([]);
  });

  it("uses only the fixed tracked-file probe with canonical cwd and target", () => {
    const { root, plan, project } = temporaryProject();
    const calls: string[][] = [];
    const result = applyBoundedReplacement(
      project,
      planWith(plan, { replacementContent }),
      DEFAULT_M1_POLICY,
      dependencies(successfulTrackedProbe(calls)),
    );

    expect(result.kind).toBe("applied");
    expect(calls).toEqual([[resolve(root), plan.targetPath]]);
  });

  it("does not execute npm or inspect whole-project Git scope", () => {
    const { root, plan, project, targetPath } = temporaryProject();
    const marker = join(root, "t4-unexpected-command-marker");
    writeFileSync(join(root, "package.json"), JSON.stringify({
      scripts: {
        typecheck: `node -e "require('fs').writeFileSync('${marker}', 'npm')"`,
        test: `node -e "require('fs').writeFileSync('${marker}', 'npm')"`,
        lint: `node -e "require('fs').writeFileSync('${marker}', 'npm')"`,
        build: `node -e "require('fs').writeFileSync('${marker}', 'npm')"`,
      },
    }));

    const result = applyBoundedReplacement(
      project,
      planWith(plan, { replacementContent }),
      DEFAULT_M1_POLICY,
      dependencies(),
    );

    expect(result.kind).toBe("applied");
    expect(() => lstatSync(marker)).toThrow();
    expect(targetBytes(root, targetPath)).toEqual(Buffer.from(replacementContent, "utf8"));
  });
});
