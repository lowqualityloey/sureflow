import {
  cpSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  loadValidatedExecutionPlan,
  M2_ADAPTER_ID,
  M2_REPLACEMENT_OPERATION,
  M2_TASK_CONTRACT_SCHEMA_VERSION,
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
  VerificationArgv,
  VerificationPlan,
  VerificationSpawn,
  VerificationSpawnOptions,
  VerificationSpawnedProcess,
} from "../src/verificationAdapter.js";

const fixtureRoot = resolve("fixtures/m2-node-ts-project");
const temporaryRoots: string[] = [];

function planFor(requiredVerification: readonly M2VerificationProfile[]): ValidatedExecutionPlan {
  return Object.freeze({
    schemaVersion: M2_TASK_CONTRACT_SCHEMA_VERSION,
    taskId: "TASK-T3-TEST",
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
  root = resolve("/canonical/m2-project"),
  supportedChecks: readonly M2VerificationProfile[] = ["typecheck", "test", "lint", "build"],
): {
  readonly adapter: typeof M2_ADAPTER_ID;
  readonly root: string;
  readonly manifestPath: "package.json";
  readonly lockfilePath: "package-lock.json";
  readonly tsconfigPath: "tsconfig.json";
  readonly targetPath: string;
  readonly supportedChecks: readonly M2VerificationProfile[];
} {
  return Object.freeze({
    adapter: M2_ADAPTER_ID,
    root,
    manifestPath: "package.json",
    lockfilePath: "package-lock.json",
    tsconfigPath: "tsconfig.json",
    targetPath: "src/displayName.ts",
    supportedChecks: Object.freeze([...supportedChecks]),
  });
}

type FakeOutcome =
  | { readonly kind: "close"; readonly exitCode: number | null; readonly signal: NodeJS.Signals | null }
  | { readonly kind: "error" }
  | { readonly kind: "throw" };

function fakeProcess(
  outcome: Exclude<FakeOutcome, { readonly kind: "throw" }>,
): VerificationSpawnedProcess {
  class FakeProcess implements VerificationSpawnedProcess {
    public on(event: "error", listener: (error: Error) => void): this;
    public on(
      event: "close",
      listener: (exitCode: number | null, signal: NodeJS.Signals | null) => void,
    ): this;
    public on(event: "error" | "close", listener: unknown): this {
      if (event === "error" && outcome.kind === "error") {
        queueMicrotask(() => {
          (listener as (error: Error) => void)(new Error("spawn failed"));
        });
      }
      if (event === "close" && outcome.kind === "close") {
        queueMicrotask(() => {
          (listener as (exitCode: number | null, signal: NodeJS.Signals | null) => void)(
            outcome.exitCode,
            outcome.signal,
          );
        });
      }
      return this;
    }
  }
  return new FakeProcess();
}

interface SpawnCall {
  readonly executable: "npm";
  readonly argv: VerificationArgv;
  readonly options: VerificationSpawnOptions;
}

function recordingSpawn(outcomes: readonly FakeOutcome[]): {
  readonly calls: SpawnCall[];
  readonly spawn: VerificationSpawn;
} {
  const calls: SpawnCall[] = [];
  let index = 0;
  const spawn: VerificationSpawn = (executable, argv, options) => {
    calls.push({ executable, argv, options });
    const outcome = outcomes[index++];
    if (outcome?.kind === "throw") throw new Error("spawn threw");
    return fakeProcess(outcome ?? { kind: "close", exitCode: 0, signal: null });
  };
  return { calls, spawn };
}

function temporaryFixture(): string {
  const root = mkdtempSync(join(tmpdir(), "sureflow-m2-t3-"));
  temporaryRoots.push(root);
  cpSync(fixtureRoot, root, { recursive: true });
  mkdirSync(join(root, ".sureflow"), { recursive: true });
  writeFileSync(
    join(root, ".sureflow/task.json"),
    readFileSync(join(fixtureRoot, "task.example.json")),
  );
  return root;
}

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe("M2-T3 verification profile resolution", () => {
  it("maps every supported profile to the exact fixed npm invocation", () => {
    const result = resolveVerificationPlan(projectFor(), planFor(["typecheck", "test", "lint", "build"]));

    expect(result).toEqual({
      kind: "resolved",
      plan: {
        profile: M2_ADAPTER_ID,
        steps: [
          { check: "typecheck", executable: "npm", argv: ["run", "typecheck"], shell: false },
          { check: "test", executable: "npm", argv: ["test"], shell: false },
          { check: "lint", executable: "npm", argv: ["run", "lint"], shell: false },
          { check: "build", executable: "npm", argv: ["run", "build"], shell: false },
        ],
      },
    });
  });

  it("canonicalizes execution independently of task-contract ordering", () => {
    const result = resolveVerificationPlan(projectFor(), planFor(["build", "test", "typecheck"]));

    expect(result.kind).toBe("resolved");
    if (result.kind === "resolved") {
      expect(result.plan.steps.map((step) => step.check)).toEqual(["typecheck", "test", "build"]);
    }
  });

  it("selects only the required verification subset", () => {
    const result = resolveVerificationPlan(projectFor(), planFor(["lint", "build"]));

    expect(result.kind).toBe("resolved");
    if (result.kind === "resolved") {
      expect(result.plan.steps.map((step) => step.check)).toEqual(["lint", "build"]);
    }
  });

  it("refuses a missing required project check before any spawn", async () => {
    const result = resolveVerificationPlan(projectFor(resolve("/canonical/m2-project"), ["typecheck"]), planFor(["typecheck", "test"]));
    const recorder = recordingSpawn([]);

    expect(result).toEqual({ kind: "unsupported", missingChecks: ["test"] });
    if (result.kind === "resolved") await runVerificationPlan(projectFor(), result.plan, recorder.spawn);
    expect(recorder.calls).toHaveLength(0);
  });

  it("refuses an adapter mismatch before any spawn", async () => {
    const mismatchedProject = { ...projectFor(), adapter: "other-adapter" } as unknown as ReturnType<typeof projectFor>;
    const recorder = recordingSpawn([]);

    const result = resolveVerificationPlan(mismatchedProject, planFor(["test"]));

    expect(result).toEqual({ kind: "unsupported", missingChecks: [] });
    if (result.kind === "resolved") await runVerificationPlan(projectFor(), result.plan, recorder.spawn);
    expect(recorder.calls).toHaveLength(0);
  });

  it("exposes no caller-selected executable, shell, or extra argv fields", () => {
    const result = resolveVerificationPlan(projectFor(), planFor(["test"]));

    expect(result.kind).toBe("resolved");
    if (result.kind === "resolved") {
      expect(result.plan.steps[0]).toEqual({
        check: "test",
        executable: "npm",
        argv: ["test"],
        shell: false,
      });
      expect(Object.keys(result.plan.steps[0] ?? {}).sort()).toEqual([
        "argv",
        "check",
        "executable",
        "shell",
      ]);
    }
  });

  it("executes each resolved check exactly once in canonical order", async () => {
    const resolved = resolveVerificationPlan(projectFor(), planFor(["build", "test", "typecheck"]));
    const recorder = recordingSpawn([
      { kind: "close", exitCode: 0, signal: null },
      { kind: "close", exitCode: 0, signal: null },
      { kind: "close", exitCode: 0, signal: null },
    ]);
    expect(resolved.kind).toBe("resolved");
    if (resolved.kind !== "resolved") return;

    const results = await runVerificationPlan(projectFor(), resolved.plan, recorder.spawn);

    expect(recorder.calls.map((call) => call.argv)).toEqual([["run", "typecheck"], ["test"], ["run", "build"]]);
    expect(results).toEqual([
      { check: "typecheck", kind: "passed", exitCode: 0 },
      { check: "test", kind: "passed", exitCode: 0 },
      { check: "build", kind: "passed", exitCode: 0 },
    ]);
  });

  it("maps exit zero to passed", async () => {
    const recorder = recordingSpawn([{ kind: "close", exitCode: 0, signal: null }]);
    const resolved = resolveVerificationPlan(projectFor(), planFor(["test"]));
    expect(resolved.kind).toBe("resolved");
    if (resolved.kind !== "resolved") return;

    await expect(runVerificationPlan(projectFor(), resolved.plan, recorder.spawn)).resolves.toEqual([
      { check: "test", kind: "passed", exitCode: 0 },
    ]);
  });

  it("maps a non-zero exit to failed with its exact exit code", async () => {
    const recorder = recordingSpawn([{ kind: "close", exitCode: 17, signal: null }]);
    const resolved = resolveVerificationPlan(projectFor(), planFor(["test"]));
    expect(resolved.kind).toBe("resolved");
    if (resolved.kind !== "resolved") return;

    await expect(runVerificationPlan(projectFor(), resolved.plan, recorder.spawn)).resolves.toEqual([
      { check: "test", kind: "failed", exitCode: 17 },
    ]);
  });

  it("maps a thrown spawn to spawn-error", async () => {
    const recorder = recordingSpawn([{ kind: "throw" }]);
    const resolved = resolveVerificationPlan(projectFor(), planFor(["test"]));
    expect(resolved.kind).toBe("resolved");
    if (resolved.kind !== "resolved") return;

    await expect(runVerificationPlan(projectFor(), resolved.plan, recorder.spawn)).resolves.toEqual([
      { check: "test", kind: "spawn-error" },
    ]);
  });

  it("maps a process error event to spawn-error", async () => {
    const recorder = recordingSpawn([{ kind: "error" }]);
    const resolved = resolveVerificationPlan(projectFor(), planFor(["test"]));
    expect(resolved.kind).toBe("resolved");
    if (resolved.kind !== "resolved") return;

    await expect(runVerificationPlan(projectFor(), resolved.plan, recorder.spawn)).resolves.toEqual([
      { check: "test", kind: "spawn-error" },
    ]);
  });

  it("maps signal termination and preserves the exact signal", async () => {
    const recorder = recordingSpawn([{ kind: "close", exitCode: null, signal: "SIGTERM" }]);
    const resolved = resolveVerificationPlan(projectFor(), planFor(["test"]));
    expect(resolved.kind).toBe("resolved");
    if (resolved.kind !== "resolved") return;

    await expect(runVerificationPlan(projectFor(), resolved.plan, recorder.spawn)).resolves.toEqual([
      { check: "test", kind: "terminated", signal: "SIGTERM" },
    ]);
  });

  it("does not retry or skip later checks after a failure", async () => {
    const recorder = recordingSpawn([
      { kind: "close", exitCode: 9, signal: null },
      { kind: "close", exitCode: 0, signal: null },
      { kind: "close", exitCode: 0, signal: null },
    ]);
    const resolved = resolveVerificationPlan(projectFor(), planFor(["typecheck", "test", "lint"]));
    expect(resolved.kind).toBe("resolved");
    if (resolved.kind !== "resolved") return;

    const results = await runVerificationPlan(projectFor(), resolved.plan, recorder.spawn);

    expect(recorder.calls).toHaveLength(3);
    expect(results.map((result) => result.kind)).toEqual(["failed", "passed", "passed"]);
  });

  it("uses the canonical detected root and shell false for every spawn", async () => {
    const root = resolve("/canonical/physical/project");
    const recorder = recordingSpawn([
      { kind: "close", exitCode: 0, signal: null },
      { kind: "close", exitCode: 0, signal: null },
    ]);
    const resolved = resolveVerificationPlan(projectFor(root), planFor(["typecheck", "build"]));
    expect(resolved.kind).toBe("resolved");
    if (resolved.kind !== "resolved") return;

    await runVerificationPlan(projectFor(root), resolved.plan, recorder.spawn);

    expect(recorder.calls.map((call) => call.options)).toEqual([
      { cwd: root, shell: false, stdio: "ignore" },
      { cwd: root, shell: false, stdio: "ignore" },
    ]);
  });

  it("does not trust forged step command fields when executing a resolved plan", async () => {
    const resolved = resolveVerificationPlan(projectFor(), planFor(["test"]));
    const recorder = recordingSpawn([{ kind: "close", exitCode: 0, signal: null }]);
    expect(resolved.kind).toBe("resolved");
    if (resolved.kind !== "resolved") return;

    const forged = {
      ...resolved.plan,
      steps: [{ check: "test", executable: "sh", argv: ["-c", "touch escaped"], shell: true }],
    } as unknown as VerificationPlan;
    await runVerificationPlan(projectFor(), forged, recorder.spawn);

    expect(recorder.calls[0]).toMatchObject({
      executable: "npm",
      argv: ["test"],
      options: { shell: false },
    });
  });

  it("returns no execution for a forged non-canonical plan", async () => {
    const recorder = recordingSpawn([]);
    const forged = {
      profile: M2_ADAPTER_ID,
      steps: [
        { check: "build", executable: "npm", argv: ["run", "build"], shell: false },
        { check: "test", executable: "npm", argv: ["test"], shell: false },
      ],
    } as const;

    const results = await runVerificationPlan(projectFor(), forged, recorder.spawn);

    expect(results).toEqual([]);
    expect(recorder.calls).toHaveLength(0);
  });

  it("observes the fixture's expected pre-change failure while other checks pass", async () => {
    const root = temporaryFixture();
    const plan = loadValidatedExecutionPlan(root);
    const detected = detectProject(root, plan);
    expect(detected.kind).toBe("supported");
    if (detected.kind !== "supported") return;

    const resolved = resolveVerificationPlan(detected.project, plan);
    expect(resolved.kind).toBe("resolved");
    if (resolved.kind !== "resolved") return;

    const results = await runVerificationPlan(detected.project, resolved.plan);

    expect(results).toEqual([
      { check: "typecheck", kind: "passed", exitCode: 0 },
      { check: "test", kind: "failed", exitCode: 1 },
      { check: "lint", kind: "passed", exitCode: 0 },
      { check: "build", kind: "passed", exitCode: 0 },
    ]);
  });
});
