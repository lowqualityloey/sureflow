/**
 * M3-T2 narrow pnpm detection + fixed dispatch + public preflight tests.
 *
 * Covers authorization items A–P:
 * A. unambiguous npm project still resolves and behaves as before
 * B. narrow valid pnpm project resolves to the approved pnpm adapter
 * C. fixed pnpm dispatch is exactly pnpm run typecheck / pnpm test /
 *    pnpm run lint / pnpm run build
 * D. caller/task cannot inject executable or argv
 * E. both npm and pnpm manager evidence -> ineligible
 * F. packageManager conflict -> ineligible
 * G. pnpm-workspace.yaml / workspace-shaped project -> unsupported
 * H. missing/empty requirements fail closed
 * I. preflight valid npm -> exit 0
 * J. preflight valid pnpm -> exit 0
 * K. preflight unsupported/ambiguous/malformed -> exit 2
 * L. preflight writes nothing
 * M. successful preflight does not let run skip independent checks
 * N. unknown adapter IDs remain rejected
 * O. public CLI accepts exactly init/run/status/verify/preflight
 * P. no workspace support accidentally activates
 */
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { APPROVED_COMMANDS, runCli, type CliIo } from "../src/cli.js";
import { readEvidence } from "../src/evidenceStore.js";
import { mutationLockExists } from "../src/mutationLock.js";
import { runM2Task } from "../src/m2Orchestration.js";
import { preflightM2Task } from "../src/preflight.js";
import {
  adapterStepArgv,
  M3_ADAPTER_IDS,
  resolveAdapterContract,
  resolveAdapterContractForIds,
} from "../src/projectAdapter.js";
import {
  M2_ADAPTER_ID,
  M2_REPLACEMENT_OPERATION,
  M2_TASK_CONTRACT_SCHEMA_VERSION,
  M3_PNPM_ADAPTER_ID,
  loadValidatedExecutionPlan,
  parseM2TaskContract,
} from "../src/taskContract.js";
import type {
  M2VerificationProfile,
  ValidatedExecutionPlan,
} from "../src/taskContract.js";
import { detectProject } from "../src/projectDetection.js";
import type { DetectedNodeTypeScriptProject } from "../src/projectDetection.js";
import {
  resolveVerificationPlan,
  runVerificationPlan,
} from "../src/verificationAdapter.js";
import type { VerificationPlan, VerificationSpawn } from "../src/verificationAdapter.js";

const temporaryRoots: string[] = [];
const TASK_ID = "TASK-M3-T2";
const TARGET_PATH = "src/displayName.ts";
const FULL_SCRIPTS = {
  typecheck: "node --check src/displayName.ts",
  test: "node --test test/displayName.test.ts",
  lint: "node scripts/lint.mjs",
  build: "node scripts/build.mjs",
};

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) rmSync(root, { recursive: true, force: true });
});

function temporaryRoot(): string {
  const root = mkdtempSync(join(tmpdir(), "sureflow-m3-t2-"));
  temporaryRoots.push(root);
  return root;
}

function writeTarget(root: string): void {
  mkdirSync(join(root, "src"), { recursive: true });
  writeFileSync(join(root, TARGET_PATH), "export const displayName = \"t2\";\n", "utf8");
}

function writeManifest(
  root: string,
  scripts: Record<string, string>,
  extra: Record<string, unknown> = {},
): void {
  writeFileSync(
    join(root, "package.json"),
    `${JSON.stringify({ name: "m3-t2-shape", private: true, type: "module", scripts, ...extra }, null, 2)}\n`,
    "utf8",
  );
}

function writeNpmProject(root: string, scripts: Record<string, string> = FULL_SCRIPTS): void {
  writeManifest(root, scripts);
  writeFileSync(join(root, "package-lock.json"), '{"lockfileVersion":3}\n', "utf8");
  writeFileSync(join(root, "tsconfig.json"), "{}\n", "utf8");
  writeTarget(root);
}

