/**
 * M3-T1 closed adapter/kernel boundary tests.
 *
 * Covers authorization items A–E, J, K:
 * A. unambiguous npm behavior preserved (fixed dispatch, canonical order)
 * B. adapter resolution yields one closed resolved npm contract
 * C. resolved profiles retain the existing fixed npm dispatch
 * D. callers cannot inject arbitrary executable/argv
 * E. kernel consumers need no npm-specific branching after resolution
 * J. no pnpm project is externally accepted yet
 * K. public CLI command set stays init/run/status/verify (no preflight)
 */
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { APPROVED_COMMANDS, runCli, type CliIo } from "../src/cli.js";
import {
  adapterStepArgv,
  M3_ADAPTER_CONTRACT_VERSION,
  M3_ADAPTER_IDS,
  resolveAdapterContract,
  resolveAdapterContractForIds,
  type ResolvedAdapterContract,
} from "../src/projectAdapter.js";
import {
  M2_ADAPTER_ID,
  M2_REPLACEMENT_OPERATION,
  M2_TASK_CONTRACT_SCHEMA_VERSION,
  parseM2TaskContract,
} from "../src/taskContract.js";
import type {
  M2VerificationProfile,
  ValidatedExecutionPlan,
} from "../src/taskContract.js";
import { detectProject } from "../src/projectDetection.js";
import {
  resolveVerificationPlan,
  runVerificationPlan,
} from "../src/verificationAdapter.js";
import type {
  VerificationSpawn,
  VerificationSpawnedProcess,
} from "../src/verificationAdapter.js";

const temporaryRoots: string[] = [];

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) rmSync(root, { recursive: true, force: true });
});

function planFor(requiredVerification: readonly M2VerificationProfile[]): ValidatedExecutionPlan {
  return Object.freeze({
    schemaVersion: M2_TASK_CONTRACT_SCHEMA_VERSION,
    taskId: "TASK-M3-T1",
    adapter: M2_ADAPTER_ID,
    operation: M2_REPLACEMENT_OPERATION,
    targetPath: "src/displayName.ts",
    expectedBeforeSha256: "a".repeat(64),
    replacementContent: "fixture replacement",
    requiredVerification: Object.freeze([...requiredVerification]),
    contractSha256: "b".repeat(64),
    source: Object.freeze({ path: ".sureflow/task.json", sha256: "b".repeat(64) }),
  });
}

function projectFor(
  root = "/canonical/m3-t1-project",
  supportedChecks: readonly M2VerificationProfile[] = ["typecheck", "test", "lint", "build"],
) {
  return Object.freeze({
    adapter: M2_ADAPTER_ID,
    root,
    manifestPath: "package.json" as const,
    lockfilePath: "package-lock.json" as const,
    tsconfigPath: "tsconfig.json" as const,
    targetPath: "src/displayName.ts",
    supportedChecks: Object.freeze([...supportedChecks]),
  });
}

