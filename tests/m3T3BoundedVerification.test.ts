import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  M3_OVERALL_BUDGET_SECONDS,
  M3_STEP_LIMIT_SECONDS,
  M3_TERMINATION_GRACE_SECONDS,
  digestInputBindingV1,
  digestResolvedPlanV1,
  encodeExecutionProvenanceV2,
  encodeInputBindingV1,
  parseExecutionProvenanceV2,
  parseInputBindingV1,
} from "../src/evidenceV2.js";
import { M3_ADAPTER_CONTRACT_VERSION } from "../src/projectAdapter.js";
import type { M2VerificationProfile } from "../src/taskContract.js";
import type { DetectedNodeTypeScriptProject } from "../src/projectDetection.js";
import {
  monotonicVerificationClock,
  runBoundedVerificationPlan,
  M3_OVERALL_BUDGET_MS,
  M3_STEP_LIMIT_MS,
  M3_TERMINATION_GRACE_MS,
  type InterruptionSource,
  type VerificationClock,
  type VerificationInterruptSignal,
} from "../src/verificationExecution.js";
import {
  resolveExecutableChecks,
  stepForContract,
  type VerificationArgv,
  type VerificationSpawn,
  type VerificationSpawnedProcess,
} from "../src/verificationAdapter.js";
import { verifyProjectChange } from "../src/projectChangeVerifier.js";
import { createExecutionContextV2, decodeTerminalCause } from "../src/evidenceV2.js";
import type { EvidenceReadEntry } from "../src/evidenceStore.js";
import type { ValidatedExecutionPlan } from "../src/taskContract.js";

const NPM_PROJECT = Object.freeze({
  adapter: "node-typescript/npm-scripts-v1",
  root: "/repo",
  manifestPath: "package.json",
  lockfilePath: "package-lock.json",
  tsconfigPath: "tsconfig.json",
  targetPath: "src/a.ts",
  supportedChecks: ["typecheck", "test", "lint", "build"],
}) as unknown as DetectedNodeTypeScriptProject;

function argvFor(check: M2VerificationProfile): VerificationArgv {
  if (check === "test") return ["test"];
  if (check === "typecheck") return ["run", "typecheck"];
  if (check === "lint") return ["run", "lint"];
  return ["run", "build"];
}

function npmPlan(checks: readonly M2VerificationProfile[] = ["typecheck", "test", "lint", "build"]) {
  return Object.freeze({
    profile: "node-typescript/npm-scripts-v1" as const,
    steps: Object.freeze(
      checks.map((check) => ({
        check,
        executable: "npm" as const,
        argv: argvFor(check),
        shell: false as const,
      })),
    ),
  });
}

function fakeClock(start = 1000): VerificationClock & { advance(ms: number): void; pendingTimers(): number } {
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
    clearTimeout: (handle) => { timers.delete(handle as number); },
    advance: (ms: number) => {
      const target = now + ms;
      for (;;) {
        let next: number | null = null;
        for (const [id, t] of timers) {
          if (t.at <= target && (next === null || t.at < (timers.get(next)?.at ?? Infinity))) next = id;
        }
        if (next === null) break;
        const t = timers.get(next);
        if (t === undefined) break;
        timers.delete(next);
        now = t.at;
        t.callback();
      }
      now = target;
    },
    pendingTimers: () => timers.size,
  };
}

function manualInterruption(): InterruptionSource & { emit(s: VerificationInterruptSignal): void } {
  const listeners = new Set<(s: VerificationInterruptSignal) => void>();
  return {
    subscribe: (l) => { listeners.add(l); return () => { listeners.delete(l); }; },
    emit: (s) => { for (const l of [...listeners]) l(s); },
  };
}

interface FakeChild {
  readonly process: VerificationSpawnedProcess;
  emitError(e: Error): void;
  emitClose(code: number | null, sig: NodeJS.Signals | null): void;
  kills(): NodeJS.Signals[];
}

interface FakeChildOptions {
  readonly kill?: (signal: NodeJS.Signals) => boolean;
  readonly omitKill?: boolean;
}

type ErrorListener = (error: Error) => void;
type CloseListener = (exitCode: number | null, signal: NodeJS.Signals | null) => void;