function writePnpmProject(
  root: string,
  scripts: Record<string, string> = FULL_SCRIPTS,
  extra: Record<string, unknown> = {},
): void {
  writeManifest(root, scripts, extra);
  writeFileSync(join(root, "pnpm-lock.yaml"), "lockfileVersion: 9\n", "utf8");
  writeFileSync(join(root, "tsconfig.json"), "{}\n", "utf8");
  writeTarget(root);
}

function writeTaskContract(
  root: string,
  overrides: Record<string, unknown> = {},
): void {
  mkdirSync(join(root, ".sureflow"), { recursive: true });
  writeFileSync(
    join(root, ".sureflow/task.json"),
    JSON.stringify({
      schemaVersion: M2_TASK_CONTRACT_SCHEMA_VERSION,
      taskId: TASK_ID,
      adapter: M2_ADAPTER_ID,
      operation: M2_REPLACEMENT_OPERATION,
      targetPath: TARGET_PATH,
      expectedBeforeSha256: "a".repeat(64),
      replacementContent: "fixture replacement",
      requiredVerification: ["typecheck", "test", "lint", "build"],
      ...overrides,
    }),
    "utf8",
  );
}

function planFor(root: string): ValidatedExecutionPlan {
  return loadValidatedExecutionPlan(root);
}

function cliRun(root: string, argv: readonly string[]): { code: number; out: string; err: string } {
  const out: string[] = [];
  const err: string[] = [];
  const io: CliIo = { out: (line) => out.push(line), err: (line) => err.push(line) };
  const code = runCli([...argv], root, io);
  return { code, out: out.join("\n"), err: err.join("\n") };
}

function snapshotFiles(root: string): string {
  const entries: string[] = [];
  const walk = (directory: string, prefix: string): void => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      if (entry.name === ".git") continue;
      const relative = `${prefix}${entry.name}`;
      if (entry.isDirectory()) {
        walk(join(directory, entry.name), `${relative}/`);
      } else {
        entries.push(`${relative}:${readFileSync(join(directory, entry.name)).toString("base64")}`);
      }
    }
  };
  walk(root, "");
  return entries.sort().join("\n");
}

describe("M3-T2 closed adapter set", () => {
  it("holds exactly the npm and narrow pnpm adapter identities", () => {
    expect([...M3_ADAPTER_IDS]).toEqual([
      "node-typescript/npm-scripts-v1",
      "node-typescript/pnpm-scripts-v1",
    ]);
  });

  it("N: rejects unknown adapter identities in task contracts and resolution", () => {
    expect(() =>
      parseM2TaskContract({
        schemaVersion: 1,
        taskId: TASK_ID,
        adapter: "node-typescript/yarn-scripts-v1",
        operation: "replace-existing-file",
        targetPath: TARGET_PATH,
        expectedBeforeSha256: "a".repeat(64),
        replacementContent: "x",
        requiredVerification: ["test"],
      }),
    ).toThrow(/unsupported adapter/);
    expect(
      resolveAdapterContractForIds("node-typescript/yarn-scripts-v1", "node-typescript/yarn-scripts-v1")
        .kind,
    ).toBe("unsupported");
    expect(
      resolveAdapterContractForIds("node-typescript/pnpm-scripts-v1", "node-typescript/npm-scripts-v1")
        .kind,
    ).toBe("unsupported");
  });
});

