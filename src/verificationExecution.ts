/**
 * M3-T3 bounded verification execution controller.
 *
 * Owns the fixed execution envelope for already-resolved verification plans:
 * 120s per started step, 300s overall verification budget, 5s termination
 * grace. Bounds apply to the DIRECTLY SPAWNED npm/pnpm child only; descendant
 * processes spawned by project scripts are not owned (see module notes).
 *
 * Design rules:
 * - monotonic clock arithmetic only (injectable seam; production uses
 *   performance.now). No Date.now() deadline math.
 * - one closed result<->terminalCause mapping; terminal interpretation lives
 *   here and nowhere else.
 * - settle exactly once per step; the initiating timeout/interruption cause
 *   wins over any later child close; late events are ignored.
 * - ordinary observations (passed/failed/spawn-error/independent
 *   termination) never stop sequencing; timeout/interruption stop new work.
 * - unstarted steps are never fabricated: overall exhaustion before a step
 *   simply ends sequencing.
 * - grace is cleanup, never execution budget: no new work launches during it.
 *
 * Truthful M3 guarantee and limitation (no overclaiming):
 * - Sureflow bounds its wait and lifecycle control over the DIRECTLY spawned
 *   package-manager process (npm/pnpm). It does NOT use detached process
 *   groups, negative-PID group signals, taskkill /T, third-party tree-kill
 *   packages, or a generic process supervisor, so it does NOT guarantee
 *   termination of every descendant a project script may spawn.
 * - Controlled interruption (SIGINT/SIGTERM received by Sureflow and turned
 *   into a controlled halt) is guaranteed only for the owned
 *   verification-execution window. Silent interruption at other orchestration
 *   phases is out of scope for M3.
 * - These fingerprints/deadlines never claim the project is hermetic:
 *   dependencies may change externally and scripts may observe environment,
 *   network, or descendants' external state.
 */
import { performance } from "node:perf_hooks";
import type { M2VerificationProfile } from "./taskContract.js";
import type { DetectedNodeTypeScriptProject } from "./projectDetection.js";
import {
  M3_OVERALL_BUDGET_SECONDS,
  M3_STEP_LIMIT_SECONDS,
  M3_TERMINATION_GRACE_SECONDS,
  encodeTerminalCause,
  type M3TerminalCause,
} from "./evidenceV2.js";
import {
  defaultSpawn,
  resolveExecutableChecks,
  stepForContract,
  type VerificationPlan,
  type VerificationSpawn,
  type VerificationSpawnedProcess,
  type VerificationStepResult,
  isValidFailureExitCode,
} from "./verificationAdapter.js";

/** Fixed M3 execution envelope in milliseconds (derived from pinned seconds). */
export const M3_STEP_LIMIT_MS = M3_STEP_LIMIT_SECONDS * 1000;
export const M3_OVERALL_BUDGET_MS = M3_OVERALL_BUDGET_SECONDS * 1000;
export const M3_TERMINATION_GRACE_MS = M3_TERMINATION_GRACE_SECONDS * 1000;

/** Monotonic clock/timer seam. Production uses performance.now + timers. */
export interface VerificationClock {
  /** Monotonic milliseconds. Differences are meaningful; absolutes are not. */
  now(): number;
  setTimeout(callback: () => void, delayMs: number): unknown;
  clearTimeout(handle: unknown): void;
}

export const monotonicVerificationClock: VerificationClock = {
  now: () => performance.now(),
  setTimeout: (callback, delayMs) => setTimeout(callback, delayMs),
  clearTimeout: (handle) => {
    clearTimeout(handle as NodeJS.Timeout);
  },
};

export type VerificationInterruptSignal = "SIGINT" | "SIGTERM";

/**
 * Narrow interruption abstraction. Library code consumes; the direct CLI
 * adapts process signals; tests use a manual synthetic source. Subscribe
 * returns an unsubscribe function; listeners live only for the owned run.
 */
export interface InterruptionSource {
  subscribe(listener: (signal: VerificationInterruptSignal) => void): () => void;
}

export interface BoundedVerificationOptions {
  readonly spawn?: VerificationSpawn;
  readonly clock?: VerificationClock;
  readonly interruption?: InterruptionSource;
}

export interface ObservedStepExecution {
  readonly result: VerificationStepResult;
  readonly terminalCause: M3TerminalCause;
}

export interface BoundedVerificationOutcome {
  /** One entry per STARTED step, in canonical order. Unstarted steps absent. */
  readonly results: readonly VerificationStepResult[];
  /** Terminal cause parallel to results. */
  readonly causes: readonly M3TerminalCause[];
  /** True when timeout/interruption stopped sequencing (never for ordinary results). */
  readonly stoppedEarly: boolean;
  /** True when the pre-step overall-budget check ended sequencing. */
  readonly overallDeadlineExceeded: boolean;
}

type ControllingCause =
  | { readonly kind: "timed-out" }
  | { readonly kind: "interrupted"; readonly signal: VerificationInterruptSignal };

