/** T7 orchestration for deterministic verification of the approved T0 fixture. */
import { readEvidence } from "./evidenceStore.js";
import {
  acquireMutationLock,
  MutationLockBusyError,
  MutationLockReleaseError,
  releaseMutationLock,
} from "./mutationLock.js";
import { readRuntimeState } from "./stateReader.js";
import { transitionTask } from "./taskStateStore.js";
import { loadT0TaskFixture, type T0TaskFixture } from "./t0Fixture.js";
import { verifyEvidence, type VerificationOutcome } from "./verifier.js";
import type { TaskStatus } from "./state.js";

export interface VerifyT0TaskRequest {
  readonly rootDir: string;
  readonly requestedTaskId: string;
}

export interface VerifyT0TaskDependencies {
  readonly nowIso?: () => string;
  readonly verify?: typeof verifyEvidence;
}

export interface VerifyT0TaskOutcome {
  readonly kind: "verified" | "halted";
  readonly taskId: string | null;
  readonly verdict: VerificationOutcome["verdict"] | null;
  readonly stateStatus: TaskStatus | null;
  readonly stateTransition: "none" | "halted";
  readonly reason: string;
}

function halted(
  reason: string,
  values: Partial<Omit<VerifyT0TaskOutcome, "kind" | "reason">> = {},
): VerifyT0TaskOutcome {
  return {
    kind: "halted",
    taskId: values.taskId ?? null,
    verdict: values.verdict ?? null,
    stateStatus: values.stateStatus ?? null,
    stateTransition: values.stateTransition ?? "none",
    reason,
  };
}

function loadFixture(rootDir: string): T0TaskFixture | VerifyT0TaskOutcome {
  try {
    return loadT0TaskFixture(rootDir);
  } catch {
    return halted("invalid T0 fixture/request");
  }
}

function verifyT0TaskUnlocked(
  request: VerifyT0TaskRequest,
  dependencies: VerifyT0TaskDependencies = {},
): VerifyT0TaskOutcome {
  const fixtureOrHalt = loadFixture(request.rootDir);
  if ("kind" in fixtureOrHalt) return fixtureOrHalt;
  const fixture = fixtureOrHalt;

  if (request.requestedTaskId !== fixture.taskId) {
    return halted("requested taskId does not match the fixture-owned taskId", {
      taskId: fixture.taskId,
    });
  }

  const runtime = readRuntimeState(request.rootDir);
  if (runtime.kind !== "ok") {
    return halted("authoritative runtime state is not initialized or valid", {
      taskId: fixture.taskId,
    });
  }

  const matchingStates = runtime.tasks.filter((task) => task.taskId === fixture.taskId);
  if (matchingStates.length === 0) {
    return halted("authoritative task state is missing", { taskId: fixture.taskId });
  }
  if (matchingStates.length > 1) {
    return halted("authoritative task state is ambiguous", { taskId: fixture.taskId });
  }
  const task = matchingStates[0];
  if (task === undefined) {
    return halted("authoritative task state is missing", { taskId: fixture.taskId });
  }

  const verificationRequest = {
    taskId: fixture.taskId,
    capability: fixture.capability,
    target: fixture.target,
    expectedResult: fixture.expectedResult,
  };
  const verify = dependencies.verify ?? verifyEvidence;
  const verification = verify(verificationRequest, readEvidence(request.rootDir));

  if (verification.verdict === "PASS") {
    return {
      kind: "verified",
      taskId: fixture.taskId,
      verdict: verification.verdict,
      stateStatus: task.status,
      stateTransition: "none",
      reason: "terminal evidence passed deterministic verification",
    };
  }

  if (task.status === "accepted") {
    try {
      transitionTask(
        request.rootDir,
        fixture.taskId,
        "halted",
        (dependencies.nowIso ?? (() => new Date().toISOString()))(),
      );
    } catch {
      return halted("could not reconcile stale accepted task state", {
        taskId: fixture.taskId,
        verdict: verification.verdict,
        stateStatus: task.status,
      });
    }
    return halted(
      "verification " + verification.verdict + "; stale accepted task halted",
      {
        taskId: fixture.taskId,
        verdict: verification.verdict,
        stateStatus: "halted",
        stateTransition: "halted",
      },
    );
  }

  return halted("verification " + verification.verdict, {
    taskId: fixture.taskId,
    verdict: verification.verdict,
    stateStatus: task.status,
  });
}

export function verifyT0Task(
  request: VerifyT0TaskRequest,
  dependencies: VerifyT0TaskDependencies = {},
): VerifyT0TaskOutcome {
  let lock;
  try {
    lock = acquireMutationLock(request.rootDir, "verify");
  } catch (error: unknown) {
    if (error instanceof MutationLockBusyError) {
      return halted("mutation already in progress; execution.lock is held");
    }
    return halted("could not acquire execution.lock for verify");
  }

  let outcome: VerifyT0TaskOutcome;
  try {
    outcome = verifyT0TaskUnlocked(request, dependencies);
  } catch {
    outcome = halted("verify halted after an unexpected mutation failure");
  }

  try {
    releaseMutationLock(lock);
  } catch (error: unknown) {
    if (error instanceof MutationLockReleaseError) {
      return halted(error.message, {
        taskId: outcome.taskId,
        verdict: outcome.verdict,
        stateStatus: outcome.stateStatus,
        stateTransition: outcome.stateTransition,
      });
    }
    return halted("execution.lock release integrity failure", {
      taskId: outcome.taskId,
      verdict: outcome.verdict,
      stateStatus: outcome.stateStatus,
      stateTransition: outcome.stateTransition,
    });
  }
  return outcome;
}
