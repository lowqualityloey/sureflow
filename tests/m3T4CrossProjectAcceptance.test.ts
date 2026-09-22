import { createHash } from "node:crypto";
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { cliExecutable } from "./helpers/cliArtifact.js";
import { readEvidence } from "../src/evidenceStore.js";
import {
  digestArgv,
  digestInputBindingV1,
  digestResolvedPlanV1,
  encodeExecutionProvenanceV2,
  parseExecutionProvenanceV2,
  parseInputBindingV1,
} from "../src/evidenceV2.js";
import { mutationLockExists } from "../src/mutationLock.js";
import { M3_ADAPTER_CONTRACT_VERSION } from "../src/projectAdapter.js";
import { readRuntimeState } from "../src/stateReader.js";
import {
  M2_ADAPTER_ID,
  M2_REPLACEMENT_OPERATION,
  M2_TASK_CONTRACT_SCHEMA_VERSION,
  M3_PNPM_ADAPTER_ID,
  type M3AdapterId,
} from "../src/taskContract.js";

type ProjectKind = "npm" | "pnpm";

interface CommandResult {
  readonly code: number;
  readonly stdout: string;
  readonly stderr: string;
}

const npmFixtureRoot = resolve("fixtures/m2-node-ts-project");
const pnpmFixtureRoot = resolve("fixtures/m3-pnpm-node-ts-project");
const temporaryRoots: string[] = [];
const NPM_TASK_ID = "TASK-M2-FIXTURE-DISPLAY-NAME";
const PNPM_TASK_ID = "TASK-M3-T4-PNPM-DISPLAY-NAME";
const TARGET_PATH = "src/displayName.ts";
const REPLACEMENT_CONTENT =
  'export function formatDisplayName(value: string): string {\n  return value.trim().replace(/\\s+/gu, "-");\n}\n';

function sha256(value: Uint8Array): string {
  return createHash("sha256").update(value).digest("hex");
}

function adapterFor(kind: ProjectKind): M3AdapterId {
  return kind === "npm" ? M2_ADAPTER_ID : M3_PNPM_ADAPTER_ID;
}

function managerFor(kind: ProjectKind): "npm" | "pnpm" {
  return kind;
}

function taskIdFor(kind: ProjectKind): string {
  return kind === "npm" ? NPM_TASK_ID : PNPM_TASK_ID;
}

function fixtureFor(kind: ProjectKind): string {
  return kind === "npm" ? npmFixtureRoot : pnpmFixtureRoot;
}

function lockfileFor(kind: ProjectKind): "package-lock.json" | "pnpm-lock.yaml" {
  return kind === "npm" ? "package-lock.json" : "pnpm-lock.yaml";
}

function argvFor(check: string): readonly string[] {
  return check === "test" ? ["test"] : ["run", check];
}

function runCommand(command: string, args: readonly string[], cwd: string): CommandResult {
  const result = spawnSync(command, [...args], {
    cwd,
    env: process.env,
    encoding: "utf8",
    shell: false,
  });
  return {
    code: result.status ?? 2,
    stdout: result.stdout,
    stderr: result.stderr,
  };
}

function publicCli(root: string, args: readonly string[]): CommandResult {
  return runCommand(process.execPath, [cliExecutable(), ...args], root);
}

function git(root: string, args: readonly string[]): void {
  const result = spawnSync("git", [...args], { cwd: root, shell: false, stdio: "ignore" });
  if (result.status !== 0) throw new Error(`git ${args.join(" ")} failed`);
}

function writeContract(
  root: string,
  kind: ProjectKind,
  overrides: Readonly<Record<string, unknown>> = {},
): void {
  mkdirSync(join(root, ".sureflow"), { recursive: true });
  const contract = {
    schemaVersion: M2_TASK_CONTRACT_SCHEMA_VERSION,
    taskId: taskIdFor(kind),
    adapter: adapterFor(kind),
    operation: M2_REPLACEMENT_OPERATION,
    targetPath: TARGET_PATH,
    expectedBeforeSha256: sha256(readFileSync(join(root, TARGET_PATH))),
    replacementContent: REPLACEMENT_CONTENT,
    requiredVerification: ["typecheck", "test", "lint", "build"],
    ...overrides,
  };
  writeFileSync(join(root, ".sureflow/task.json"), `${JSON.stringify(contract, null, 2)}\n`, "utf8");
}