function resultForCause(
  check: M2VerificationProfile,
  cause: ControllingCause,
): VerificationStepResult {
  if (cause.kind === "timed-out") return Object.freeze({ check, kind: "timed-out" as const });
  return Object.freeze({ check, kind: "interrupted" as const, signal: cause.signal });
}

function causeForResult(result: VerificationStepResult): M3TerminalCause {
  switch (result.kind) {
    case "passed":
      return Object.freeze({ kind: "passed" as const });
    case "failed":
      return isValidFailureExitCode(result.exitCode)
        ? Object.freeze({ kind: "failed" as const, exitCode: result.exitCode })
        : Object.freeze({ kind: "spawn-error" as const });
    case "spawn-error":
      return Object.freeze({ kind: "spawn-error" as const });
    case "terminated":
      return Object.freeze({ kind: "terminated" as const, signal: result.signal });
    case "timed-out":
      return Object.freeze({ kind: "timed-out" as const });
    case "interrupted":
      return Object.freeze({ kind: "interrupted" as const, signal: result.signal });
  }
}

/**
 * Derive the terminal cause for a result produced outside the controller
 * (e.g. injected legacy verification fakes). The mapping is total over the
 * closed result union; strict v2 validation remains the fail-closed gate
 * for unrepresentable values at persistence time.
 */
export function terminalCauseForResult(result: VerificationStepResult): M3TerminalCause {
  return causeForResult(result);
}

export function verificationResultText(result: VerificationStepResult): string {
  return encodeTerminalCause(terminalCauseForResult(result));
}

function spawnErrorObservation(check: M2VerificationProfile): ObservedStepExecution {
  const result: VerificationStepResult = Object.freeze({ check, kind: "spawn-error" as const });
  return { result, terminalCause: causeForResult(result) };
}

type InterruptHandler = (signal: VerificationInterruptSignal) => void;

interface ActiveStep {
  interrupt: InterruptHandler | null;
}

interface OwnedInterruptionState {
  owned: ControllingCause | null;
}

/** Mutable slot for the spawned direct child (null until spawn succeeds). */
interface OwnedChild {
  child: VerificationSpawnedProcess | null;
}

function readOwnedChild(owned: OwnedChild): VerificationSpawnedProcess | null {
  // `?? null` keeps a degenerate spawner that returns undefined on the
  // fail-closed spawn-error path instead of crashing the controller.
  return owned.child ?? null;
}

/**
 * Record the first Sureflow-owned interruption cause. A helper (rather than
 * an inline branch inside the subscription closure) keeps the check a real
 * runtime union check for both the type checker and the lint gate.
 */
function recordFirstInterruption(
  state: OwnedInterruptionState,
  cause: ControllingCause,
): void {
  if (state.owned === null) state.owned = cause;
}

function readOwnedInterruption(state: OwnedInterruptionState): ControllingCause | null {
  return state.owned;
}

/** Forward one owned interruption to the step that currently owns the child. */
function requestActiveInterruption(state: ActiveStep, signal: VerificationInterruptSignal): void {
  const interrupt: InterruptHandler | null = state.interrupt;
  if (interrupt !== null) interrupt(signal);
}

/**
 * Request termination of the owned direct child. Missing or non-callable kill
 * handles degrade to wait-for-close; descendant processes are never signaled.
 */
function killOwnedChild(
  child: VerificationSpawnedProcess | null,
  signal: "SIGTERM" | "SIGKILL",
): boolean {
  if (child === null || child.kill === undefined) return false;
  try {
    return child.kill(signal);
  } catch {
    return false;
  }
}