function fakeChild(options: FakeChildOptions = {}): FakeChild {
  const errs: Array<(e: Error) => void> = [];
  const closes: Array<(c: number | null, s: NodeJS.Signals | null) => void> = [];
  const kills: NodeJS.Signals[] = [];
  function on(event: "error", listener: ErrorListener): VerificationSpawnedProcess;
  function on(event: "close", listener: CloseListener): VerificationSpawnedProcess;
  function on(event: "error" | "close", listener: ErrorListener | CloseListener): VerificationSpawnedProcess {
    if (event === "error") errs.push(listener as ErrorListener);
    else closes.push(listener as CloseListener);
    return proc;
  }
  const kill = options.kill ?? ((signal: NodeJS.Signals): boolean => {
    kills.push(signal);
    return true;
  });
  const proc: VerificationSpawnedProcess = options.omitKill ? { on } : { on, kill };
  return {
    process: proc,
    emitError: (e) => { for (const l of [...errs]) l(e); },
    emitClose: (c, s) => { for (const l of [...closes]) l(c, s); },
    kills: () => kills,
  };
}
function scriptedSpawn(script: (call: number) => FakeChild, calls: { count: number }): VerificationSpawn {
  return () => { calls.count += 1; return script(calls.count).process; };
}

const PLAN: ValidatedExecutionPlan = Object.freeze({
  schemaVersion: 1,
  taskId: "TASK-M3-T3",
  adapter: "node-typescript/npm-scripts-v1",
  operation: "replace-existing-file",
  targetPath: "src/a.ts",
  expectedBeforeSha256: "b".repeat(64),
  replacementContent: "export const a = 1;\n",
  requiredVerification: Object.freeze(["typecheck", "test", "lint", "build"] as const),
  contractSha256: "c".repeat(64),
  source: Object.freeze({ path: ".sureflow/task.json", sha256: "c".repeat(64) }),
});

function v1Record(capability: string, target: string, result: string, line: number): EvidenceReadEntry {
  return {
    kind: "record", line,
    record: {
      schemaVersion: 1 as const, actor: "worker:m2", recordedAt: "2026-09-22T00:00:00.000Z",
      taskId: PLAN.taskId, capability, policyDecision: "ALLOW", target, result, provenance: "sureflow:m3-t3",
    },
  };
}

const AFTER_SHA = createHash("sha256").update("export const a = 1;\n", "utf8").digest("hex");

/** Contract snapshot + replacement + scope records plus the run binding. */
function completeTupleV1(bindingResult: string): EvidenceReadEntry[] {
  return [
    v1Record("repo.read", ".sureflow/task.json", `sha256:${"c".repeat(64)};provenance=control-plane-task-input`, 1),
    v1Record("repo.write", "src/a.ts", `sha256:${"b".repeat(64)}->${AFTER_SHA}`, 2),
    v1Record("repo.read", "project-scope", "compliant", 3),
    bindingV1("verification-input-binding", bindingResult, 4),
  ];
}

function bindingSupport(): { bindingResult: string; bindingDigest: string; provenance: string } {
  const fp = {
    manifestPath: "package.json" as const,
    manifestSha256: createHash("sha256").update("manifest", "utf8").digest("hex"),
    lockfilePath: "package-lock.json" as const,
    lockfileSha256: createHash("sha256").update("lock", "utf8").digest("hex"),
    tsconfigPath: "tsconfig.json" as const,
    tsconfigSha256: createHash("sha256").update("tsconfig", "utf8").digest("hex"),
    planDigest: digestResolvedPlanV1({
      adapterId: "node-typescript/npm-scripts-v1",
      adapterContractVersion: M3_ADAPTER_CONTRACT_VERSION,
      executable: "npm", cwdRole: "project-root",
      steps: (["typecheck", "test", "lint", "build"] as const).map((check) => ({
        check, argv: argvFor(check),
      })),
    }),
  };
  const bindingResult = encodeInputBindingV1(fp);
  const bindingDigest = digestInputBindingV1(bindingResult);
  return { bindingResult, bindingDigest, provenance: encodeExecutionProvenanceV2(bindingDigest) };
}