describe("M3-T2 npm preservation (A)", () => {
  it("A: unambiguous npm project still resolves with fixed npm dispatch and order", () => {
    const root = temporaryRoot();
    writeNpmProject(root);
    writeTaskContract(root);
    const plan = planFor(root);
    const detected = detectProject(root, plan);

    expect(detected.kind).toBe("supported");
    if (detected.kind !== "supported") return;
    expect(detected.project.adapter).toBe(M2_ADAPTER_ID);
    expect(detected.project.lockfilePath).toBe("package-lock.json");

    const resolved = resolveVerificationPlan(detected.project, plan);
    expect(resolved.kind).toBe("resolved");
    if (resolved.kind !== "resolved") return;
    expect(resolved.plan.profile).toBe(M2_ADAPTER_ID);
    expect(resolved.plan.steps).toEqual([
      { check: "typecheck", executable: "npm", argv: ["run", "typecheck"], shell: false },
      { check: "test", executable: "npm", argv: ["test"], shell: false },
      { check: "lint", executable: "npm", argv: ["run", "lint"], shell: false },
      { check: "build", executable: "npm", argv: ["run", "build"], shell: false },
    ]);
  });

  it("A: executed npm verification still spawns only the fixed npm invocations", async () => {
    const root = temporaryRoot();
    writeNpmProject(root);
    writeTaskContract(root);
    const plan = planFor(root);
    const detected = detectProject(root, plan);
    expect(detected.kind).toBe("supported");
    if (detected.kind !== "supported") return;
    const resolved = resolveVerificationPlan(detected.project, plan);
    expect(resolved.kind).toBe("resolved");
    if (resolved.kind !== "resolved") return;

    const calls: Array<{ readonly executable: string; readonly argv: readonly string[] }> = [];
    const spawn: VerificationSpawn = (executable, argv) => {
      calls.push({ executable, argv: [...argv] });
      const process = {
        on(event: "error" | "close", listener: unknown) {
          if (event === "close") {
            queueMicrotask(() => {
              (listener as (exitCode: number | null, signal: NodeJS.Signals | null) => void)(0, null);
            });
          }
          return process;
        },
      };
      return process;
    };
    const results = await runVerificationPlan(detected.project, resolved.plan, spawn);

    expect(results.map((result) => result.kind)).toEqual(["passed", "passed", "passed", "passed"]);
    expect(calls).toEqual([
      { executable: "npm", argv: ["run", "typecheck"] },
      { executable: "npm", argv: ["test"] },
      { executable: "npm", argv: ["run", "lint"] },
      { executable: "npm", argv: ["run", "build"] },
    ]);
  });

  it("A: npm project with an agreeing npm packageManager claim stays supported", () => {
    const root = temporaryRoot();
    writeManifest(root, FULL_SCRIPTS, { packageManager: "npm@10.2.4" });
    writeFileSync(join(root, "package-lock.json"), '{"lockfileVersion":3}\n', "utf8");
    writeFileSync(join(root, "tsconfig.json"), "{}\n", "utf8");
    writeTarget(root);
    writeTaskContract(root);

    expect(detectProject(root, planFor(root)).kind).toBe("supported");
  });
});