function setupProject(
  kind: ProjectKind,
  prepare: (root: string) => void = () => undefined,
): string {
  const root = mkdtempSync(join(tmpdir(), `sureflow-m3-t4-${kind}-`));
  temporaryRoots.push(root);
  cpSync(fixtureFor(kind), root, { recursive: true });
  prepare(root);
  git(root, ["init", "--initial-branch", "main"]);
  git(root, ["config", "user.email", "sureflow-m3-t4@example.invalid"]);
  git(root, ["config", "user.name", "Sureflow M3-T4"]);
  git(root, ["add", "."]);
  git(root, ["commit", "-m", "fixture baseline"]);
  const init = publicCli(root, ["init"]);
  if (init.code !== 0) throw new Error(`fixture init failed: ${init.stderr}`);
  writeContract(root, kind);
  return root;
}

function snapshot(root: string): string {
  const entries: string[] = [];
  const walk = (directory: string, prefix: string): void => {
    for (const entry of readdirSync(directory, { withFileTypes: true }).sort((a, b) =>
      a.name.localeCompare(b.name))) {
      if (entry.name === ".git") continue;
      const absolute = join(directory, entry.name);
      const relative = `${prefix}${entry.name}`;
      if (entry.isDirectory()) {
        entries.push(`${relative}/`);
        walk(absolute, `${relative}/`);
      } else {
        entries.push(`${relative}:${readFileSync(absolute).toString("base64")}`);
      }
    }
  };
  walk(root, "");
  return entries.join("\n");
}

function visiblePaths(root: string): readonly string[] {
  const result = spawnSync(
    "git",
    ["status", "--porcelain=v1", "-z", "--untracked-files=all"],
    { cwd: root, encoding: "utf8", shell: false },
  );
  return result.stdout
    .split("\0")
    .filter((entry) => entry.length > 0)
    .map((entry) => entry.slice(3))
    .filter((path) => !path.startsWith(".sureflow/"));
}

function evidenceRecords(root: string) {
  return readEvidence(root)
    .filter((entry) => entry.kind === "record")
    .map((entry) => entry.record);
}

function taskStatus(root: string, taskId: string): string {
  const task = JSON.parse(
    readFileSync(join(root, `.sureflow/state/tasks/${taskId}.json`), "utf8"),
  ) as { readonly status?: unknown };
  return typeof task.status === "string" ? task.status : "";
}

function assertPositiveProject(kind: ProjectKind): void {
  const root = setupProject(kind);
  const manager = managerFor(kind);
  const taskId = taskIdFor(kind);
  const beforePreflight = snapshot(root);
  const preflight = publicCli(root, ["preflight", taskId]);
  expect(preflight.code, preflight.stderr).toBe(0);
  expect(preflight.stdout).toContain("ELIGIBLE");
  expect(snapshot(root)).toBe(beforePreflight);
  expect(mutationLockExists(root)).toBe(false);
  expect(existsSync(join(root, ".sureflow/evidence/evidence.jsonl"))).toBe(false);
  expect(existsSync(join(root, ".sureflow/events/events.jsonl"))).toBe(false);

  const beforeTest = runCommand(manager, ["test"], root);
  expect(beforeTest.code).not.toBe(0);

  const run = publicCli(root, ["run", taskId]);
  expect(run.code, run.stderr).toBe(0);
  expect(run.stdout).toContain("ACCEPT");
  expect(readFileSync(join(root, TARGET_PATH), "utf8")).toBe(REPLACEMENT_CONTENT);
  expect(taskStatus(root, taskId)).toBe("accepted");
  expect(readRuntimeState(root).kind).toBe("ok");
  expect(visiblePaths(root)).toEqual([TARGET_PATH]);
  expect(existsSync(join(root, "node_modules"))).toBe(false);
  expect(existsSync(join(root, ".pnpm-store"))).toBe(false);

  const status = publicCli(root, ["status"]);
  expect(status.code, status.stderr).toBe(0);
  expect(status.stdout).toContain("accepted");
  const beforeVerify = snapshot(root);
  const verify = publicCli(root, ["verify", taskId]);
  expect(verify.code, verify.stderr).toBe(0);
  expect(verify.stdout).toContain("PASS");
  expect(snapshot(root)).toBe(beforeVerify);
  expect(visiblePaths(root)).toEqual([TARGET_PATH]);
  expect(mutationLockExists(root)).toBe(false);

  const records = evidenceRecords(root);
  const bindingRecords = records.filter(
    (record) =>
      record.capability === "repo.read" &&
      record.target === "verification-input-binding" &&
      record.provenance === "verification-input-binding-v1",
  );
  expect(bindingRecords).toHaveLength(1);
  const bindingRecord = bindingRecords[0];
  if (bindingRecord === undefined) return;
  const binding = parseInputBindingV1(bindingRecord.result);
  expect(binding).not.toBeNull();
  if (binding === null) return;
  const bindingDigest = digestInputBindingV1(bindingRecord.result);
  expect(binding).toMatchObject({
    manifestPath: "package.json",
    lockfilePath: lockfileFor(kind),
    tsconfigPath: "tsconfig.json",
  });
  expect(binding.manifestSha256).toBe(sha256(readFileSync(join(root, "package.json"))));
  expect(binding.lockfileSha256).toBe(sha256(readFileSync(join(root, lockfileFor(kind)))));
  expect(binding.tsconfigSha256).toBe(sha256(readFileSync(join(root, "tsconfig.json"))));
  expect(binding.planDigest).toBe(
    digestResolvedPlanV1({
      adapterId: adapterFor(kind),
      adapterContractVersion: M3_ADAPTER_CONTRACT_VERSION,
      executable: manager,
      cwdRole: "project-root",
      steps: (["typecheck", "test", "lint", "build"] as const).map((check) => ({
        check,
        argv: argvFor(check),
      })),
    }),
  );

  const verifyRecords = records.filter((record) => record.capability === "repo.verify");
  expect(verifyRecords).toHaveLength(4);
  for (const record of verifyRecords) {
    expect(record.schemaVersion).toBe(2);
    if (record.schemaVersion !== 2) continue;
    const check = record.target.slice(`${adapterFor(kind)}:`.length);
    expect(["typecheck", "test", "lint", "build"]).toContain(check);
    const argv = argvFor(check);
    expect(record.executionContext).toMatchObject({
      adapterId: adapterFor(kind),
      executable: manager,
      argv,
      cwdRole: "project-root",
      stepLimitSeconds: 120,
      overallBudgetSeconds: 300,
      terminationGraceSeconds: 5,
      terminalCause: "passed",
    });
    expect(record.executionContext.argvDigest).toBe(digestArgv(argv));
    expect(parseExecutionProvenanceV2(record.provenance)).toBe(bindingDigest);
    expect(record.provenance).toBe(encodeExecutionProvenanceV2(bindingDigest));
  }
}