function passingSpawn(calls: Array<{ readonly executable: string; readonly argv: readonly string[] }>): VerificationSpawn {
  const spawn: VerificationSpawn = (executable, argv) => {
    calls.push({ executable, argv: [...argv] });
    const process = {
      on(event: "error" | "close", listener: unknown): VerificationSpawnedProcess {
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
  return spawn;
}

describe("M3-T1 closed adapter contract", () => {
  it("B: resolves exactly one closed npm contract with fixed reviewed values", () => {
    const outcome = resolveAdapterContract(projectFor(), planFor(["test"]));

    expect(outcome.kind).toBe("resolved");
    if (outcome.kind === "resolved") {
      const contract: ResolvedAdapterContract = outcome.contract;
      expect(contract.adapterId).toBe("node-typescript/npm-scripts-v1");
      expect(contract.contractVersion).toBe(M3_ADAPTER_CONTRACT_VERSION);
      expect(contract.manager).toBe("npm");
      expect(contract.executable).toBe("npm");
      expect(contract.cwdRole).toBe("project-root");
      expect(contract.verificationProfiles).toEqual(["typecheck", "test", "lint", "build"]);
    }
  });

  it("B: the closed adapter identity set has exactly one member (no pnpm yet)", () => {
    expect([...M3_ADAPTER_IDS]).toEqual(["node-typescript/npm-scripts-v1"]);
  });

  it("B: rejects adapter disagreement and unknown identities without resolving", () => {
    expect(resolveAdapterContractForIds("node-typescript/npm-scripts-v1", "other-adapter").kind).toBe(
      "unsupported",
    );
    expect(
      resolveAdapterContractForIds("node-typescript/pnpm-scripts-v1", "node-typescript/pnpm-scripts-v1").kind,
    ).toBe("unsupported");
    expect(resolveAdapterContractForIds(null, "node-typescript/npm-scripts-v1").kind).toBe(
      "unsupported",
    );
  });

  it("C: every profile maps to the existing fixed npm argv through the contract", () => {
    const outcome = resolveAdapterContract(projectFor(), planFor(["test"]));
    expect(outcome.kind).toBe("resolved");
    if (outcome.kind !== "resolved") return;
    expect(adapterStepArgv(outcome.contract, "typecheck")).toEqual(["run", "typecheck"]);
    expect(adapterStepArgv(outcome.contract, "test")).toEqual(["test"]);
    expect(adapterStepArgv(outcome.contract, "lint")).toEqual(["run", "lint"]);
    expect(adapterStepArgv(outcome.contract, "build")).toEqual(["run", "build"]);
  });

  it("A: resolved plans preserve the exact M2 fixed npm dispatch and canonical order", () => {
    const result = resolveVerificationPlan(projectFor(), planFor(["build", "test", "typecheck"]));

    expect(result.kind).toBe("resolved");
    if (result.kind !== "resolved") return;
    expect(result.plan.profile).toBe(M2_ADAPTER_ID);
    expect(result.plan.steps).toEqual([
      { check: "typecheck", executable: "npm", argv: ["run", "typecheck"], shell: false },
      { check: "test", executable: "npm", argv: ["test"], shell: false },
      { check: "build", executable: "npm", argv: ["run", "build"], shell: false },
    ]);
  });

  it("A: executed verification spawns exactly the fixed npm invocations", async () => {
    const resolved = resolveVerificationPlan(projectFor(), planFor(["test", "typecheck"]));
    expect(resolved.kind).toBe("resolved");
    if (resolved.kind !== "resolved") return;
    const calls: Array<{ readonly executable: string; readonly argv: readonly string[] }> = [];
    const results = await runVerificationPlan(projectFor(), resolved.plan, passingSpawn(calls));

    expect(results).toEqual([
      { check: "typecheck", kind: "passed", exitCode: 0 },
      { check: "test", kind: "passed", exitCode: 0 },
    ]);
    expect(calls).toEqual([
      { executable: "npm", argv: ["run", "typecheck"] },
      { executable: "npm", argv: ["test"] },
    ]);
  });

  it("D: caller-supplied executable/argv junk cannot alter resolved dispatch", () => {
    const tainted = {
      ...planFor(["test"]),
      executable: "sh",
      argv: ["-c", "evil"],
      shell: true,
    } as unknown as ValidatedExecutionPlan;
    const result = resolveVerificationPlan(projectFor(), tainted);

    expect(result.kind).toBe("resolved");
    if (result.kind !== "resolved") return;
    expect(result.plan.steps).toEqual([
      { check: "test", executable: "npm", argv: ["test"], shell: false },
    ]);
  });

  it("E: an explicitly resolved contract resolves identically to internal resolution", () => {
    const explicit = resolveAdapterContract(projectFor(), planFor(["lint", "build"]));
    expect(explicit.kind).toBe("resolved");
    if (explicit.kind !== "resolved") return;
    const viaExplicit = resolveVerificationPlan(projectFor(), planFor(["lint", "build"]), explicit.contract);
    const viaInternal = resolveVerificationPlan(projectFor(), planFor(["lint", "build"]));

    expect(viaExplicit).toEqual(viaInternal);
  });

  it("E: kernel consumers derive every dispatch fact from the contract alone", () => {
    const outcome = resolveAdapterContract(projectFor(), planFor(["test"]));
    expect(outcome.kind).toBe("resolved");
    if (outcome.kind !== "resolved") return;
    const contract = outcome.contract;
    // No manager input is required: the contract fully determines dispatch.
    const describe = (check: M2VerificationProfile): string =>
      `${contract.executable} ${adapterStepArgv(contract, check).join(" ")}@${contract.cwdRole}`;
    expect(describe("test")).toBe("npm test@project-root");
    expect(describe("build")).toBe("npm run build@project-root");
  });

  it("J: a pnpm task adapter is not externally accepted by the task contract", () => {
    expect(() =>
      parseM2TaskContract({
        schemaVersion: 1,
        taskId: "TASK-PNPM",
        adapter: "node-typescript/pnpm-scripts-v1",
        operation: "replace-existing-file",
        targetPath: "src/a.ts",
        expectedBeforeSha256: "a".repeat(64),
        replacementContent: "x",
        requiredVerification: ["test"],
      }),
    ).toThrow(/unsupported adapter/);
  });

  it("J: a pnpm-selected plan is unsupported at project detection", () => {
    const root = mkdtempSync(join(tmpdir(), "sureflow-m3-t1-"));
    temporaryRoots.push(root);
    const pnpmPlan = { ...planFor(["test"]), adapter: "node-typescript/pnpm-scripts-v1" } as unknown as ValidatedExecutionPlan;
    const outcome = detectProject(root, pnpmPlan);

    expect(outcome.kind).not.toBe("supported");
  });

  it("K: public CLI command set remains exactly init/run/status/verify", () => {
    expect([...APPROVED_COMMANDS]).toEqual(["init", "run", "status", "verify"]);
  });

  it("K: preflight is rejected as an unknown command with controlled exit 2", () => {
    const root = mkdtempSync(join(tmpdir(), "sureflow-m3-t1-"));
    temporaryRoots.push(root);
    const out: string[] = [];
    const err: string[] = [];
    const io: CliIo = { out: (line) => out.push(line), err: (line) => err.push(line) };

    const code = runCli(["preflight", "TASK-M3-T1"], root, io);

    expect(code).toBe(2);
    expect(err.join("\n")).toContain("unknown command 'preflight'");
  });
});