describe("M3-T2 narrow pnpm shape (B, C)", () => {
  it("B: narrow valid pnpm project resolves to the approved pnpm adapter", () => {
    const root = temporaryRoot();
    writePnpmProject(root);
    writeTaskContract(root, { adapter: M3_PNPM_ADAPTER_ID });
    const plan = planFor(root);

    expect(plan.adapter).toBe(M3_PNPM_ADAPTER_ID);
    const detected = detectProject(root, plan);
    expect(detected.kind).toBe("supported");
    if (detected.kind !== "supported") return;
    expect(detected.project.adapter).toBe(M3_PNPM_ADAPTER_ID);
    expect(detected.project.lockfilePath).toBe("pnpm-lock.yaml");

    const outcome = resolveAdapterContract(detected.project, plan);
    expect(outcome.kind).toBe("resolved");
    if (outcome.kind !== "resolved") return;
    expect(outcome.contract.adapterId).toBe(M3_PNPM_ADAPTER_ID);
    expect(outcome.contract.manager).toBe("pnpm");
    expect(outcome.contract.executable).toBe("pnpm");
    expect(outcome.contract.cwdRole).toBe("project-root");
    expect(outcome.contract.contractVersion).toBe(1);
  });

  it("B: pnpm project with an agreeing pnpm packageManager claim stays supported", () => {
    const root = temporaryRoot();
    writePnpmProject(root, FULL_SCRIPTS, { packageManager: "pnpm@9.1.0" });
    writeTaskContract(root, { adapter: M3_PNPM_ADAPTER_ID });

    expect(detectProject(root, planFor(root)).kind).toBe("supported");
  });

  it("C: fixed pnpm dispatch is exactly pnpm run typecheck / pnpm test / pnpm run lint / pnpm run build", () => {
    const root = temporaryRoot();
    writePnpmProject(root);
    writeTaskContract(root, { adapter: M3_PNPM_ADAPTER_ID });
    const plan = planFor(root);
    const detected = detectProject(root, plan);
    expect(detected.kind).toBe("supported");
    if (detected.kind !== "supported") return;
    const outcome = resolveAdapterContract(detected.project, plan);
    expect(outcome.kind).toBe("resolved");
    if (outcome.kind !== "resolved") return;

    expect(adapterStepArgv(outcome.contract, "typecheck")).toEqual(["run", "typecheck"]);
    expect(adapterStepArgv(outcome.contract, "test")).toEqual(["test"]);
    expect(adapterStepArgv(outcome.contract, "lint")).toEqual(["run", "lint"]);
    expect(adapterStepArgv(outcome.contract, "build")).toEqual(["run", "build"]);

    const resolved = resolveVerificationPlan(detected.project, plan);
    expect(resolved.kind).toBe("resolved");
    if (resolved.kind !== "resolved") return;
    expect(resolved.plan.profile).toBe(M3_PNPM_ADAPTER_ID);
    expect(resolved.plan.steps).toEqual([
      { check: "typecheck", executable: "pnpm", argv: ["run", "typecheck"], shell: false },
      { check: "test", executable: "pnpm", argv: ["test"], shell: false },
      { check: "lint", executable: "pnpm", argv: ["run", "lint"], shell: false },
      { check: "build", executable: "pnpm", argv: ["run", "build"], shell: false },
    ]);
  });

  it("C: executed pnpm verification spawns only the fixed pnpm invocations", async () => {
    const root = temporaryRoot();
    writePnpmProject(root);
    writeTaskContract(root, { adapter: M3_PNPM_ADAPTER_ID });
    const plan = planFor(root);
    const detected = detectProject(root, plan);
    expect(detected.kind).toBe("supported");
    if (detected.kind !== "supported") return;
    const resolved = resolveVerificationPlan(detected.project, plan);
    expect(resolved.kind).toBe("resolved");
    if (resolved.kind !== "resolved") return;

    const calls: Array<{ readonly executable: string; readonly argv: readonly string[] }> = [];
    const spawn: VerificationSpawn = (executable, argv) => {
      calls.push({ executable, argv: [...argv] });
      const process = {
        on(event: "error" | "close", listener: unknown) {
          if (event === "close") {
            queueMicrotask(() => {
              (listener as (exitCode: number | null, signal: NodeJS.Signals | null) => void)(0, null);
            });
          }
          return process;
        },
      };
      return process;
    };
    await runVerificationPlan(detected.project, resolved.plan, spawn);

    expect(calls).toEqual([
      { executable: "pnpm", argv: ["run", "typecheck"] },
      { executable: "pnpm", argv: ["test"] },
      { executable: "pnpm", argv: ["run", "lint"] },
      { executable: "pnpm", argv: ["run", "build"] },
    ]);
  });
});

