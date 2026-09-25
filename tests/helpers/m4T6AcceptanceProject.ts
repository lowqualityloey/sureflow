import { createHash, randomUUID } from "node:crypto";
import { execFileSync, spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { homedir, tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { cliExecutable } from "./cliArtifact.js";
import { M2_ADAPTER_ID, M3_PNPM_ADAPTER_ID } from "../../src/taskContract.js";

export type T6Manager = "npm" | "pnpm";

export interface M4T6Target {
  readonly path: string;
  readonly before: string;
  readonly replacement: string;
}

export interface M4T6ProjectOptions {
  readonly manager: T6Manager;
  readonly targetCount?: number;
  readonly targetPaths?: readonly string[];
  readonly checks?: readonly string[];
}

export interface M4T6Control {
  readonly failCheck?: string;
  readonly extraPath?: string;
  readonly restorePath?: string;
  readonly restoreContent?: string;
  readonly failFinalStateWrite?: boolean;
}

export interface M4T6Project {
  readonly root: string;
  readonly taskId: string;
  readonly manager: T6Manager;
  readonly cliPath: string;
  readonly checks: readonly string[];
  readonly targets: readonly M4T6Target[];
}

export interface M4T6CommandResult {
  readonly code: number;
  readonly stdout: string;
  readonly stderr: string;
}

export const T6_CONTROL_PATH = ".sureflow/t6-control.json" as const;
export const T6_VERIFICATION_LOG = ".sureflow/t6-verification.jsonl" as const;
export const DEFAULT_CHECKS = ["typecheck", "test", "lint", "build"] as const;

const verificationScript = `import { appendFileSync, chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { spawnSync } from "node:child_process";

const [check, expectedManager, taskId] = process.argv.slice(2);
if (check === undefined || (expectedManager !== "npm" && expectedManager !== "pnpm") || taskId === undefined) throw new Error("verification arguments are invalid");
const control = JSON.parse(readFileSync(".sureflow/t6-control.json", "utf8"));
const userAgent = process.env.npm_config_user_agent ?? "";
const manager = userAgent.startsWith("pnpm/") ? "pnpm" : userAgent.startsWith("npm/") ? "npm" : "unknown";
if (manager !== expectedManager) throw new Error("expected " + expectedManager + ", observed " + manager + " (" + userAgent + ")");
const lockHeld = existsSync(".sureflow/state/execution.lock");
if (!lockHeld) throw new Error("verification did not run under the Sureflow execution lock");
appendFileSync(".sureflow/t6-verification.jsonl", JSON.stringify({ check, manager, userAgent, lockHeld }) + "\\n");

if (check === "typecheck" || check === "build") {
  for (const path of Object.keys(control.expectedAfter)) {
    const result = spawnSync(process.execPath, ["--experimental-strip-types", "--check", path], { shell: false, stdio: "ignore" });
    if (result.status !== 0) throw new Error(check + " failed for " + path);
  }
}
if (check === "test") {
  for (const [path, expected] of Object.entries(control.expectedAfter)) {
    if (readFileSync(path, "utf8") !== expected) throw new Error("target test failed for " + path);
  }
}
if (check === "lint") {
  for (const path of Object.keys(control.expectedAfter)) {
    if (/\\s+$/u.test(readFileSync(path, "utf8").split("\\n").slice(0, -1).join("\\n"))) throw new Error("lint failed for " + path);
  }
}

if (control.extraPath !== undefined && check === "test" && !existsSync(".sureflow/t6-extra-applied")) {
  mkdirSync(dirname(control.extraPath), { recursive: true });
  writeFileSync(control.extraPath, "unexpected Git-visible path\\n");
  writeFileSync(".sureflow/t6-extra-applied", "done\\n");
}
if (control.restorePath !== undefined && check === "test" && !existsSync(".sureflow/t6-restore-applied")) {
  writeFileSync(control.restorePath, control.restoreContent ?? "");
  writeFileSync(".sureflow/t6-restore-applied", "done\\n");
}
if (control.failCheck === check) process.exitCode = 1;
if (control.failFinalStateWrite === true && check === control.lastCheck) chmodSync(join(".sureflow", "state", "tasks"), 0o555);
`;

function sha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function runGit(root: string, args: readonly string[]): void {
  execFileSync("git", [...args], { cwd: root, shell: false, stdio: "pipe" });
}

export function invokeM4T6Cli(
  project: M4T6Project,
  args: readonly string[],
  env: NodeJS.ProcessEnv = process.env,
): M4T6CommandResult {
  const corepackHome = env.COREPACK_HOME ?? (
    process.platform === "linux" ? join(homedir(), ".cache", "node", "corepack") : undefined
  );
  const commandEnv = project.manager === "pnpm"
    ? {
      ...env,
      COREPACK_ENABLE_NETWORK: "0",
      ...(corepackHome === undefined ? {} : { COREPACK_HOME: corepackHome }),
    }
    : env;
  const result = spawnSync(process.execPath, [project.cliPath, ...args], {
    cwd: project.root,
    env: commandEnv,
    encoding: "utf8",
    shell: false,
  });
  return Object.freeze({ code: result.status ?? 2, stdout: result.stdout, stderr: result.stderr });
}

export function prepareM4T6Project(options: M4T6ProjectOptions): M4T6Project {
  const count = options.targetPaths?.length ?? options.targetCount ?? 2;
  if (count < 2 || count > 5) throw new Error("T6 project target count must be from two to five");
  const checks = Object.freeze([...(options.checks ?? DEFAULT_CHECKS)]);
  if (checks.length !== 4 || new Set(checks).size !== checks.length) throw new Error("T6 projects require four unique verification checks");
  const root = mkdtempSync(join(tmpdir(), "sureflow-m4-t6-"));
  const taskId = `TASK-M4-T6-${randomUUID().slice(0, 12)}`;
  const paths = options.targetPaths === undefined
    ? Array.from({ length: count }, (_, index) => `src/target-${String(index)}.ts`).reverse()
    : [...options.targetPaths];
  const targets = Object.freeze(paths.map((path, index) => Object.freeze({
    path,
    before: `export const before${String(index)} = ${JSON.stringify(path)};\n`,
    replacement: `export const target${String(index)} = "after-${String(index)}";\n`,
  })));
  const cliPath = cliExecutable();
  const managerVersion = options.manager === "npm" ? "11.19.0" : "10.33.0";
  const managerId = options.manager === "npm" ? M2_ADAPTER_ID : M3_PNPM_ADAPTER_ID;
  const packageScripts = Object.fromEntries(checks.map((check) => [
    check,
    `node scripts/verify.mjs ${check} ${options.manager} ${taskId}`,
  ]));
  const project = Object.freeze({
    root,
    taskId,
    manager: options.manager,
    cliPath,
    checks,
    targets,
  });

  try {
    mkdirSync(join(root, "scripts"), { recursive: true });
    writeFileSync(join(root, ".gitignore"), ".sureflow/\nnode_modules/\n", "utf8");
    writeFileSync(join(root, "tsconfig.json"), '{"compilerOptions":{"strict":true}}\n', "utf8");
    writeFileSync(join(root, "scripts", "verify.mjs"), verificationScript, "utf8");
    writeFileSync(join(root, "package.json"), `${JSON.stringify({
      name: `sureflow-m4-t6-${options.manager}`,
      version: "1.0.0",
      private: true,
      type: "module",
      engines: { node: ">=24" },
      packageManager: `${options.manager}@${managerVersion}`,
      scripts: packageScripts,
    }, null, 2)}\n`, "utf8");
    if (options.manager === "npm") {
      writeFileSync(join(root, "package-lock.json"), `${JSON.stringify({ name: `sureflow-m4-t6-${options.manager}`, lockfileVersion: 3, requires: true, packages: {} }, null, 2)}\n`, "utf8");
    } else {
      writeFileSync(join(root, "pnpm-lock.yaml"), "lockfileVersion: '9.0'\nsettings:\n  autoInstallPeers: true\n  excludeLinksFromLockfile: false\nimporters:\n  .: {}\n", "utf8");
    }
    for (const target of targets) {
      const path = join(root, target.path);
      mkdirSync(dirname(path), { recursive: true });
      writeFileSync(path, target.before, "utf8");
    }
    runGit(root, ["init", "--initial-branch", "main"]);
    runGit(root, ["config", "user.email", "sureflow-m4-t6@example.invalid"]);
    runGit(root, ["config", "user.name", "Sureflow M4-T6"]);
    runGit(root, ["add", "."]);
    runGit(root, ["commit", "--quiet", "-m", "independent T6 baseline"]);
    const initialized = invokeM4T6Cli(project, ["init"]);
    if (initialized.code !== 0) throw new Error(`public init failed: ${initialized.stderr}`);
    const expectedAfter = Object.fromEntries(targets.map((target) => [target.path, target.replacement]));
    writeFileSync(join(root, T6_CONTROL_PATH), `${JSON.stringify({
      expectedAfter,
      lastCheck: checks.at(-1),
    })}\n`, "utf8");
    writeFileSync(join(root, ".sureflow", "task.json"), `${JSON.stringify({
      schemaVersion: 2,
      taskId,
      adapter: managerId,
      operation: "replace-existing-files",
      targets: targets.map((target) => ({
        path: target.path,
        expectedBeforeSha256: sha256(target.before),
        replacementContent: target.replacement,
      })),
      requiredVerification: checks,
    }, null, 2)}\n`, "utf8");
    return project;
  } catch (error: unknown) {
    if (existsSync(root)) rmSync(root, { recursive: true, force: true });
    throw error;
  }
}

export function writeM4T6Control(project: M4T6Project, control: M4T6Control): void {
  const path = join(project.root, T6_CONTROL_PATH);
  const current: unknown = JSON.parse(readFileSync(path, "utf8"));
  if (typeof current !== "object" || current === null || Array.isArray(current)) throw new Error("T6 control file is malformed");
  writeFileSync(path, `${JSON.stringify({ ...current, ...control })}\n`, "utf8");
}
