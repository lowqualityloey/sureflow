import {
  chmodSync,
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  symlinkSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { createHash } from "node:crypto";
import { execFileSync, spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { cliExecutable } from "./helpers/cliArtifact.js";
import {
  acquireMutationLock,
  executionLockPath,
  ensureExecutionLockParent,
  mutationLockExists,
  releaseMutationLock,
  type MutationLock,
} from "../src/mutationLock.js";
import { DEFAULT_M1_POLICY } from "../src/policy.js";
import { applyBoundedReplacement } from "../src/boundedReplacement.js";
import { inspectPostWriteScope } from "../src/projectScope.js";
import { detectProject } from "../src/projectDetection.js";
import {
  runM2Task,
  verifyM2Task,
  type M2RunTaskDependencies,
} from "../src/m2Orchestration.js";
import { readEvidence } from "../src/evidenceStore.js";
import { loadValidatedExecutionPlan } from "../src/taskContract.js";
import { readRuntimeState } from "../src/stateReader.js";
import type { M2VerificationProfile, ValidatedExecutionPlan } from "../src/taskContract.js";
import type { VerificationStepResult } from "../src/verificationAdapter.js";

const fixtureRoot = resolve("fixtures/m2-node-ts-project");
const t0FixtureRoot = resolve("fixtures/t0-basic");
const temporaryRoots: string[] = [];
const temporarySupportRoots: string[] = [];
const TASK_ID = "TASK-M2-FIXTURE-DISPLAY-NAME";
const TARGET_PATH = "src/displayName.ts";

interface FixtureContract {
  readonly schemaVersion: 1;
  readonly taskId: string;
  readonly adapter: "node-typescript/npm-scripts-v1";
  readonly operation: "replace-existing-file";
  readonly targetPath: string;
  readonly expectedBeforeSha256: string;
  readonly replacementContent: string;
  readonly requiredVerification: readonly M2VerificationProfile[];
}

interface PublicCliResult {
  readonly code: number;
  readonly stdout: string;
  readonly stderr: string;
}

type VerificationKind = "failed" | "spawn-error" | "terminated";

function git(root: string, args: readonly string[]): void {
  const result = spawnSync("git", [...args], {
    cwd: root,
    shell: false,
    stdio: "ignore",
  });
  if (result.status !== 0) throw new Error(`git ${args.join(" ")} failed`);
}

function publicCli(
  root: string,
  argv: readonly string[],
  env: NodeJS.ProcessEnv = process.env,
): PublicCliResult {
  try {
    const stdout = execFileSync("node", [cliExecutable(), ...argv], {
      cwd: root,
      shell: false,
      stdio: "pipe",
      encoding: "utf8",
      env,
    });
    return { code: 0, stdout, stderr: "" };
  } catch (error: unknown) {
    const failure = error as {
      readonly status?: number;
      readonly stdout?: string;
      readonly stderr?: string;
    };
    return {
      code: failure.status ?? 2,
      stdout: failure.stdout ?? "",
      stderr: failure.stderr ?? "",
    };
  }
}

function readFixtureContract(): FixtureContract {
  return JSON.parse(
    readFileSync(join(fixtureRoot, "task.example.json"), "utf8"),
  ) as FixtureContract;
}

function writeContract(root: string, update: Record<string, unknown> = {}): void {
  writeFileSync(
    join(root, ".sureflow/task.json"),
    `${JSON.stringify({ ...readFixtureContract(), ...update }, null, 2)}\n`,
    "utf8",
  );
}

function writeRawContract(root: string, content: string): void {
  writeFileSync(join(root, ".sureflow/task.json"), content, "utf8");
}

function setPolicy(
  root: string,
  allowlist: readonly string[],
  protectedOperations: readonly string[],
): void {
  writeFileSync(
    join(root, ".sureflow/policy/default.json"),
    `${JSON.stringify({ allowlist, protectedOperations }, null, 2)}\n`,
    "utf8",
  );
}

function initializePublicProject(root: string): void {
  const result = publicCli(root, ["init"]);
  expect(result.code, result.stderr).toBe(0);
}

function setupFixture(options: {
  readonly prepare?: (root: string) => void;
  readonly contract?: Record<string, unknown>;
} = {}): string {
  const root = mkdtempSync(join(tmpdir(), "sureflow-m2-t8-"));
  temporaryRoots.push(root);
  cpSync(fixtureRoot, root, { recursive: true });
  writeFileSync(join(root, ".gitignore"), "dist/\n", "utf8");
  options.prepare?.(root);
  git(root, ["init", "--initial-branch", "main"]);
  git(root, ["config", "user.email", "sureflow-t8@example.invalid"]);
  git(root, ["config", "user.name", "Sureflow T8"]);
  git(root, ["add", "."]);
  git(root, ["commit", "-m", "fixture baseline"]);
  initializePublicProject(root);
  writeContract(root, options.contract);
  return root;
}

function setupMinimalUnsupportedProject(): string {
  const root = mkdtempSync(join(tmpdir(), "sureflow-m2-t8-unsupported-"));
  temporaryRoots.push(root);
  mkdirSync(join(root, "src"), { recursive: true });
  writeFileSync(join(root, "package.json"), JSON.stringify({
    name: "unsupported-m2-project",
    private: true,
    scripts: { typecheck: "true", test: "true", lint: "true", build: "true" },
  }) + "\n", "utf8");
  writeFileSync(join(root, "tsconfig.json"), "{}\n", "utf8");
  writeFileSync(join(root, TARGET_PATH), readFileSync(join(fixtureRoot, TARGET_PATH)));
  git(root, ["init", "--initial-branch", "main"]);
  git(root, ["config", "user.email", "sureflow-t8@example.invalid"]);
  git(root, ["config", "user.name", "Sureflow T8"]);
  git(root, ["add", "."]);
  git(root, ["commit", "-m", "unsupported fixture baseline"]);
  initializePublicProject(root);
  writeContract(root);
  return root;
}

function setupT0Project(): string {
  const root = mkdtempSync(join(tmpdir(), "sureflow-m2-t8-t0-"));
  temporaryRoots.push(root);
  mkdirSync(join(root, "fixtures"), { recursive: true });
  cpSync(t0FixtureRoot, join(root, "fixtures/t0-basic"), { recursive: true });
  git(root, ["init", "--initial-branch", "main"]);
  git(root, ["config", "user.email", "sureflow-t8@example.invalid"]);
  git(root, ["config", "user.name", "Sureflow T8"]);
  git(root, ["add", "."]);
  git(root, ["commit", "-m", "T0 fixture baseline"]);
  initializePublicProject(root);
  return root;
}

function sourceBytes(root: string): Buffer {
  return readFileSync(join(root, TARGET_PATH));
}

function taskStatePath(root: string): string {
  return join(root, `.sureflow/state/tasks/${TASK_ID}.json`);
}

function taskStatus(root: string): string {
  return (JSON.parse(readFileSync(taskStatePath(root), "utf8")) as { readonly status: string }).status;
}

function sha256(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function successfulVerification(
  _project: unknown,
  plan: { readonly steps: readonly { readonly check: M2VerificationProfile }[] },
): Promise<readonly VerificationStepResult[]> {
  return Promise.resolve(
    plan.steps.map((step) => ({ check: step.check, kind: "passed" as const, exitCode: 0 as const })),
  );
}

function injectedVerification(
  plan: { readonly steps: readonly { readonly check: M2VerificationProfile }[] },
  kind: VerificationKind,
): readonly VerificationStepResult[] {
  return plan.steps.map((step, index) => {
    if (index === 0 && kind === "failed") return { check: step.check, kind, exitCode: 17 };
    if (index === 0 && kind === "spawn-error") return { check: step.check, kind };
    if (index === 0 && kind === "terminated") return { check: step.check, kind, signal: "SIGTERM" };
    return { check: step.check, kind: "passed" as const, exitCode: 0 as const };
  });
}

async function runInternal(
  root: string,
  dependencies: M2RunTaskDependencies = { runVerification: successfulVerification },
) {
  return runM2Task({ rootDir: root, requestedTaskId: TASK_ID }, dependencies);
}

function evidenceRecords(root: string) {
  return readEvidence(root).filter((entry) => entry.kind === "record").map((entry) => entry.record);
}

function projectVisibleStatusPaths(root: string): readonly string[] {
  const result = spawnSync(
    "git",
    ["status", "--porcelain=v1", "-z", "--untracked-files=all"],
    { cwd: root, shell: false, encoding: "utf8" },
  );
  return result.stdout
    .split("\0")
    .filter((entry) => entry.length > 0)
    .map((entry) => entry.slice(3))
    .filter((path) => !path.startsWith(".sureflow/"));
}

function snapshot(root: string): string {
  const entries: string[] = [];
  const walk = (directory: string, prefix: string): void => {
    for (const entry of readdirSync(directory, { withFileTypes: true }).sort((left, right) =>
      left.name.localeCompare(right.name))) {
      if (entry.name === ".git") continue;
      const absolute = join(directory, entry.name);
      const relative = `${prefix}${entry.name}`;
      if (entry.isDirectory()) {
        entries.push(`${relative}/`);
        walk(absolute, `${relative}/`);
      } else if (entry.isSymbolicLink()) {
        entries.push(`${relative}->${readFileSync(absolute, "utf8")}`);
      } else {
        entries.push(`${relative}:${readFileSync(absolute).toString("base64")}`);
      }
    }
  };
  walk(root, "");
  return entries.join("\n");
}

function makeNpmTrace(): { readonly env: NodeJS.ProcessEnv; readonly logPath: string } {
  const support = mkdtempSync(join(tmpdir(), "sureflow-m2-t8-npm-"));
  temporarySupportRoots.push(support);
  const bin = join(support, "bin");
  mkdirSync(bin);
  const logPath = join(support, "npm.log");
  const which = spawnSync("which", ["npm"], { encoding: "utf8", shell: false });
  if (which.status !== 0) throw new Error("npm executable is unavailable for T8 trace harness");
  const realNpm = which.stdout.trim();
  const wrapper = join(bin, "npm");
  writeFileSync(
    wrapper,
    "#!/bin/sh\nprintf '%s\\n' \"$*\" >> \"$SUREFLOW_T8_NPM_LOG\"\nexec \"$SUREFLOW_T8_REAL_NPM\" \"$@\"\n",
    "utf8",
  );
  chmodSync(wrapper, 0o755);
  return {
    logPath,
    env: {
      ...process.env,
      PATH: `${bin}:${process.env.PATH ?? ""}`,
      SUREFLOW_T8_NPM_LOG: logPath,
      SUREFLOW_T8_REAL_NPM: realNpm,
    },
  };
}

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) rmSync(root, { recursive: true, force: true });
  for (const root of temporarySupportRoots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe("M2-T8 independent public acceptance", () => {
  it("AC-M2.8 executes init, run, and verify through the public CLI", () => {
    const root = setupFixture();
    const trace = makeNpmTrace();
    const contract = readFixtureContract();
    const beforeCheck = spawnSync("npm", ["test"], {
      cwd: root,
      shell: false,
      stdio: ["ignore", "pipe", "pipe"],
      encoding: "utf8",
    });
    expect(beforeCheck.status).not.toBe(0);

    const runResult = publicCli(root, ["run", TASK_ID], trace.env);
    expect(runResult.code, runResult.stderr).toBe(0);
    expect(runResult.stdout).toContain("ACCEPT");
    expect(sourceBytes(root)).toEqual(Buffer.from(contract.replacementContent, "utf8"));
    expect(projectVisibleStatusPaths(root)).toEqual([TARGET_PATH]);
    expect(taskStatus(root)).toBe("accepted");

    const records = evidenceRecords(root);
    expect(records).toHaveLength(7);
    expect(records[0]).toMatchObject({
      taskId: TASK_ID,
      capability: "repo.read",
      target: ".sureflow/task.json",
      provenance: "control-plane-task-input",
    });
    expect(records[1]).toMatchObject({
      taskId: TASK_ID,
      capability: "repo.write",
      target: TARGET_PATH,
      result: `sha256:${contract.expectedBeforeSha256}->${sha256(Buffer.from(contract.replacementContent, "utf8"))}`,
      provenance: "bounded existing-file replacement",
    });
    expect(records[2]).toMatchObject({
      capability: "repo.read",
      target: "project-scope",
      result: "compliant",
    });
    expect(records.slice(3).map((record) => [record.capability, record.target, record.result])).toEqual([
      ["repo.verify", "node-typescript/npm-scripts-v1:typecheck", "passed"],
      ["repo.verify", "node-typescript/npm-scripts-v1:test", "passed"],
      ["repo.verify", "node-typescript/npm-scripts-v1:lint", "passed"],
      ["repo.verify", "node-typescript/npm-scripts-v1:build", "passed"],
    ]);
    expect(readRuntimeState(root).kind).toBe("ok");

    const evidenceBeforeVerify = readFileSync(join(root, ".sureflow/evidence/evidence.jsonl"));
    const treeBeforeVerify = snapshot(root);
    const verifyResult = publicCli(root, ["verify", TASK_ID], trace.env);
    expect(verifyResult.code, verifyResult.stderr).toBe(0);
    expect(verifyResult.stdout).toContain("PASS");
    expect(readFileSync(join(root, ".sureflow/evidence/evidence.jsonl"))).toEqual(evidenceBeforeVerify);
    expect(snapshot(root)).toBe(treeBeforeVerify);
    expect(readFileSync(trace.logPath, "utf8").trim().split("\n")).toEqual([
      "run typecheck",
      "test",
      "run lint",
      "run build",
    ]);
  });

  it("AC-M2.9 preserves the public T0 run and verify path", () => {
    const root = setupT0Project();
    const runResult = publicCli(root, ["run", "TASK-T0-BASIC"]);
    expect(runResult.code, runResult.stderr).toBe(0);
    const verifyResult = publicCli(root, ["verify", "TASK-T0-BASIC"]);
    expect(verifyResult.code, verifyResult.stderr).toBe(0);
    expect(verifyResult.stdout).toContain("PASS");
  });

  it("N1 halts an unsupported project before mutation", async () => {
    const root = setupMinimalUnsupportedProject();
    const before = sourceBytes(root);
    let verificationCalls = 0;
    const outcome = await runInternal(root, {
      runVerification: () => {
        verificationCalls += 1;
        return Promise.resolve([] as readonly VerificationStepResult[]);
      },
    });
    expect(outcome.kind).toBe("halted");
    expect(outcome.reason).toContain("project detection unsupported");
    expect(sourceBytes(root)).toEqual(before);
    expect(verificationCalls).toBe(0);
    expect(existsSync(taskStatePath(root))).toBe(false);
  });

  it("N2 halts when a required npm script is missing", async () => {
    const root = setupFixture({
      prepare: (projectRoot) => {
        const packageJson = JSON.parse(readFileSync(join(projectRoot, "package.json"), "utf8")) as { scripts: Record<string, string> };
        delete packageJson.scripts.build;
        writeFileSync(join(projectRoot, "package.json"), `${JSON.stringify(packageJson)}\n`, "utf8");
      },
    });
    const before = sourceBytes(root);
    const outcome = await runInternal(root);
    expect(outcome.kind).toBe("halted");
    expect(outcome.reason).toContain("project detection unsupported");
    expect(sourceBytes(root)).toEqual(before);
    expect(existsSync(taskStatePath(root))).toBe(false);
  });

  it.each([
    ["malformed JSON", (root: string) => { writeRawContract(root, "{malformed\n"); }],
    ["unknown field", (root: string) => { writeContract(root, { unknownAuthority: true }); }],
    ["duplicate verification entry", (root: string) => { writeContract(root, { requiredVerification: ["test", "test"] }); }],
    ["invalid enum", (root: string) => { writeContract(root, { operation: "arbitrary-write" }); }],
  ] as const)("N3 halts for %s without T0 fallback", (_label, corrupt) => {
    const root = setupFixture();
    corrupt(root);
    const before = sourceBytes(root);
    const result = publicCli(root, ["run", TASK_ID]);
    expect(result.code).toBe(2);
    expect(result.stderr).toContain("invalid M2 task contract");
    expect(sourceBytes(root)).toEqual(before);
    expect(existsSync(taskStatePath(root))).toBe(false);
  });

  it.each(["repo.read", "repo.write", "repo.verify"] as const)(
    "N4 preserves DENY and REQUIRE_APPROVAL for %s",
    async (blockedCapability) => {
      for (const decision of ["DENY", "REQUIRE_APPROVAL"] as const) {
        const root = setupFixture();
        const allowlist = DEFAULT_M1_POLICY.allowlist.filter((capability) => capability !== blockedCapability);
        setPolicy(
          root,
          decision === "DENY" ? allowlist : DEFAULT_M1_POLICY.allowlist,
          decision === "DENY" ? DEFAULT_M1_POLICY.protectedOperations : [blockedCapability],
        );
        const before = sourceBytes(root);
        const outcome = await runInternal(root);
        expect(outcome.kind).toBe("halted");
        expect(outcome.policyDecisions[blockedCapability]).toBe(decision);
        expect(outcome.reason).toContain(blockedCapability);
        expect(sourceBytes(root)).toEqual(before);
        expect(existsSync(taskStatePath(root))).toBe(false);
      }
    },
  );

  it.each([
    ["absolute path", "/tmp/outside.ts"],
    ["traversal", "../outside.ts"],
    ["git control-plane path", ".git/config"],
    ["sureflow control-plane path", ".sureflow/policy/default.json"],
    ["task contract path", ".sureflow/task.json"],
    ["directory", "src"],
    ["missing target", "src/missing.ts"],
  ] as const)("N5 rejects an unauthorized %s target", async (_label, targetPath) => {
    const root = setupFixture({ contract: { targetPath } });
    const before = sourceBytes(root);
    const outcome = await runInternal(root);
    expect(outcome.kind).toBe("halted");
    expect(sourceBytes(root)).toEqual(before);
    expect(existsSync(taskStatePath(root))).toBe(false);
  });

  it("N5 rejects an untracked target at the bounded replacement boundary", () => {
    const root = setupFixture({ contract: { targetPath: "src/untracked.ts" } });
    writeFileSync(join(root, "src/untracked.ts"), "export const untracked = true;\n", "utf8");
    const plan = loadValidatedExecutionPlan(root);
    const detected = detectProject(root, plan);
    expect(detected.kind).toBe("supported");
    if (detected.kind !== "supported") return;
    const result = applyBoundedReplacement(detected.project, plan, DEFAULT_M1_POLICY);
    expect(result.kind).toBe("refused");
    if (result.kind === "refused") expect(result.reason).toContain("Git-tracked");
  });

  it("N5 rejects a symlink escape without touching the outside target", async () => {
    const root = setupFixture({
      prepare: (projectRoot) => {
        const outside = mkdtempSync(join(tmpdir(), "sureflow-m2-t8-outside-"));
        temporarySupportRoots.push(outside);
        const outsideFile = join(outside, "outside.ts");
        writeFileSync(outsideFile, "export const outside = true;\n", "utf8");
        symlinkSync(outsideFile, join(projectRoot, "src/escape.ts"));
      },
      contract: { targetPath: "src/escape.ts" },
    });
    const outcome = await runInternal(root);
    expect(outcome.kind).toBe("halted");
    expect(outcome.reason).toContain("project detection");
    expect(existsSync(taskStatePath(root))).toBe(false);
  });

  it("N6 halts a dirty Git-visible baseline before verification", async () => {
    const root = setupFixture();
    writeFileSync(join(root, "README.md"), "unexpected\n", "utf8");
    let verificationCalls = 0;
    const outcome = await runInternal(root, {
      runVerification: () => {
        verificationCalls += 1;
        return Promise.resolve([] as readonly VerificationStepResult[]);
      },
    });
    expect(outcome.kind).toBe("halted");
    expect(outcome.reason).toContain("project baseline dirty");
    expect(verificationCalls).toBe(0);
    expect(existsSync(taskStatePath(root))).toBe(false);
  });

  it("N6 halts a stale target preimage before verification or mutation", async () => {
    const root = setupFixture();
    writeFileSync(join(root, TARGET_PATH), "externally changed\n", "utf8");
    git(root, ["add", TARGET_PATH]);
    git(root, ["commit", "-m", "external target change"]);
    let verificationCalls = 0;
    const outcome = await runInternal(root, {
      runVerification: () => {
        verificationCalls += 1;
        return Promise.resolve([] as readonly VerificationStepResult[]);
      },
    });
    expect(outcome.kind).toBe("halted");
    expect(outcome.reason).toContain("replacement preflight refused");
    expect(verificationCalls).toBe(0);
    expect(existsSync(taskStatePath(root))).toBe(false);
  });

  it("N7 rejects a pre-write single-target authority mismatch", () => {
    const root = setupFixture();
    const plan = loadValidatedExecutionPlan(root);
    const detected = detectProject(root, plan);
    expect(detected.kind).toBe("supported");
    if (detected.kind !== "supported") return;
    // The immutable plan target must match the detected target before any
    // project writer or post-write Git-scope inspection can proceed.
    const forgedPlan = { ...plan, targetPath: "src/other.ts" } as ValidatedExecutionPlan;
    const result = inspectPostWriteScope(detected.project, forgedPlan);
    expect(result.kind).toBe("invalid");
    if (result.kind === "invalid") expect(result.reason).toContain("detected project target differ");
  });

  it("N8 preserves a failed verification result, bounded bytes, and halted state", async () => {
    const root = setupFixture();
    const calls: string[] = [];
    const outcome = await runInternal(root, {
      runVerification: (_project, plan) => {
        calls.push("once");
        return Promise.resolve(injectedVerification(plan, "failed"));
      },
    });
    expect(outcome.kind).toBe("halted");
    expect(outcome.verdict).toBe("FAIL");
    expect(calls).toEqual(["once"]);
    expect(taskStatus(root)).toBe("halted");
    expect(sourceBytes(root)).toEqual(Buffer.from(readFixtureContract().replacementContent, "utf8"));
    expect(evidenceRecords(root).some((record) => record.result === "failed:17")).toBe(true);
  });

  it.each(["spawn-error", "terminated"] as const)(
    "N9 preserves a %s verification result without rollback",
    async (kind) => {
      const root = setupFixture();
      const outcome = await runInternal(root, {
        runVerification: (_project, plan) => Promise.resolve(injectedVerification(plan, kind)),
      });
      expect(outcome.kind).toBe("halted");
      expect(outcome.verdict).toBe("FAIL");
      expect(taskStatus(root)).toBe("halted");
      expect(sourceBytes(root)).toEqual(Buffer.from(readFixtureContract().replacementContent, "utf8"));
      expect(evidenceRecords(root).some((record) => record.result === (kind === "spawn-error" ? "spawn-error" : "terminated:SIGTERM"))).toBe(true);
    },
  );

  it("N10 halts on an unauthorized post-write Git-visible path and preserves both changes", async () => {
    const root = setupFixture();
    const unauthorizedPath = join(root, "unauthorized-by-script.txt");
    const outcome = await runInternal(root, {
      runVerification: (project, plan) => {
        writeFileSync(unauthorizedPath, "script mutation\n", "utf8");
        return successfulVerification(project, plan);
      },
    });
    expect(outcome.kind).toBe("halted");
    expect(outcome.verdict).toBe("FAIL");
    expect(taskStatus(root)).toBe("halted");
    expect(sourceBytes(root)).toEqual(Buffer.from(readFixtureContract().replacementContent, "utf8"));
    expect(readFileSync(unauthorizedPath, "utf8")).toBe("script mutation\n");
    expect(evidenceRecords(root).some((record) => record.target === "project-scope" && record.result.startsWith("violation:"))).toBe(true);
  });

  it("N11 returns UNKNOWN for missing evidence and reconciles accepted state to halted", async () => {
    const root = setupFixture();
    expect((await runInternal(root)).kind).toBe("accepted");
    const targetBefore = sourceBytes(root);
    unlinkSync(join(root, ".sureflow/evidence/evidence.jsonl"));
    const result = publicCli(root, ["verify", TASK_ID]);
    expect(result.code).toBe(2);
    expect(result.stderr, JSON.stringify(result)).toContain("UNKNOWN");
    expect(taskStatus(root)).toBe("halted");
    expect(sourceBytes(root)).toEqual(targetBefore);
  });

  it.each([
    ["corrupt evidence", (root: string) => { writeFileSync(join(root, ".sureflow/evidence/evidence.jsonl"), "{corrupt\n", "utf8"); }],
    ["stale contract digest", (root: string) => {
      const evidencePath = join(root, ".sureflow/evidence/evidence.jsonl");
      const lines = readFileSync(evidencePath, "utf8").trimEnd().split("\n");
      const first = JSON.parse(lines[0] ?? "null") as Record<string, unknown>;
      first.result = `sha256:${"0".repeat(64)};provenance=control-plane-task-input`;
      lines[0] = JSON.stringify(first);
      writeFileSync(evidencePath, `${lines.join("\n")}\n`, "utf8");
    }],
  ] as const)("N12 returns UNKNOWN for %s without latest-wins behavior", async (_label, mutate) => {
    const root = setupFixture();
    expect((await runInternal(root)).kind).toBe("accepted");
    mutate(root);
    const result = publicCli(root, ["verify", TASK_ID]);
    expect(result.code).toBe(2);
    expect(result.stderr, JSON.stringify(result)).toContain("UNKNOWN");
    expect(taskStatus(root)).toBe("halted");
  });

  it("N13 reports an unchanged replacement as FAIL, never PASS", async () => {
    const root = setupFixture();
    const original = sourceBytes(root).toString("utf8");
    writeContract(root, { replacementContent: original });
    const outcome = await runInternal(root);
    expect(outcome.kind).toBe("halted");
    expect(outcome.verdict).toBe("FAIL");
    expect(taskStatus(root)).toBe("halted");
  });

  it("N13 returns UNKNOWN when expected changed-path evidence is missing", async () => {
    const root = setupFixture();
    expect((await runInternal(root)).kind).toBe("accepted");
    const evidencePath = join(root, ".sureflow/evidence/evidence.jsonl");
    const lines = readFileSync(evidencePath, "utf8")
      .trimEnd()
      .split("\n")
      .filter((line) => !line.includes('"capability":"repo.write"'));
    writeFileSync(evidencePath, `${lines.join("\n")}\n`, "utf8");
    const result = publicCli(root, ["verify", TASK_ID]);
    expect(result.code).toBe(2);
    expect(result.stderr, JSON.stringify(result)).toContain("UNKNOWN");
    expect(taskStatus(root)).toBe("halted");
  });

  it("N14 refuses replay when authoritative task state already exists", async () => {
    const root = setupFixture();
    expect((await runInternal(root)).kind).toBe("accepted");
    const before = sourceBytes(root);
    const replay = await runInternal(root);
    expect(replay.kind).toBe("halted");
    expect(replay.reason).toContain("task state already exists");
    expect(sourceBytes(root)).toEqual(before);
  });

  it("N14 refuses replay when terminal same-task evidence already exists", async () => {
    const root = setupFixture();
    expect((await runInternal(root)).kind).toBe("accepted");
    unlinkSync(taskStatePath(root));
    const replay = await runInternal(root);
    expect(replay.kind).toBe("halted");
    expect(replay.reason).toContain("terminal evidence");
  });

  it("N15 halts before write when execution.lock already exists", async () => {
    const root = setupFixture();
    ensureExecutionLockParent(root);
    const lock = acquireMutationLock(root, "run");
    try {
      const before = sourceBytes(root);
      const outcome = await runInternal(root);
      expect(outcome.kind).toBe("halted");
      expect(outcome.reason).toContain("execution.lock");
      expect(sourceBytes(root)).toEqual(before);
    } finally {
      releaseMutationLock(lock);
    }
  });

  it("N15 never reports acceptance after a release-owner replacement race", async () => {
    const root = setupFixture();
    let replacement: MutationLock | undefined;
    try {
      const outcome = await runInternal(root, {
        onPhase: (phase) => {
          if (phase === "verification-complete") {
            unlinkSync(executionLockPath(root));
            replacement = acquireMutationLock(root, "verify");
          }
        },
      });
      expect(outcome.kind).toBe("halted");
      expect(outcome.reason).toContain("ownership changed");
      expect(outcome.kind).not.toBe("accepted");
      expect(mutationLockExists(root)).toBe(true);
      expect(sourceBytes(root)).toEqual(Buffer.from(readFixtureContract().replacementContent, "utf8"));
    } finally {
      if (replacement !== undefined) releaseMutationLock(replacement);
    }
  });

  it("N16 records integrity-mismatch and halts when the contract changes mid-run", async () => {
    const root = setupFixture();
    const outcome = await runInternal(root, {
      onPhase: (phase) => {
        if (phase === "verification-complete") {
          writeContract(root, { replacementContent: "mutated contract\n" });
        }
      },
    });
    expect(outcome.kind).toBe("halted");
    expect(outcome.verdict).toBe("FAIL");
    expect(taskStatus(root)).toBe("halted");
    expect(sourceBytes(root)).toEqual(Buffer.from(readFixtureContract().replacementContent, "utf8"));
    expect(evidenceRecords(root).some((record) => record.result.startsWith("integrity-mismatch:"))).toBe(true);
  });
});

describe("M2-T8 acceptance helpers", () => {
  it("keeps read-only verification evidence independent from project writes", async () => {
    const root = setupFixture();
    expect((await runInternal(root)).kind).toBe("accepted");
    const before = snapshot(root);
    const outcome = verifyM2Task({ rootDir: root, requestedTaskId: TASK_ID });
    expect(outcome.kind).toBe("verified");
    expect(outcome.verdict).toBe("PASS");
    expect(snapshot(root)).toBe(before);
  });
});