describe("M3-T2 injection and ambiguity (D, E, F)", () => {
  it("D: caller-supplied executable/argv cannot alter pnpm dispatch", () => {
    const root = temporaryRoot();
    writePnpmProject(root);
    writeTaskContract(root, { adapter: M3_PNPM_ADAPTER_ID });
    const tainted = {
      ...planFor(root),
      executable: "sh",
      argv: ["-c", "evil"],
      shell: true,
    } as unknown as ValidatedExecutionPlan;
    const detected = detectProject(root, planFor(root));
    expect(detected.kind).toBe("supported");
    if (detected.kind !== "supported") return;
    const resolved = resolveVerificationPlan(detected.project, tainted);

    expect(resolved.kind).toBe("resolved");
    if (resolved.kind !== "resolved") return;
    expect(resolved.plan.steps.every((step) => step.executable === "pnpm" && step.shell === false)).toBe(
      true,
    );
  });

  it("D: forged contracts with foreign executables fail closed", () => {
    const root = temporaryRoot();
    writePnpmProject(root);
    writeTaskContract(root, { adapter: M3_PNPM_ADAPTER_ID });
    const plan = planFor(root);
    const detected = detectProject(root, plan);
    expect(detected.kind).toBe("supported");
    if (detected.kind !== "supported") return;
    const outcome = resolveAdapterContract(detected.project, plan);
    expect(outcome.kind).toBe("resolved");
    if (outcome.kind !== "resolved") return;
    const forged = { ...outcome.contract, executable: "sh" } as unknown as Parameters<
      typeof resolveVerificationPlan
    >[2];

    expect(resolveVerificationPlan(detected.project, plan, forged).kind).toBe("unsupported");
  });

  it("E: both package-lock.json and pnpm-lock.yaml is ineligible for either adapter", () => {
    for (const adapter of [M2_ADAPTER_ID, M3_PNPM_ADAPTER_ID] as const) {
      const root = temporaryRoot();
      writeManifest(root, FULL_SCRIPTS);
      writeFileSync(join(root, "package-lock.json"), '{"lockfileVersion":3}\n', "utf8");
      writeFileSync(join(root, "pnpm-lock.yaml"), "lockfileVersion: 9\n", "utf8");
      writeFileSync(join(root, "tsconfig.json"), "{}\n", "utf8");
      writeTarget(root);
      writeTaskContract(root, { adapter });

      const detected = detectProject(root, planFor(root));
      expect(detected.kind).toBe("unsupported");
      if (detected.kind === "unsupported") {
        expect(detected.reason).toContain("conflicting");
      }
    }
  });

  it("F: packageManager conflicts fail closed in both directions", () => {
    const npmRoot = temporaryRoot();
    writeNpmProject(npmRoot);
    writeFileSync(
      join(npmRoot, "package.json"),
      JSON.stringify({
        name: "m3-t2-shape",
        private: true,
        type: "module",
        scripts: FULL_SCRIPTS,
        packageManager: "pnpm@9.1.0",
      }),
      "utf8",
    );
    writeTaskContract(npmRoot);
    expect(detectProject(npmRoot, planFor(npmRoot)).kind).toBe("unsupported");

    const pnpmRoot = temporaryRoot();
    writePnpmProject(pnpmRoot, FULL_SCRIPTS, { packageManager: "npm@10.2.4" });
    writeTaskContract(pnpmRoot, { adapter: M3_PNPM_ADAPTER_ID });
    expect(detectProject(pnpmRoot, planFor(pnpmRoot)).kind).toBe("unsupported");
  });

  it("F: unknown or malformed packageManager values fail closed", () => {
    for (const packageManager of ["yarn@1.22.0", "pnpm", 42]) {
      const root = temporaryRoot();
      writePnpmProject(root, FULL_SCRIPTS, { packageManager: packageManager as string });
      writeTaskContract(root, { adapter: M3_PNPM_ADAPTER_ID });

      expect(detectProject(root, planFor(root)).kind).toBe("unsupported");
    }
  });

  it("resolves nothing when project and plan adapters disagree", () => {
    const root = temporaryRoot();
    writePnpmProject(root);
    writeTaskContract(root, { adapter: M2_ADAPTER_ID });

    expect(detectProject(root, planFor(root)).kind).toBe("unsupported");
  });
});