function assertStructuralRejection(kind: ProjectKind, prepare: (root: string) => void): void {
  const root = setupProject(kind);
  prepare(root);
  const taskId = taskIdFor(kind);
  const before = snapshot(root);
  const preflight = publicCli(root, ["preflight", taskId]);
  expect(preflight.code).toBe(2);
  const run = publicCli(root, ["run", taskId]);
  expect(run.code).toBe(2);
  expect(snapshot(root)).toBe(before);
  expect(readFileSync(join(root, TARGET_PATH), "utf8")).not.toBe(REPLACEMENT_CONTENT);
  expect(existsSync(join(root, `.sureflow/state/tasks/${taskId}.json`))).toBe(false);
  expect(existsSync(join(root, ".sureflow/evidence/evidence.jsonl"))).toBe(false);
  expect(existsSync(join(root, ".sureflow/events/events.jsonl"))).toBe(false);
  expect(mutationLockExists(root)).toBe(false);
}

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe("M3-T4 independent real package-manager acceptance", () => {
  it("accepts the npm fixture through the public CLI and real npm", () => {
    assertPositiveProject("npm");
  }, 30_000);

  it("accepts the pnpm fixture through the public CLI and real pnpm", () => {
    assertPositiveProject("pnpm");
  }, 30_000);

  it("rejects an npm task against a pnpm-only project before mutation", () => {
    assertStructuralRejection("pnpm", (root) => {
      writeContract(root, "pnpm", { adapter: M2_ADAPTER_ID });
    });
  });

  it("rejects a pnpm task against an npm-only project before mutation", () => {
    assertStructuralRejection("npm", (root) => {
      writeContract(root, "npm", { adapter: M3_PNPM_ADAPTER_ID });
    });
  });

  it("rejects a project containing both manager lockfiles before mutation", () => {
    assertStructuralRejection("pnpm", (root) => {
      writeFileSync(join(root, "package-lock.json"), '{"lockfileVersion":3}\n', "utf8");
    });
  });

  it.each(["pnpm-workspace.yaml", "package.json workspaces"])(
    "rejects pnpm workspace shape (%s) before mutation",
    (variant) => {
      assertStructuralRejection("pnpm", (root) => {
        if (variant === "pnpm-workspace.yaml") {
          writeFileSync(join(root, "pnpm-workspace.yaml"), "packages:\n  - packages/*\n", "utf8");
          return;
        }
        const manifest = JSON.parse(readFileSync(join(root, "package.json"), "utf8")) as Record<string, unknown>;
        writeFileSync(
          join(root, "package.json"),
          `${JSON.stringify({ ...manifest, workspaces: ["packages/*"] }, null, 2)}\n`,
          "utf8",
        );
      });
    },
  );
});