function v2Verify(target: string, cause: string, prov: string, line: number): EvidenceReadEntry {
  const decoded = decodeTerminalCause(cause);
  if (decoded === null) throw new Error(`bad cause: ${cause}`);
  return {
    kind: "record", line,
    record: {
      schemaVersion: 2 as const, actor: "worker:m2", recordedAt: "2026-09-22T00:00:00.000Z",
      taskId: PLAN.taskId, capability: "repo.verify", policyDecision: "ALLOW",
      target, result: cause, provenance: prov,
      executionContext: createExecutionContextV2({
        adapterId: "node-typescript/npm-scripts-v1", contractVersion: M3_ADAPTER_CONTRACT_VERSION,
        manager: "npm", executable: "npm", cwdRole: "project-root",
        verificationProfiles: ["typecheck", "test", "lint", "build"],
        dispatch: { typecheck: ["run", "typecheck"], test: ["test"], lint: ["run", "lint"], build: ["run", "build"] },
      }, ["test"], decoded),
    },
  };
}

function bindingV1(target: string, result: string, line: number): EvidenceReadEntry {
  return {
    kind: "record", line,
    record: {
      schemaVersion: 1 as const, actor: "worker:m2", recordedAt: "2026-09-22T00:00:00.000Z",
      taskId: PLAN.taskId, capability: "repo.read", policyDecision: "ALLOW",
      target, result, provenance: "verification-input-binding-v1",
    },
  };
}
describe("M3-T3 execution envelope", () => {
  it("pins fixed envelope and monotonic clock", () => {
    expect(M3_STEP_LIMIT_SECONDS).toBe(120);
    expect(M3_OVERALL_BUDGET_SECONDS).toBe(300);
    expect(M3_TERMINATION_GRACE_SECONDS).toBe(5);
    expect(M3_STEP_LIMIT_MS).toBe(120000);
    expect(M3_OVERALL_BUDGET_MS).toBe(300000);
    expect(M3_TERMINATION_GRACE_MS).toBe(5000);
    expect(monotonicVerificationClock.now() <= monotonicVerificationClock.now()).toBe(true);
  });

  it("passes npm steps in canonical order", async () => {
    const clock = fakeClock();
    const children = [fakeChild(), fakeChild()];
    const calls = { count: 0 };
    const spawn = scriptedSpawn((call) => {
      const c = children[call - 1];
      if (c === undefined) throw new Error("unexpected spawn");
      return c;
    }, calls);
    const pending = runBoundedVerificationPlan(NPM_PROJECT, npmPlan(["typecheck", "test"]), { spawn, clock });
    children[0]?.emitClose(0, null);
    await Promise.resolve();
    clock.advance(1);
    children[1]?.emitClose(0, null);
    const out = await pending;
    expect(out.results.map((r) => r.kind)).toEqual(["passed", "passed"]);
    expect(out.stoppedEarly).toBe(false);
    expect(clock.pendingTimers()).toBe(0);
  });

  it("maps failure, throws, and independent signals", async () => {
    const failed = await runBoundedVerificationPlan(NPM_PROJECT, npmPlan(["typecheck"]), {
      spawn: () => { throw new Error("sync"); }, clock: fakeClock(),
    });
    expect(failed.results[0]).toMatchObject({ kind: "spawn-error" });
    for (const sig of ["SIGKILL", "SIGINT", "SIGTERM"] as const) {
      const child = fakeChild();
      const p = runBoundedVerificationPlan(NPM_PROJECT, npmPlan(["test"]), {
        spawn: () => child.process, clock: fakeClock(),
      });
      child.emitClose(null, sig);
      const o = await p;
      expect(o.results[0]).toEqual({ check: "test", kind: "terminated", signal: sig });
      expect(o.stoppedEarly).toBe(false);
    }
    const ae = fakeChild();
    const ap = runBoundedVerificationPlan(NPM_PROJECT, npmPlan(["lint"]), {
      spawn: () => ae.process, clock: fakeClock(),
    });
    ae.emitError(new Error("async"));
    expect((await ap).results[0]).toMatchObject({ kind: "spawn-error" });
    const nc = fakeChild();
    const np = runBoundedVerificationPlan(NPM_PROJECT, npmPlan(["build"]), {
      spawn: () => nc.process, clock: fakeClock(),
    });
    nc.emitClose(17, null);
    expect(await np.then((o) => o.results[0])).toEqual({ check: "build", kind: "failed", exitCode: 17 });
  });

  it.each([-1, 256, 1.5])("maps invalid exit code %s to spawn-error", async (exitCode) => {
    const child = fakeChild();
    const pending = runBoundedVerificationPlan(NPM_PROJECT, npmPlan(["typecheck"]), {
      spawn: () => child.process,
      clock: fakeClock(),
    });
    child.emitClose(exitCode, null);
    const outcome = await pending;
    expect(outcome.results[0]).toEqual({ check: "typecheck", kind: "spawn-error" });
    expect(outcome.causes[0]).toEqual({ kind: "spawn-error" });
  });

  const timeoutCases: readonly (readonly [string, FakeChildOptions])[] = [
    ["kill returns false", { kill: (): boolean => false }],
    ["kill throws", { kill: (): boolean => { throw new Error("kill failed"); } }],
    ["kill is unavailable", { omitKill: true }],
  ];

  it.each(timeoutCases)("settles a bounded timeout when %s", async (_label, options) => {
    const clock = fakeClock();
    const child = fakeChild(options);
    const pending = runBoundedVerificationPlan(NPM_PROJECT, npmPlan(["typecheck", "test"]), {
      spawn: () => child.process,
      clock,
    });
    await Promise.resolve();
    clock.advance(M3_STEP_LIMIT_MS + M3_TERMINATION_GRACE_MS);
    const outcome = await pending;
    expect(outcome.results).toEqual([{ check: "typecheck", kind: "timed-out" }]);
    expect(outcome.causes).toEqual([{ kind: "timed-out" }]);
    expect(outcome.stoppedEarly).toBe(true);
    expect(clock.pendingTimers()).toBe(0);
  });

  it("per-step timeout SIGTERM, grace close, SIGKILL escalation", async () => {
    const clock = fakeClock();
    const child = fakeChild();
    const p = runBoundedVerificationPlan(NPM_PROJECT, npmPlan(["typecheck"]), {
      spawn: () => child.process, clock,
    });
    await Promise.resolve();
    clock.advance(M3_STEP_LIMIT_MS);
    expect(child.kills()).toEqual(["SIGTERM"]);
    child.emitClose(0, null);
    expect((await p).results[0]).toMatchObject({ kind: "timed-out" });
    expect(clock.pendingTimers()).toBe(0);
    const kc = fakeClock();
    const kchild = fakeChild();
    const kp = runBoundedVerificationPlan(NPM_PROJECT, npmPlan(["test"]), {
      spawn: () => kchild.process, clock: kc,
    });
    await Promise.resolve();
    kc.advance(M3_STEP_LIMIT_MS + M3_TERMINATION_GRACE_MS);
    expect(kchild.kills()).toEqual(["SIGTERM", "SIGKILL"]);
    expect((await kp).results[0]).toMatchObject({ kind: "timed-out" });
  });

  it("overall budget wins and 120s never extends 300s", async () => {
    const clock = fakeClock();
    const child = fakeChild();
    const p = runBoundedVerificationPlan(NPM_PROJECT, npmPlan(["typecheck"]), {
      spawn: () => child.process, clock,
    });
    await Promise.resolve();
    clock.advance(M3_OVERALL_BUDGET_MS);
    expect((await p).results[0]).toMatchObject({ kind: "timed-out" });
    expect(child.kills()[0]).toBe("SIGTERM");
  });

  it("exhaustion before next step spawns nothing", async () => {
    // Step 1 passes instantly; its close settles and clears its timer.
    // THEN the clock jumps past the overall budget before the loop checks
    // step 2: no spawn, no fabricated result, UNKNOWN-capable outcome.
    const clock = fakeClock();
    const first = fakeChild();
    const second = fakeChild();
    const calls = { count: 0 };
    const spawn = scriptedSpawn((call) => (call === 1 ? first : second), calls);
    const p = runBoundedVerificationPlan(NPM_PROJECT, npmPlan(["typecheck", "test"]), { spawn, clock });
    await Promise.resolve();
    first.emitClose(0, null);
    clock.advance(M3_OVERALL_BUDGET_MS + 1);
    const o = await p;
    expect(calls.count).toBe(1);
    expect(o.results).toHaveLength(1);
    expect(o.results[0]).toMatchObject({ kind: "passed" });
    expect(o.stoppedEarly).toBe(true);
    expect(o.overallDeadlineExceeded).toBe(true);
    expect(second.kills()).toEqual([]);
  });

  it("a step starting near the deadline is pinned to the overall deadline", async () => {
    // Step 1 consumes almost the whole budget; step 2 starts with an
    // effective deadline pinned to the overall deadline (120s can never
    // extend 300s) and times out there without extra execution budget.
    const clock = fakeClock();
    const child = fakeChild();
    const p = runBoundedVerificationPlan(NPM_PROJECT, npmPlan(["typecheck"]), {
      spawn: () => child.process, clock,
    });
    await Promise.resolve();
    clock.advance(M3_OVERALL_BUDGET_MS - 50);
    await Promise.resolve();
    clock.advance(50);
    const o = await p;
    expect(o.results[0]).toMatchObject({ kind: "timed-out" });
    expect(child.kills()[0]).toBe("SIGTERM");
    expect(o.stoppedEarly).toBe(true);
  });

  it("timeout wins over late close and settles once", async () => {
    const clock = fakeClock();
    const child = fakeChild();
    const p = runBoundedVerificationPlan(NPM_PROJECT, npmPlan(["typecheck"]), {
      spawn: () => child.process, clock,
    });
    await Promise.resolve();
    clock.advance(M3_STEP_LIMIT_MS);
    child.emitClose(0, null);
    child.emitClose(1, null);
    child.emitError(new Error("late"));
    const o = await p;
    expect(o.results).toHaveLength(1);
    expect(o.results[0]).toMatchObject({ kind: "timed-out" });
    expect(clock.pendingTimers()).toBe(0);
  });

  it("owned SIGINT/SIGTERM cancel, win over close, stop work", async () => {
    const owned = manualInterruption();
    const child = fakeChild();
    const clock = fakeClock();
    const p = runBoundedVerificationPlan(NPM_PROJECT, npmPlan(["typecheck", "test"]), {
      spawn: () => child.process, clock, interruption: owned,
    });
    await Promise.resolve();
    owned.emit("SIGTERM");
    child.emitClose(null, "SIGTERM");
    const o = await p;
    expect(o.results[0]).toEqual({ check: "typecheck", kind: "interrupted", signal: "SIGTERM" });
    expect(o.results).toHaveLength(1);
    expect(o.stoppedEarly).toBe(true);
    expect(child.kills()).toContain("SIGTERM");
  });

  it("ordinary observations continue canonical sequence", async () => {
    const clock = fakeClock();
    const children = [fakeChild(), fakeChild(), fakeChild()];
    const calls = { count: 0 };
    const spawn = scriptedSpawn((call) => {
      const c = children[call - 1];
      if (c === undefined) throw new Error("unexpected");
      return c;
    }, calls);
    const p = runBoundedVerificationPlan(NPM_PROJECT, npmPlan(["typecheck", "test", "lint"]), { spawn, clock });
    children[0]?.emitClose(3, null);
    await Promise.resolve();
    clock.advance(1);
    await Promise.resolve();
    children[1]?.emitClose(null, "SIGKILL");
    await Promise.resolve();
    clock.advance(1);
    await Promise.resolve();
    children[2]?.emitClose(0, null);
    const o = await p;
    expect(o.results.map((r) => r.kind)).toEqual(["failed", "terminated", "passed"]);
    expect(o.stoppedEarly).toBe(false);
    expect(calls.count).toBe(3);
  });

  it("closes the arming gap: interruption during spawn still cancels the step", async () => {
    const interruption = manualInterruption();
    const child = fakeChild();
    const calls = { count: 0 };
    const spawn = scriptedSpawn((call) => {
      if (call === 1) interruption.emit("SIGINT");
      return child;
    }, calls);
    const clock = fakeClock();
    const pending = runBoundedVerificationPlan(
      NPM_PROJECT,
      npmPlan(["typecheck", "test"]),
      { spawn, clock, interruption },
    );
    await Promise.resolve();
    // SIGTERM is already requested straight after spawn: the owned
    // interruption recorded during the spawn window was applied.
    expect(child.kills()).toEqual(["SIGTERM"]);
    clock.advance(M3_TERMINATION_GRACE_MS);
    const outcome = await pending;
    expect(child.kills()).toEqual(["SIGTERM", "SIGKILL"]);
    expect(outcome.results).toHaveLength(1);
    expect(outcome.results[0]).toEqual({ check: "typecheck", kind: "interrupted", signal: "SIGINT" });
    expect(outcome.causes[0]).toEqual({ kind: "interrupted", signal: "SIGINT" });
    expect(outcome.stoppedEarly).toBe(true);
    expect(calls.count).toBe(1);
    expect(child.kills()).toContain("SIGTERM");
  });

  it("unsubscribes interruption listeners when the run ends", () => {
    let subscriptions = 0;
    let unsubscriptions = 0;
    const source: InterruptionSource = {
      subscribe: () => {
        subscriptions += 1;
        return () => {
          unsubscriptions += 1;
        };
      },
    };
    return runBoundedVerificationPlan(NPM_PROJECT, npmPlan(["typecheck"]), {
      spawn: () => { throw new Error("no spawn expected here"); },
      clock: fakeClock(),
      interruption: source,
    }).then((outcome) => {
      expect(outcome.results[0]).toMatchObject({ kind: "spawn-error" });
      expect(subscriptions).toBe(1);
      expect(unsubscriptions).toBe(1);
    });
  });

  it("validation stays shared with legacy runner", () => {
    expect(resolveExecutableChecks(NPM_PROJECT, npmPlan(["test", "typecheck"]))).toBe(null);
    const c = resolveExecutableChecks(NPM_PROJECT, npmPlan(["typecheck"]));
    expect(c).not.toBe(null);
    expect(stepForContract(c?.contract ?? ({} as never), "typecheck")).not.toBe(null);
  });
});
describe("M3-T3 v2 evidence and binding", () => {
  it("pins fingerprints, plan digest, binding, provenance", () => {
    const s = bindingSupport();
    expect(parseInputBindingV1(s.bindingResult)).not.toBe(null);
    expect(s.bindingDigest).toMatch(/^[0-9a-f]{64}$/u);
    expect(parseExecutionProvenanceV2(s.provenance)).toBe(s.bindingDigest);
    const parsed = parseInputBindingV1(s.bindingResult);
    if (parsed === null) throw new Error("binding must parse");
    expect(encodeInputBindingV1(parsed)).toBe(s.bindingResult);
  });

  it("v2 records bind and agree result with terminalCause", () => {
    const s = bindingSupport();
    const entries: EvidenceReadEntry[] = [
      v1Record("repo.read", ".sureflow/task.json", `sha256:${"c".repeat(64)};provenance=control-plane-task-input`, 1),
      v1Record("repo.write", "src/a.ts", `sha256:${"b".repeat(64)}->${createHash("sha256").update("export const a = 1;\n", "utf8").digest("hex")}`, 2),
      v1Record("repo.read", "project-scope", "compliant", 3),
      bindingV1("verification-input-binding", s.bindingResult, 4),
      v2Verify("node-typescript/npm-scripts-v1:typecheck", "passed", s.provenance, 5),
      v2Verify("node-typescript/npm-scripts-v1:test", "passed", s.provenance, 6),
      v2Verify("node-typescript/npm-scripts-v1:lint", "passed", s.provenance, 7),
      v2Verify("node-typescript/npm-scripts-v1:build", "passed", s.provenance, 8),
    ];
    expect(verifyProjectChange(PLAN, entries).verdict).toBe("PASS");
  });

  it.each([
    ["one v1 followed by v2", 0],
    ["one v2 followed by v1", 3],
  ] as const)("mixed verification versions are UNKNOWN: %s", (_label, v1Index) => {
    const s = bindingSupport();
    const checks = ["typecheck", "test", "lint", "build"] as const;
    const entries: EvidenceReadEntry[] = [...completeTupleV1(s.bindingResult)];
    checks.forEach((check, index) => {
      if (index === v1Index) {
        entries.push(v1Record("repo.verify", `node-typescript/npm-scripts-v1:${check}`, "passed", 5 + index));
      } else {
        entries.push(v2Verify(`node-typescript/npm-scripts-v1:${check}`, "passed", s.provenance, 5 + index));
      }
    });
    expect(verifyProjectChange(PLAN, entries).verdict).toBe("UNKNOWN");
  });

  it("mixed verification versions keep explicit failure precedence", () => {
    const s = bindingSupport();
    const entries: EvidenceReadEntry[] = [
      ...completeTupleV1(s.bindingResult),
      v1Record("repo.verify", "node-typescript/npm-scripts-v1:typecheck", "failed:7", 5),
      v2Verify("node-typescript/npm-scripts-v1:test", "passed", s.provenance, 6),
      v2Verify("node-typescript/npm-scripts-v1:lint", "passed", s.provenance, 7),
      v2Verify("node-typescript/npm-scripts-v1:build", "passed", s.provenance, 8),
    ];
    expect(verifyProjectChange(PLAN, entries).verdict).toBe("FAIL");
  });

  it.each(["missing", "malformed", "duplicate", "mismatch"] as const)("binding %s prevents PASS", (mode) => {
    const s = bindingSupport();
    const badProv = encodeExecutionProvenanceV2("0".repeat(64));
    const entries: EvidenceReadEntry[] = [
      v1Record("repo.read", ".sureflow/task.json", `sha256:${"c".repeat(64)};provenance=control-plane-task-input`, 1),
      v1Record("repo.write", "src/a.ts", `sha256:${"b".repeat(64)}->${createHash("sha256").update("export const a = 1;\n", "utf8").digest("hex")}`, 2),
      v1Record("repo.read", "project-scope", "compliant", 3),
    ];
    if (mode !== "missing") {
      entries.push(bindingV1("verification-input-binding", mode === "malformed" ? "not-a-binding" : s.bindingResult, 4));
    }
    if (mode === "duplicate") entries.push(bindingV1("verification-input-binding", s.bindingResult, 5));
    entries.push(v2Verify("node-typescript/npm-scripts-v1:typecheck", "passed", s.provenance, 10));
    entries.push(v2Verify("node-typescript/npm-scripts-v1:test", "passed", s.provenance, 11));
    entries.push(v2Verify("node-typescript/npm-scripts-v1:lint", "passed", s.provenance, 12));
    entries.push(v2Verify("node-typescript/npm-scripts-v1:build", "passed", mode === "mismatch" ? badProv : s.provenance, 13));
    // Documented distinction: absent/malformed/ambiguous observation is
    // UNKNOWN (nothing was proven); an explicit digest disagreement is FAIL.
    const expected = mode === "mismatch" ? "FAIL" : "UNKNOWN";
    const v = verifyProjectChange(PLAN, entries).verdict;
    expect(v).toBe(expected);
    expect(v).not.toBe("PASS");
  });

  it.each([
    "timed-out",
    "interrupted:SIGINT",
    "interrupted:SIGTERM",
    "terminated:SIGINT",
    "terminated:SIGTERM",
    "failed:9",
    "spawn-error",
  ] as const)("v2 %s evidence is an explicit FAIL", (cause) => {
    const s = bindingSupport();
    const entries: EvidenceReadEntry[] = [
      ...completeTupleV1(s.bindingResult),
      v2Verify("node-typescript/npm-scripts-v1:typecheck", cause, s.provenance, 5),
    ];
    expect(verifyProjectChange(PLAN, entries).verdict).toBe("FAIL");
  });

  it("unstarted required verification cannot PASS and stays UNKNOWN", () => {
    const s = bindingSupport();
    const entries: EvidenceReadEntry[] = [
      ...completeTupleV1(s.bindingResult),
      v2Verify("node-typescript/npm-scripts-v1:typecheck", "passed", s.provenance, 5),
    ];
    // test/lint/build never started: no evidence is fabricated for them.
    expect(verifyProjectChange(PLAN, entries).verdict).toBe("UNKNOWN");
  });

  it("historical all-v1 verification evidence keeps its original meaning", () => {
    const entries: EvidenceReadEntry[] = [
      v1Record("repo.read", ".sureflow/task.json", `sha256:${"c".repeat(64)};provenance=control-plane-task-input`, 1),
      v1Record("repo.write", "src/a.ts", `sha256:${"b".repeat(64)}->${AFTER_SHA}`, 2),
      v1Record("repo.read", "project-scope", "compliant", 3),
      ...(["typecheck", "test", "lint", "build"] as const).map((check, index) =>
        v1Record("repo.verify", `node-typescript/npm-scripts-v1:${check}`, "passed", 4 + index),
      ),
    ];
    // No binding gate is applied when the task carries no v2 evidence.
    expect(verifyProjectChange(PLAN, entries).verdict).toBe("PASS");
  });
});