describe("M3-T2 workspace and requirement floors (G, H, P)", () => {
  it("G/P: pnpm-workspace.yaml marks npm and pnpm shapes unsupported", () => {
    const npmRoot = temporaryRoot();
    writeNpmProject(npmRoot);
    writeFileSync(join(npmRoot, "pnpm-workspace.yaml"), "packages:\n  - packages/*\n", "utf8");
    writeTaskContract(npmRoot);
    expect(detectProject(npmRoot, planFor(npmRoot)).kind).toBe("unsupported");

    const pnpmRoot = temporaryRoot();
    writePnpmProject(pnpmRoot);
    writeFileSync(join(pnpmRoot, "pnpm-workspace.yaml"), "packages:\n  - packages/*\n", "utf8");
    writeTaskContract(pnpmRoot, { adapter: M3_PNPM_ADAPTER_ID });
    expect(detectProject(pnpmRoot, planFor(pnpmRoot)).kind).toBe("unsupported");
  });

  it("P: package.json workspaces field is unsupported for both shapes", () => {
    const npmRoot = temporaryRoot();
    writeNpmProject(npmRoot);
    const manifest = JSON.parse(readFileSync(join(npmRoot, "package.json"), "utf8")) as Record<
      string,
      unknown
    >;
    writeFileSync(
      join(npmRoot, "package.json"),
      JSON.stringify({ ...manifest, workspaces: ["packages/*"] }),
      "utf8",
    );
    writeTaskContract(npmRoot);
    expect(detectProject(npmRoot, planFor(npmRoot)).kind).toBe("unsupported");

    const pnpmRoot = temporaryRoot();
    writePnpmProject(pnpmRoot, FULL_SCRIPTS, { workspaces: ["packages/*"] });
    writeTaskContract(pnpmRoot, { adapter: M3_PNPM_ADAPTER_ID });
    expect(detectProject(pnpmRoot, planFor(pnpmRoot)).kind).toBe("unsupported");
  });

  it("H: missing or empty pnpm requirements fail closed", () => {
    const cases: Array<{
      readonly name: string;
      readonly prepare: (root: string) => void;
    }> = [
      {
        name: "missing pnpm-lock.yaml",
        prepare: (root) => {
          writeManifest(root, FULL_SCRIPTS);
          writeFileSync(join(root, "tsconfig.json"), "{}\n", "utf8");
          writeTarget(root);
        },
      },
      {
        name: "empty pnpm-lock.yaml",
        prepare: (root) => {
          writeManifest(root, FULL_SCRIPTS);
          writeFileSync(join(root, "pnpm-lock.yaml"), "  \n", "utf8");
          writeFileSync(join(root, "tsconfig.json"), "{}\n", "utf8");
          writeTarget(root);
        },
      },
      {
        name: "empty tsconfig.json",
        prepare: (root) => {
          writeManifest(root, FULL_SCRIPTS);
          writeFileSync(join(root, "pnpm-lock.yaml"), "lockfileVersion: 9\n", "utf8");
          writeFileSync(join(root, "tsconfig.json"), "  \n", "utf8");
          writeTarget(root);
        },
      },
      {
        name: "missing required script",
        prepare: (root) => {
          const { build: _dropped, ...scripts } = FULL_SCRIPTS;
          writePnpmProject(root, scripts);
        },
      },
      {
        name: "missing manifest",
        prepare: (root) => {
          writeFileSync(join(root, "pnpm-lock.yaml"), "lockfileVersion: 9\n", "utf8");
          writeFileSync(join(root, "tsconfig.json"), "{}\n", "utf8");
          writeTarget(root);
        },
      },
    ];
    for (const { prepare } of cases) {
      const root = temporaryRoot();
      prepare(root);
      writeTaskContract(root, { adapter: M3_PNPM_ADAPTER_ID });

      expect(detectProject(root, planFor(root)).kind).toBe("unsupported");
    }
  });
});

