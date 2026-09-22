import {
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
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { afterEach, describe, expect, it } from "vitest";
import { executionLockPath, mutationLockExists, acquireMutationLock, releaseMutationLock } from "../src/mutationLock.js";
import { DEFAULT_M1_POLICY } from "../src/policy.js";
import { processInterruptionSource, runM2Task, verifyM2Task, type M2RunPhase } from "../src/m2Orchestration.js";
import { parseT0TaskFixture } from "../src/t0Fixture.js";
import { readEvidence, type EvidenceReadEntry } from "../src/evidenceStore.js";
import { initRuntimeState } from "../src/stateWriter.js";
import { runCliAsync } from "../src/cli.js";
import type { M2VerificationProfile } from "../src/taskContract.js";
import type {
  VerificationSpawnedProcess,
  VerificationStepResult,
} from "../src/verificationAdapter.js";
import {
  M3_OVERALL_BUDGET_MS,
  M3_TERMINATION_GRACE_MS,
  type InterruptionSource,
  type VerificationClock,
} from "../src/verificationExecution.js";

const fixtureRoot = resolve("fixtures/m2-node-ts-project");
const temporaryRoots: string[] = [];
const TASK_ID = "TASK-M2-FIXTURE-DISPLAY-NAME";

type VerificationKind = "passed" | "failed" | "spawn-error" | "terminated";

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

function git(root: string, args: readonly string[]): void {
  const result = spawnSync("git", [...args], { cwd: root, shell: false, stdio: "ignore" });
  if (result.status !== 0) throw new Error(`git ${args.join(" ")} failed`);
}

function tempRoot(): string {
  const root = mkdtempSync(join(tmpdir(), "sureflow-m2-t7-"));
  temporaryRoots.push(root);
  cpSync(fixtureRoot, root, { recursive: true });
  git(root, ["init", "--initial-branch", "main"]);
  git(root, ["config", "user.email", "sureflow-tests@example.invalid"]);
  git(root, ["config", "user.name", "Sureflow Tests"]);
  git(root, ["add", "."]);
  git(root, ["commit", "-m", "fixture baseline"]);
  initRuntimeState({
    rootDir: root,
    projectName: "m2-t7-test",
    nowIso: "2026-09-22T00:00:00.000Z",
    force: false,
  });
  writeContract(root);
  return root;
}

function readContract(): FixtureContract {
  return JSON.parse(
    readFileSync(join(fixtureRoot, "task.example.json"), "utf8"),
  ) as FixtureContract;
}

function writeContract(root: string, update: Partial<FixtureContract> = {}): void {
  writeFileSync(
    join(root, ".sureflow/task.json"),
    `${JSON.stringify({ ...readContract(), ...update }, null, 2)}\n`,
    "utf8",
  );
}

function setPolicy(
  root: string,
  allowlist: readonly string[] = DEFAULT_M1_POLICY.allowlist,
  protectedOperations: readonly string[] = DEFAULT_M1_POLICY.protectedOperations,
): void {
  writeFileSync(
    join(root, ".sureflow/policy/default.json"),
    `${JSON.stringify({ allowlist, protectedOperations }, null, 2)}\n`,
    "utf8",
  );
}

function planChecks(plan: {
  readonly requiredVerification?: readonly M2VerificationProfile[];
  readonly steps?: readonly { readonly check: M2VerificationProfile }[];
}): readonly M2VerificationProfile[] {
  return plan.requiredVerification ?? plan.steps?.map((step) => step.check) ?? [];
}

function successfulVerification(
  _project: unknown,
  plan: { readonly steps: readonly { readonly check: M2VerificationProfile }[] },
): Promise<readonly { readonly check: M2VerificationProfile; readonly kind: "passed"; readonly exitCode: 0 }[]> {
  return Promise.resolve(
    planChecks(plan).map((check) => ({ check, kind: "passed" as const, exitCode: 0 as const })),
  );
}

function verificationResults(
  plan: { readonly requiredVerification?: readonly M2VerificationProfile[]; readonly steps?: readonly { readonly check: M2VerificationProfile }[] },
  kind: VerificationKind = "passed",
): readonly VerificationStepResult[] {
  return planChecks(plan).map((check, index) => {
    if (kind === "failed" && index === 0) return { check, kind: "failed", exitCode: 17 };
    if (kind === "terminated" && index === 0) return { check, kind: "terminated", signal: "SIGTERM" };
    if (kind === "spawn-error" && index === 0) return { check, kind: "spawn-error" };
    return { check, kind: "passed", exitCode: 0 };
  });
}

interface BoundedFakeClock extends VerificationClock {
  advance(ms: number): void;
}

/** Deterministic manual clock/timer seam for bounded-execution tests. */
function boundedFakeClock(start = 0): BoundedFakeClock {
  let now = start;
  let nextId = 1;
  const timers = new Map<number, { at: number; callback: () => void }>();
  return {
    now: () => now,
    setTimeout: (callback, delayMs) => {
      const id = nextId++;
      timers.set(id, { at: now + Math.max(0, delayMs), callback });
      return id;
    },
    clearTimeout: (handle) => {
      timers.delete(handle as number);
    },
    advance: (ms) => {
      const target = now + ms;
      for (;;) {
        let next: number | null = null;
        for (const [id, timer] of timers) {
          if (timer.at <= target && (next === null || timer.at < (timers.get(next)?.at ?? Infinity))) {
            next = id;
          }
        }
        if (next === null) break;
        const timer = timers.get(next);
        if (timer === undefined) break;
        timers.delete(next);
        now = timer.at;
        timer.callback();
      }
      now = target;
    },
  };
}

/** Fake direct child that never emits error/close on its own. */
function neverClosingChild(): VerificationSpawnedProcess {
  // The child records nothing: this fake exists only to stay open so a
  // deadline or a controlled interruption settles the step.
  const child: VerificationSpawnedProcess = {
    on: () => child,
    kill: () => true,
  };
  return child;
}

/** Synthetic interruption source: no real process signals are ever sent. */
function syntheticInterruption(): InterruptionSource & {
  emit(signal: "SIGINT" | "SIGTERM"): void;
} {
  const listeners = new Set<(signal: "SIGINT" | "SIGTERM") => void>();
  return {
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    emit: (signal) => {
      for (const listener of [...listeners]) listener(signal);
    },
  };
}

/**
 * Drive a bounded run to settlement with the fake clock only: flush pending
 * microtasks and advance the cleanup grace repeatedly. Never waits on real
 * timers and fails fast instead of hanging.
 */
async function settleWithClock<T>(pending: Promise<T>, clock: BoundedFakeClock): Promise<T> {
  let settled = false;
  const settledYet = (): boolean => settled;
  const tracked = pending.then(
    (value) => {
      settled = true;
      return value;
    },
    (error: unknown) => {
      settled = true;
      throw error;
    },
  );
  const iterations = Math.ceil(M3_OVERALL_BUDGET_MS / M3_TERMINATION_GRACE_MS) + 1;
  for (let step = 0; step < iterations && !settledYet(); step += 1) {
    clock.advance(M3_TERMINATION_GRACE_MS);
    await Promise.resolve();
  }
  expect(settled).toBe(true);
  return tracked;
}

function taskStatus(root: string): string {
  const task = JSON.parse(
    readFileSync(join(root, `.sureflow/state/tasks/${TASK_ID}.json`), "utf8"),
  ) as { readonly status: string };
  return task.status;
}

function targetBytes(root: string): string {
  return readFileSync(join(root, "src/displayName.ts"), "utf8");
}

async function run(
  root: string,
  options: Parameters<typeof runM2Task>[1] = { runVerification: successfulVerification },
) {
  return runM2Task({ rootDir: root, requestedTaskId: TASK_ID }, options);
}

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe("M2-T7 single orchestration", () => {
  it.skipIf(process.platform === "win32").each(["package.json", "package-lock.json", "tsconfig.json"] as const)("halts before spawning when %s is replaced by an escaping symlink", async (inputName) => {
      const root = tempRoot();
      const outside = mkdtempSync(join(tmpdir(), "sureflow-m3-outside-"));
      temporaryRoots.push(outside);
      const outsideFile = join(outside, inputName);
      writeFileSync(outsideFile, readFileSync(join(root, inputName)));
      let spawned = false;
      const outcome = await run(root, {
        runVerification: (_project, plan) => {
          spawned = true;
          return successfulVerification(_project, plan);
        },
        onPhase: (phase) => {
          if (phase === "replacement-applied") {
            unlinkSync(join(root, inputName));
            symlinkSync(outsideFile, join(root, inputName));
          }
        },
      });
      expect(outcome.kind).toBe("halted");
      expect(outcome.reason).toContain("verification input binding");
      expect(spawned).toBe(false);
    });

  it("installs and removes real process interruption listeners per run", () => {
    const source = processInterruptionSource();
    const beforeInt = process.listenerCount("SIGINT");
    const beforeTerm = process.listenerCount("SIGTERM");
    const unsubscribe = source.subscribe(() => {});
    expect(process.listenerCount("SIGINT")).toBe(beforeInt + 1);
    expect(process.listenerCount("SIGTERM")).toBe(beforeTerm + 1);
    unsubscribe();
    expect(process.listenerCount("SIGINT")).toBe(beforeInt);
    expect(process.listenerCount("SIGTERM")).toBe(beforeTerm);
  });

  it("executes the complete M2 order and accepts only after T6 PASS", async () => {
    const root = tempRoot();
    const phases: M2RunPhase[] = [];
    const outcome = await run(root, { runVerification: successfulVerification, onPhase: (phase) => { phases.push(phase); } });
    expect(outcome.kind).toBe("accepted");
    expect(outcome.transitions).toEqual(["pending", "running", "accepted"]);
    expect(taskStatus(root)).toBe("accepted");
    expect(phases).toEqual([
      "plan-loaded", "project-detected", "verification-resolved", "baseline-captured",
      "replacement-preflighted", "task-running", "replacement-applied",
      "verification-complete", "contract-rechecked", "scope-captured",
      "evidence-appended", "verdict-computed",
    ]);
    expect(readEvidence(root).filter((entry) => entry.kind === "record")).toHaveLength(8);
  });

  it("routes the direct async CLI to M2 and returns exit 0 on acceptance", async () => {
    const root = tempRoot();
    const result = await cliAsync(["run", TASK_ID], root);
    expect(result.code).toBe(0);
    expect(result.out).toContain("ACCEPT");
  });

  it("routes the public verify command to persisted M2 evidence", async () => {
    const root = tempRoot();
    expect((await run(root)).kind).toBe("accepted");
    const result = await cliAsync(["verify", TASK_ID], root);
    expect(result.code).toBe(0);
    expect(result.out).toContain("PASS");
  });

  it("does not fall back to T0 when an existing M2 contract is malformed", async () => {
    const root = tempRoot();
    writeFileSync(join(root, ".sureflow/task.json"), "{malformed\n", "utf8");
    const outcome = await run(root);
    expect(outcome.kind).toBe("halted");
    expect(outcome.reason).toContain("invalid M2 task contract");
    expect(existsSync(join(root, ".sureflow/state/tasks", `${TASK_ID}.json`))).toBe(false);
  });

  it("halts a requested taskId mismatch before state or project mutation", async () => {
    const root = tempRoot();
    const before = targetBytes(root);
    const outcome = await runM2Task({ rootDir: root, requestedTaskId: "TASK-OTHER" }, { runVerification: successfulVerification });
    expect(outcome.kind).toBe("halted");
    expect(outcome.reason).toContain("does not match");
    expect(targetBytes(root)).toBe(before);
    expect(readdirSync(join(root, ".sureflow/state/tasks"))).toEqual([]);
  });

  it("halts an unsupported project before mutation", async () => {
    const root = tempRoot();
    writeFileSync(join(root, "package.json"), "{}\n", "utf8");
    const before = targetBytes(root);
    const outcome = await run(root);
    expect(outcome.kind).toBe("halted");
    expect(outcome.reason).toContain("project detection");
    expect(targetBytes(root)).toBe(before);
    expect(readdirSync(join(root, ".sureflow/state/tasks"))).toEqual([]);
  });

  it("halts a missing required verification script before mutation", async () => {
    const root = tempRoot();
    const packageJson = JSON.parse(readFileSync(join(root, "package.json"), "utf8")) as { scripts: Record<string, string> };
    delete packageJson.scripts.build;
    writeFileSync(join(root, "package.json"), `${JSON.stringify(packageJson)}\n`, "utf8");
    const before = targetBytes(root);
    const outcome = await run(root);
    expect(outcome.kind).toBe("halted");
    expect(outcome.reason).toContain("project detection unsupported");
    expect(targetBytes(root)).toBe(before);
  });

  it("halts a dirty Git-visible baseline before task creation", async () => {
    const root = tempRoot();
    writeFileSync(join(root, "README.md"), "dirty\n", "utf8");
    const before = targetBytes(root);
    const outcome = await run(root);
    expect(outcome.kind).toBe("halted");
    expect(outcome.reason).toContain("project baseline dirty");
    expect(targetBytes(root)).toBe(before);
    expect(readdirSync(join(root, ".sureflow/state/tasks"))).toEqual([]);
  });

  it.each([
    ["repo.read", ["repo.write", "repo.verify"]],
    ["repo.write", ["repo.read", "repo.verify"]],
    ["repo.verify", ["repo.read", "repo.write"]],
  ] as const)("halts pre-write when policy denies %s", async (blocked, allowed) => {
    const root = tempRoot();
    setPolicy(root, allowed);
    const before = targetBytes(root);
    const outcome = await run(root);
    expect(outcome.kind).toBe("halted");
    expect(outcome.reason).toContain(blocked);
    expect(targetBytes(root)).toBe(before);
    expect(readdirSync(join(root, ".sureflow/state/tasks"))).toEqual([]);
  });

  it("halts pre-write when a required capability requires approval", async () => {
    const root = tempRoot();
    setPolicy(root, DEFAULT_M1_POLICY.allowlist, ["repo.verify"]);
    const before = targetBytes(root);
    const outcome = await run(root);
    expect(outcome.kind).toBe("halted");
    expect(outcome.reason).toContain("require_approval");
    expect(targetBytes(root)).toBe(before);
    expect(readdirSync(join(root, ".sureflow/state/tasks"))).toEqual([]);
  });

  it("refuses replay when task state already exists", async () => {
    const root = tempRoot();
    const first = await run(root);
    expect(first.kind).toBe("accepted");
    const second = await run(root);
    expect(second.kind).toBe("halted");
    expect(second.reason).toContain("task state already exists");
  });

  it("refuses replay when same-task terminal evidence already exists", async () => {
    const root = tempRoot();
    const first = await run(root);
    expect(first.kind).toBe("accepted");
    unlinkSync(join(root, `.sureflow/state/tasks/${TASK_ID}.json`));
    const replay = await run(root);
    expect(replay.kind).toBe("halted");
    expect(replay.reason).toContain("terminal evidence");
  });

  it("refuses replay when existing evidence is corrupt", async () => {
    const root = tempRoot();
    mkdirSync(join(root, ".sureflow/evidence"), { recursive: true });
    writeFileSync(join(root, ".sureflow/evidence/evidence.jsonl"), "{corrupt\n", "utf8");
    const outcome = await run(root);
    expect(outcome.kind).toBe("halted");
    expect(outcome.reason).toContain("corrupt or unreadable");
  });

  it("refuses a stale preimage before creating task state", async () => {
    const root = tempRoot();
    writeFileSync(join(root, "src/displayName.ts"), "stale\n", "utf8");
    git(root, ["add", "src/displayName.ts"]);
    git(root, ["commit", "-m", "stale target baseline"]);
    const outcome = await run(root);
    expect(outcome.kind).toBe("halted");
    expect(outcome.reason).toContain("replacement preflight refused");
    expect(readdirSync(join(root, ".sureflow/state/tasks"))).toEqual([]);
  });

  it("records a failed verification without retry and preserves the bounded change", async () => {
    const root = tempRoot();
    const outcome = await run(root, {
      runVerification: (_project, plan) => Promise.resolve(verificationResults(plan, "failed")),
    });
    expect(outcome.kind).toBe("halted");
    expect(outcome.verdict).toBe("FAIL");
    expect(outcome.verificationResults).toHaveLength(4);
    expect(taskStatus(root)).toBe("halted");
    expect(targetBytes(root)).toContain("-");
  });

  it.each(["spawn-error", "terminated"] as const)("records %s and preserves the bounded change", async (kind) => {
    const root = tempRoot();
    const outcome = await run(root, {
      runVerification: (_project, plan) => Promise.resolve(verificationResults(plan, kind)),
    });
    expect(outcome.kind).toBe("halted");
    expect(outcome.verdict).toBe("FAIL");
    expect(taskStatus(root)).toBe("halted");
    expect(targetBytes(root)).toContain("-");
  });

  it("records an execution-time contract integrity mismatch and never accepts", async () => {
    const root = tempRoot();
    const outcome = await run(root, {
      runVerification: successfulVerification,
      onPhase: (phase) => {
        if (phase === "verification-complete") writeContract(root, { replacementContent: "changed plan\n" });
      },
    });
    expect(outcome.kind).toBe("halted");
    expect(outcome.verdict).toBe("FAIL");
    expect(readEvidence(root).some((entry) => entry.kind === "record" && entry.record.result.startsWith("integrity-mismatch:"))).toBe(true);
    expect(targetBytes(root)).toContain("-");
  });

  it("records a post-write scope violation and leaves changes in place", async () => {
    const root = tempRoot();
    const outcome = await run(root, {
      runVerification: () => {
        writeFileSync(join(root, "unauthorized.txt"), "unexpected\n", "utf8");
        return Promise.resolve(verificationResults({ requiredVerification: ["typecheck", "test", "lint", "build"] }));
      },
    });
    expect(outcome.kind).toBe("halted");
    expect(outcome.verdict).toBe("FAIL");
    expect(readEvidence(root).some((entry) => entry.kind === "record" && entry.record.result.startsWith("violation:"))).toBe(true);
    expect(targetBytes(root)).toContain("-");
  });

  it("never accepts when terminal evidence persistence fails", async () => {
    const root = tempRoot();
    await runM2Task({ rootDir: root, requestedTaskId: TASK_ID }, {
      runVerification: successfulVerification,
      onPhase: (phase) => {
        if (phase === "replacement-applied") {
          rmSync(join(root, ".sureflow/evidence"), { recursive: true, force: true });
          mkdirSync(join(root, ".sureflow/evidence/evidence.jsonl"), { recursive: true });
        }
      },
    }).then((outcome) => {
      expect(outcome.kind).toBe("halted");
      expect(outcome.reason).toContain("evidence persistence");
    });
    expect(taskStatus(root)).toBe("halted");
  });

  it("halts with no project write when the mutation lock is busy", async () => {
    const root = tempRoot();
    const lock = acquireMutationLock(root, "run");
    try {
      const before = targetBytes(root);
      const outcome = await run(root);
      expect(outcome.kind).toBe("halted");
      expect(outcome.reason).toContain("mutation already in progress");
      expect(targetBytes(root)).toBe(before);
    } finally {
      releaseMutationLock(lock);
    }
  });

  it("does not report acceptance when the owner-token release check fails", async () => {
    const root = tempRoot();
    const outcome = await run(root, {
      runVerification: successfulVerification,
      onPhase: (phase) => {
        if (phase === "verdict-computed") {
          unlinkSync(executionLockPath(root));
          writeFileSync(executionLockPath(root), `${JSON.stringify({ ownerToken: "replacement-owner" })}\n`, "utf8");
        }
      },
    });
    expect(outcome.kind).toBe("halted");
    expect(outcome.reason).toContain("ownership changed");
    expect(mutationLockExists(root)).toBe(true);
    expect(taskStatus(root)).toBe("accepted");
  });

  it("holds the existing mutation lock while verification executes", async () => {
    const root = tempRoot();
    let heldDuringVerification = false;
    const outcome = await run(root, {
      runVerification: (_project, plan) => {
        heldDuringVerification = mutationLockExists(root);
        return Promise.resolve(verificationResults(plan));
      },
    });
    expect(outcome.kind).toBe("accepted");
    expect(heldDuringVerification).toBe(true);
    expect(mutationLockExists(root)).toBe(false);
  });

  it("verifies accepted M2 evidence without touching project source", async () => {
    const root = tempRoot();
    const runOutcome = await run(root);
    expect(runOutcome.kind).toBe("accepted");
    const before = targetBytes(root);
    const outcome = verifyM2Task({ rootDir: root, requestedTaskId: TASK_ID });
    expect(outcome.kind).toBe("verified");
    expect(outcome.verdict).toBe("PASS");
    expect(targetBytes(root)).toBe(before);
  });

  it("reconciles stale accepted state to halted on FAIL", async () => {
    const root = tempRoot();
    expect((await run(root)).kind).toBe("accepted");
    writeFileSync(join(root, ".sureflow/evidence/evidence.jsonl"), "{}\n", "utf8");
    const outcome = verifyM2Task({ rootDir: root, requestedTaskId: TASK_ID });
    expect(outcome.kind).toBe("halted");
    expect(outcome.verdict).toBe("UNKNOWN");
    expect(taskStatus(root)).toBe("halted");
  });

  it("reconciles stale accepted state to halted on UNKNOWN", async () => {
    const root = tempRoot();
    expect((await run(root)).kind).toBe("accepted");
    unlinkSync(join(root, ".sureflow/evidence/evidence.jsonl"));
    const outcome = verifyM2Task({ rootDir: root, requestedTaskId: TASK_ID });
    expect(outcome.kind).toBe("halted");
    expect(outcome.verdict).toBe("UNKNOWN");
    expect(taskStatus(root)).toBe("halted");
  });

  it("treats a fresh current contract differing from evidence as UNKNOWN", async () => {
    const root = tempRoot();
    expect((await run(root)).kind).toBe("accepted");
    writeFileSync(
      join(root, ".sureflow/task.json"),
      JSON.stringify(readContract()),
      "utf8",
    );
    const outcome = verifyM2Task({ rootDir: root, requestedTaskId: TASK_ID });
    expect(outcome.verdict).toBe("UNKNOWN");
    expect(taskStatus(root)).toBe("halted");
  });

  it("T3: a per-step timeout cannot PASS and releases the mutation lock", async () => {
    const root = tempRoot();
    const clock = boundedFakeClock();
    const child = neverClosingChild();
    // Drive the bounded run with the fake clock only: the per-step allowance
    // and cleanup grace elapse without any real waiting.
    const outcome = await settleWithClock(
      runM2Task(
        { rootDir: root, requestedTaskId: TASK_ID },
        {
          verificationSpawn: () => child,
          verificationClock: clock,
        },
      ),
      clock,
    );
    expect(outcome.kind).toBe("halted");
    expect(outcome.verdict).toBe("FAIL");
    expect(taskStatus(root)).toBe("halted");
    expect(mutationLockExists(root)).toBe(false);
    const records = readEvidence(root).filter(
      (entry): entry is Extract<EvidenceReadEntry, { kind: "record" }> => entry.kind === "record",
    );
    const verify = records.filter((entry) => entry.record.capability === "repo.verify");
    expect(verify).toHaveLength(1);
    expect(verify[0]?.record.result).toBe("timed-out");
    expect(verify[0]?.record.schemaVersion).toBe(2);
    // Unstarted steps are never fabricated.
    expect(records.filter((entry) => entry.record.capability === "repo.verify")).toHaveLength(1);
  });

  it("T3: a controlled interruption halts through the normal lock release path", async () => {
    const root = tempRoot();
    const interruption = syntheticInterruption();
    const child = neverClosingChild();
    const clock = boundedFakeClock();
    const outcome = await settleWithClock(
      runM2Task(
        { rootDir: root, requestedTaskId: TASK_ID },
        {
          verificationSpawn: () => {
            interruption.emit("SIGTERM");
            return child;
          },
          verificationClock: clock,
          verificationInterruption: interruption,
        },
      ),
      clock,
    );
    expect(outcome.kind).toBe("halted");
    expect(outcome.verdict).toBe("FAIL");
    expect(taskStatus(root)).toBe("halted");
    expect(mutationLockExists(root)).toBe(false);
    const verify = readEvidence(root).filter(
      (entry): entry is Extract<EvidenceReadEntry, { kind: "record" }> =>
        entry.kind === "record" && entry.record.capability === "repo.verify",
    );
    expect(verify).toHaveLength(1);
    expect(verify[0]?.record.result).toBe("interrupted:SIGTERM");
    expect(verify[0]?.record.target).toBe(
      "node-typescript/npm-scripts-v1:typecheck",
    );
  });

  it("keeps T0 fixture parsing closed to repo.verify", () => {
    expect(() => parseT0TaskFixture({
      taskId: "TASK-T0",
      capability: "repo.verify",
      target: "src/file.ts",
      expectedResult: "ok",
    })).toThrow(/approved M1 capability/);
  });

  it("keeps the public command set unchanged", async () => {
    const root = tempRoot();
    const result = await cliAsync(["--help"], root);
    expect(result.code).toBe(0);
    expect(result.out).toContain("init, run, status, verify");
    expect(result.out).not.toContain("m2");
  });

  it("keeps controlled halts at exit code 2 for an invalid M2 task", async () => {
    const root = tempRoot();
    writeContract(root, { requiredVerification: ["typecheck", "typecheck"] as never });
    const result = await cliAsync(["run", TASK_ID], root);
    expect(result.code).toBe(2);
    expect(result.err).toContain("HALT");
  });

  it("keeps the public M2 argument contract exact", async () => {
    const root = tempRoot();
    const result = await cliAsync(["run", TASK_ID, "extra"], root);
    expect(result.code).toBe(2);
    expect(result.err).toContain("requires exactly one taskId");
  });
});

async function cliAsync(
  argv: readonly string[],
  cwd: string,
): Promise<{ readonly code: number; readonly out: string; readonly err: string }> {
  const out: string[] = [];
  const err: string[] = [];
  const code = await runCliAsync(argv, cwd, {
    out: (line) => out.push(line),
    err: (line) => err.push(line),
  });
  return { code, out: out.join("\n"), err: err.join("\n") };
}