function executeBoundedStep(
  contract: Parameters<typeof stepForContract>[0],
  check: M2VerificationProfile,
  cwd: string,
  spawn: VerificationSpawn,
  clock: VerificationClock,
  stepDeadline: number,
  active: ActiveStep,
  interruptionState: OwnedInterruptionState,
): Promise<ObservedStepExecution> {
  return new Promise((resolveStep) => {
    const step = stepForContract(contract, check);
    if (step === null) {
      resolveStep(spawnErrorObservation(check));
      return;
    }
    // Mutable holder keeps the "no live child yet" case representable for the
    // kill path without re-reading a narrowed local.
    const owned: OwnedChild = { child: null };
    try {
      owned.child = spawn(step.executable, step.argv, { cwd, shell: false, stdio: "ignore" });
    } catch {
      resolveStep(spawnErrorObservation(check));
      return;
    }
    const child = readOwnedChild(owned);
    if (child === null) {
      resolveStep(spawnErrorObservation(check));
      return;
    }

    let settled = false;
    let stepTimer: unknown = null;
    let graceTimer: unknown = null;
    let controlling: ControllingCause | null = null;

    const clearTimers = (): void => {
      if (stepTimer !== null) {
        clock.clearTimeout(stepTimer);
        stepTimer = null;
      }
      if (graceTimer !== null) {
        clock.clearTimeout(graceTimer);
        graceTimer = null;
      }
    };

    const settle = (result: VerificationStepResult, terminalCause: M3TerminalCause): void => {
      if (settled) return;
      settled = true;
      clearTimers();
      active.interrupt = null;
      resolveStep({ result, terminalCause });
    };

    const settleFromControlling = (): void => {
      if (controlling === null || settled) return;
      settle(resultForCause(check, controlling), { ...controlling });
    };

    const killChild = (signal: "SIGTERM" | "SIGKILL"): boolean =>
      killOwnedChild(readOwnedChild(owned), signal);

    const beginGrace = (): void => {
      graceTimer = clock.setTimeout(() => {
        if (settled) return;
        killChild("SIGKILL");
        // Grace expiry resolves even if the child never closes: without a
        // live kill handle there is nothing further to wait for, and with
        // one the SIGKILL has been requested. Late closes are ignored.
        settleFromControlling();
      }, M3_TERMINATION_GRACE_MS);
    };

    const takeControl = (cause: ControllingCause): void => {
      if (settled || controlling !== null) return;
      controlling = cause;
      killChild("SIGTERM");
      beginGrace();
    };

    active.interrupt = (signal) => {
      takeControl({ kind: "interrupted", signal });
    };

    // Close the arming gap: an owned interruption recorded between spawning
    // and arming must still cancel this freshly started step.
    const alreadyOwned = readOwnedInterruption(interruptionState);
    if (alreadyOwned !== null && alreadyOwned.kind === "interrupted") {
      takeControl(alreadyOwned);
    }

    child.on("error", () => {
      if (settled || controlling !== null) return;
      const observation = spawnErrorObservation(check);
      settle(observation.result, observation.terminalCause);
    });
    child.on("close", (exitCode, signal) => {
      if (settled) return;
      if (controlling !== null) {
        // Initiating timeout/interruption cause wins over the later close,
        // even when the close reports pass/failure/termination.
        settleFromControlling();
        return;
      }
      if (signal !== null) {
        const result: VerificationStepResult = Object.freeze({ check, kind: "terminated" as const, signal });
        settle(result, causeForResult(result));
      } else if (exitCode === 0) {
        const result: VerificationStepResult = Object.freeze({ check, kind: "passed" as const, exitCode: 0 as const });
        settle(result, causeForResult(result));
      } else if (typeof exitCode === "number" && isValidFailureExitCode(exitCode)) {
        const result: VerificationStepResult = Object.freeze({ check, kind: "failed" as const, exitCode });
        settle(result, causeForResult(result));
      } else {
        const observation = spawnErrorObservation(check);
        settle(observation.result, observation.terminalCause);
      }
    });

    const remaining = stepDeadline - clock.now();
    stepTimer = clock.setTimeout(() => {
      takeControl({ kind: "timed-out" });
    }, Math.max(0, remaining));
  });
}

/**
 * Run an already-resolved plan under the fixed M3 execution envelope.
 * Ordinary step observations never stop sequencing; timeout or owned
 * interruption stops new work without fabricating unstarted results.
 */
export async function runBoundedVerificationPlan(
  project: DetectedNodeTypeScriptProject,
  plan: VerificationPlan,
  options: BoundedVerificationOptions = {},
): Promise<BoundedVerificationOutcome> {
  const executable = resolveExecutableChecks(project, plan);
  if (executable === null) {
    return Object.freeze({
      results: Object.freeze([]),
      causes: Object.freeze([]),
      stoppedEarly: false,
      overallDeadlineExceeded: false,
    });
  }
  const spawn = options.spawn ?? defaultSpawn;
  const clock = options.clock ?? monotonicVerificationClock;
  const overallStart = clock.now();
  const overallDeadline = overallStart + M3_OVERALL_BUDGET_MS;

  const results: VerificationStepResult[] = [];
  const causes: M3TerminalCause[] = [];
  let stoppedEarly = false;
  let overallDeadlineExceeded = false;
  const interruptionState: OwnedInterruptionState = { owned: null };
  const active: ActiveStep = { interrupt: null };
  const unsubscribe = options.interruption?.subscribe((signal) => {
    recordFirstInterruption(interruptionState, { kind: "interrupted", signal });
    requestActiveInterruption(active, signal);
  });

  try {
    for (const check of executable.checks) {
      if (readOwnedInterruption(interruptionState) !== null) {
        stoppedEarly = true;
        break;
      }
      if (clock.now() >= overallDeadline) {
        stoppedEarly = true;
        overallDeadlineExceeded = true;
        break;
      }
      const stepDeadline = Math.min(clock.now() + M3_STEP_LIMIT_MS, overallDeadline);
      const observation = await executeBoundedStep(
        executable.contract,
        check,
        project.root,
        spawn,
        clock,
        stepDeadline,
        active,
        interruptionState,
      );
      results.push(observation.result);
      causes.push(observation.terminalCause);
      if (observation.result.kind === "timed-out" || observation.result.kind === "interrupted") {
        stoppedEarly = true;
        break;
      }
    }
  } finally {
    active.interrupt = null;
    unsubscribe?.();
  }
  return Object.freeze({
    results: Object.freeze(results),
    causes: Object.freeze(causes),
    stoppedEarly,
    overallDeadlineExceeded,
  });
}