describe("M3-T2 public preflight (I, J, K, L, M, O)", () => {
  it("O: public CLI accepts exactly init/run/status/verify/preflight", () => {
    expect([...APPROVED_COMMANDS]).toEqual(["init", "run", "status", "verify", "preflight"]);
  });

  it("I: preflight on a valid npm project exits 0 without state", () => {
    const root = temporaryRoot();
    writeNpmProject(root);
    writeTaskContract(root);

    const result = cliRun(root, ["preflight", TASK_ID]);
    expect(result.code).toBe(0);
    expect(result.out).toContain("ELIGIBLE");
    expect(result.out).toContain(M2_ADAPTER_ID);
  });

  it("J: preflight on a valid pnpm project exits 0 without state", () => {
    const root = temporaryRoot();
    writePnpmProject(root);
    writeTaskContract(root, { adapter: M3_PNPM_ADAPTER_ID });

    const result = cliRun(root, ["preflight", TASK_ID]);
    expect(result.code).toBe(0);
    expect(result.out).toContain("ELIGIBLE");
    expect(result.out).toContain(M3_PNPM_ADAPTER_ID);
  });

  it("K: preflight exits 2 for ambiguous, mismatched, and malformed tasks", () => {
    const ambiguousRoot = temporaryRoot();
    writeManifest(ambiguousRoot, FULL_SCRIPTS);
    writeFileSync(join(ambiguousRoot, "package-lock.json"), '{"lockfileVersion":3}\n', "utf8");
    writeFileSync(join(ambiguousRoot, "pnpm-lock.yaml"), "lockfileVersion: 9\n", "utf8");
    writeFileSync(join(ambiguousRoot, "tsconfig.json"), "{}\n", "utf8");
    writeTarget(ambiguousRoot);
    writeTaskContract(ambiguousRoot);
    expect(cliRun(ambiguousRoot, ["preflight", TASK_ID]).code).toBe(2);

    const mismatchedRoot = temporaryRoot();
    writeNpmProject(mismatchedRoot);
    writeTaskContract(mismatchedRoot);
    expect(cliRun(mismatchedRoot, ["preflight", "TASK-OTHER"]).code).toBe(2);

    const malformedRoot = temporaryRoot();
    writeNpmProject(malformedRoot);
    mkdirSync(join(malformedRoot, ".sureflow"), { recursive: true });
    writeFileSync(join(malformedRoot, ".sureflow/task.json"), "{malformed\n", "utf8");
    expect(cliRun(malformedRoot, ["preflight", TASK_ID]).code).toBe(2);

    const missingContractRoot = temporaryRoot();
    writeNpmProject(missingContractRoot);
    expect(cliRun(missingContractRoot, ["preflight", TASK_ID]).code).toBe(2);
  });

  it("K: preflight requires exactly one taskId", () => {
    const root = temporaryRoot();
    writeNpmProject(root);
    writeTaskContract(root);

    expect(cliRun(root, ["preflight"]).code).toBe(2);
    expect(cliRun(root, ["preflight", TASK_ID, "extra"]).code).toBe(2);
  });

  it("L: preflight writes nothing to the project or control plane", () => {
    for (const shape of ["npm", "pnpm"] as const) {
      const root = temporaryRoot();
      if (shape === "npm") {
        writeNpmProject(root);
        writeTaskContract(root);
      } else {
        writePnpmProject(root);
        writeTaskContract(root, { adapter: M3_PNPM_ADAPTER_ID });
      }
      const before = snapshotFiles(root);

      const outcome = preflightM2Task({ rootDir: root, requestedTaskId: TASK_ID });
      expect(outcome.kind).toBe("eligible");
      const result = cliRun(root, ["preflight", TASK_ID]);
      expect(result.code).toBe(0);

      expect(snapshotFiles(root)).toBe(before);
      expect(mutationLockExists(root)).toBe(false);
    }
  });

  it("M: an eligible preflight does not let run skip independent safety checks", async () => {
    const root = temporaryRoot();
    writeNpmProject(root);
    writeTaskContract(root);
    expect(cliRun(root, ["init"]).code).toBe(0);
    expect(cliRun(root, ["preflight", TASK_ID]).code).toBe(0);

    const manifest = JSON.parse(readFileSync(join(root, "package.json"), "utf8")) as {
      scripts: Record<string, string>;
    };
    const { lint: _dropped, ...scripts } = manifest.scripts;
    writeFileSync(
      join(root, "package.json"),
      `${JSON.stringify({ ...manifest, scripts }, null, 2)}\n`,
      "utf8",
    );
    expect(cliRun(root, ["preflight", TASK_ID]).code).toBe(2);

    const outcome = await runM2Task({ rootDir: root, requestedTaskId: TASK_ID });
    expect(outcome.kind).toBe("halted");
  });

  it("orchestration consumes the resolved adapter contract end-to-end (hermetic)", async () => {
    for (const adapter of [M2_ADAPTER_ID, M3_PNPM_ADAPTER_ID] as const) {
      const expectedExecutable = adapter === M3_PNPM_ADAPTER_ID ? "pnpm" : "npm";
      const root = temporaryRoot();
      if (adapter === M3_PNPM_ADAPTER_ID) {
        writePnpmProject(root);
      } else {
        writeNpmProject(root);
      }
      const beforeSha256 = createHash("sha256")
        .update(readFileSync(join(root, TARGET_PATH)))
        .digest("hex");
      const git = (args: readonly string[]): void => {
        const result = spawnSync("git", [...args], { cwd: root, shell: false, stdio: "ignore" });
        if (result.status !== 0) throw new Error(`git ${args.join(" ")} failed`);
      };
      git(["init", "--initial-branch", "main"]);
      git(["config", "user.email", "m3-t2@example.invalid"]);
      git(["config", "user.name", "M3 T2"]);
      git(["add", "."]);
      git(["commit", "-m", "fixture baseline"]);
      expect(cliRun(root, ["init"]).code).toBe(0);
      writeTaskContract(root, {
        adapter,
        expectedBeforeSha256: beforeSha256,
        replacementContent: "export const displayName = \"t2-run\";\n",
      });
      expect(cliRun(root, ["preflight", TASK_ID]).code).toBe(0);

      const seen: Array<{
        readonly project: DetectedNodeTypeScriptProject;
        readonly plan: VerificationPlan;
      }> = [];
      const outcome = await runM2Task(
        { rootDir: root, requestedTaskId: TASK_ID },
        {
          runVerification: (project, plan) => {
            seen.push({ project, plan });
            return Promise.resolve(
              plan.steps.map((step) => ({
                check: step.check,
                kind: "passed" as const,
                exitCode: 0 as const,
              })),
            );
          },
        },
      );
      expect(outcome.kind).toBe("accepted");

      expect(seen).toHaveLength(1);
      const observed = seen[0];
      expect(observed?.project.adapter).toBe(adapter);
      expect(observed?.plan.profile).toBe(adapter);
      expect(
        (observed?.plan.steps ?? []).every(
          (step) => step.executable === expectedExecutable && step.shell === false,
        ),
      ).toBe(true);

      const records = readEvidence(root)
        .filter((entry) => entry.kind === "record")
        .map((entry) => entry.record as unknown as Record<string, unknown>);
      const verifyRecords = records.filter((record) => record["capability"] === "repo.verify");
      expect(verifyRecords.map((record) => record["target"])).toEqual([
        `${adapter}:typecheck`,
        `${adapter}:test`,
        `${adapter}:lint`,
        `${adapter}:build`,
      ]);
      for (const record of verifyRecords) {
        const check = String(record["target"]).split(":")[1];
        expect(record["result"]).toBe("passed");
        expect(record["provenance"]).toBe(`${expectedExecutable} ${check}; shell=false`);
      }
      for (const record of records) {
        expect(record["schemaVersion"]).toBe(1);
        expect("executionContext" in record).toBe(false);
      }
    }
  });
});
