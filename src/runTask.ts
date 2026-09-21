/** T0 compatibility orchestration for the original fixed fixture. */
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { appendEvidence, readEvidence, type EvidenceReadEntry } from "./evidenceStore.js";
import { defaultEvidencePath } from "./evidencePaths.js";
import { appendExecutionEvent } from "./eventStore.js";
import {
  acquireMutationLock,
  MutationLockBusyError,
  MutationLockReleaseError,
  releaseMutationLock,
} from "./mutationLock.js";
import { decidePolicy, type PolicyDecision } from "./policy.js";
import { loadPolicy } from "./policyStore.js";
import { readRuntimeState } from "./stateReader.js";
import type { TaskStatus } from "./state.js";
import { beginTask, taskStateExists, transitionTask } from "./taskStateStore.js";
import {
  loadT0TaskFixture,
  M1_TEST_PROFILE,
  T0_FIXTURE_RELATIVE_PATH,
  type T0TaskFixture,
} from "./t0Fixture.js";
import { verifyEvidence, type VerificationOutcome } from "./verifier.js";
import {
  dispatchNpmTest,
  npmTestEvidenceResult,
  resolveWorkerPath,
  type NpmTestEvidenceResult,
  type NpmTestProcessOutcome,
} from "./worker.js";

const ACTOR = "worker:t0" as const;
const PROVENANCE = "npm test; shell=false" as const;

export interface RunT0TaskRequest {
  readonly rootDir: string;
  readonly requestedTaskId: string;
}

export interface RunT0TaskDependencies {
  /** Test seam only: returns process outcomes; cannot supply executable or argv. */
  readonly executeNpmTest?: (workerRoot: string) => NpmTestProcessOutcome;
  readonly nowIso?: () => string;
  readonly verify?: typeof verifyEvidence;
}

export interface RunT0TaskOutcome {
  readonly kind: "accepted" | "halted";
  readonly taskId: string | null;
  readonly policyDecision: PolicyDecision | null;
  readonly verdict: VerificationOutcome["verdict"] | null;
  readonly result: NpmTestEvidenceResult | null;
  readonly attempts: number;
  readonly transitions: readonly TaskStatus[];
  readonly reason: string;
}

function halted(
  reason: string,
  values: Partial<Omit<RunT0TaskOutcome, "kind" | "reason">> = {},
): RunT0TaskOutcome {
  return {
    kind: "halted",
    taskId: values.taskId ?? null,
    policyDecision: values.policyDecision ?? null,
    verdict: values.verdict ?? null,
    result: values.result ?? null,
    attempts: values.attempts ?? 0,
    transitions: values.transitions ?? [],
    reason,
  };
}

function terminalTupleExists(rootDir: string, fixture: T0TaskFixture): boolean {
  if (!existsSync(defaultEvidencePath(rootDir))) return false;
  return readEvidence(rootDir).some(
    (entry) =>
      entry.kind === "record" &&
      entry.record.taskId === fixture.taskId &&
      entry.record.capability === fixture.capability &&
      entry.record.target === fixture.target,
  );
}

function persistEvent(
  rootDir: string,
  fixture: T0TaskFixture,
  policyDecision: PolicyDecision,
  result: string,
  recordedAt: string,
): void {
  appendExecutionEvent(rootDir, {
    actor: ACTOR,
    recordedAt,
    taskId: fixture.taskId,
    capability: fixture.capability,
    policyDecision,
    target: fixture.target,
    result,
    provenance: PROVENANCE,
  });
}

function runT0TaskUnlocked(
  request: RunT0TaskRequest,
  dependencies: RunT0TaskDependencies = {},
): RunT0TaskOutcome {
  const nowIso = dependencies.nowIso ?? (() => new Date().toISOString());
  const executeNpmTest = dependencies.executeNpmTest ?? dispatchNpmTest;
  const verify = dependencies.verify ?? verifyEvidence;
  const transitions: TaskStatus[] = [];

  let fixture: T0TaskFixture;
  try {
    fixture = loadT0TaskFixture(request.rootDir);
  } catch {
    return halted("invalid T0 fixture/request");
  }
  if (request.requestedTaskId !== fixture.taskId) {
    return halted("requested taskId does not match the fixture-owned taskId", {
      taskId: fixture.taskId,
    });
  }
  if (readRuntimeState(request.rootDir).kind !== "ok") {
    return halted("authoritative runtime state is not initialized or valid", {
      taskId: fixture.taskId,
    });
  }

  let policy;
  try {
    policy = loadPolicy(request.rootDir);
  } catch {
    return halted("policy authority is missing or invalid", { taskId: fixture.taskId });
  }
  const policyDecision = decidePolicy(policy, fixture.capability);

  let existingTaskState: boolean;
  try {
    existingTaskState = taskStateExists(request.rootDir, fixture.taskId);
  } catch {
    return halted("invalid fixture taskId for authoritative runtime state", {
      taskId: fixture.taskId,
      policyDecision,
    });
  }
  if (existingTaskState) {
    return halted("authoritative task state already exists", {
      taskId: fixture.taskId,
      policyDecision,
    });
  }
  if (terminalTupleExists(request.rootDir, fixture)) {
    return halted("terminal evidence already exists for the fixture tuple", {
      taskId: fixture.taskId,
      policyDecision,
    });
  }

  try {
    beginTask(request.rootDir, fixture.taskId, nowIso());
  } catch {
    return halted("could not initialize authoritative task state", {
      taskId: fixture.taskId,
      policyDecision,
    });
  }
  transitions.push("pending");

  if (policyDecision !== "ALLOW") {
    persistEvent(
      request.rootDir,
      fixture,
      policyDecision,
      policyDecision === "DENY" ? "policy-denied" : "approval-required",
      nowIso(),
    );
    transitionTask(request.rootDir, fixture.taskId, "halted", nowIso());
    transitions.push("halted");
    return halted(
      policyDecision === "DENY" ? "policy denied execution" : "human approval required",
      { taskId: fixture.taskId, policyDecision, transitions },
    );
  }

  if (fixture.capability !== "repo.test" || fixture.testProfile !== M1_TEST_PROFILE) {
    transitionTask(request.rootDir, fixture.taskId, "halted", nowIso());
    transitions.push("halted");
    return halted("unsupported T0 capability or test profile", {
      taskId: fixture.taskId,
      policyDecision,
      transitions,
    });
  }

  const workerRoot = dirname(join(request.rootDir, T0_FIXTURE_RELATIVE_PATH));
  try {
    resolveWorkerPath(request.rootDir, workerRoot, fixture.target);
  } catch {
    transitionTask(request.rootDir, fixture.taskId, "halted", nowIso());
    transitions.push("halted");
    return halted("worker jail rejected the fixture target", {
      taskId: fixture.taskId,
      policyDecision,
      transitions,
    });
  }

  transitionTask(request.rootDir, fixture.taskId, "running", nowIso());
  transitions.push("running");

  let attempts = 1;
  let terminalOutcome: NpmTestProcessOutcome;
  try {
    terminalOutcome = executeNpmTest(workerRoot);
  } catch {
    terminalOutcome = { kind: "spawn-error" };
  }
  if (terminalOutcome.kind === "exited" && terminalOutcome.exitCode !== 0) {
    persistEvent(request.rootDir, fixture, policyDecision, "test-failed", nowIso());
    attempts = 2;
    try {
      terminalOutcome = executeNpmTest(workerRoot);
    } catch {
      terminalOutcome = { kind: "spawn-error" };
    }
  }

  const result = npmTestEvidenceResult(terminalOutcome);
  appendEvidence(request.rootDir, {
    actor: ACTOR,
    recordedAt: nowIso(),
    taskId: fixture.taskId,
    capability: fixture.capability,
    policyDecision,
    target: fixture.target,
    result,
    provenance: PROVENANCE,
  });

  const entries: readonly EvidenceReadEntry[] = readEvidence(request.rootDir);
  const verification = verify(
    {
      taskId: fixture.taskId,
      capability: fixture.capability,
      target: fixture.target,
      expectedResult: fixture.expectedResult,
    },
    entries,
  );
  const accepted = verification.verdict === "PASS";
  transitionTask(request.rootDir, fixture.taskId, accepted ? "accepted" : "halted", nowIso());
  transitions.push(accepted ? "accepted" : "halted");

  if (!accepted) {
    return halted(`verification ${verification.verdict}`, {
      taskId: fixture.taskId,
      policyDecision,
      verdict: verification.verdict,
      result,
      attempts,
      transitions,
    });
  }
  return {
    kind: "accepted",
    taskId: fixture.taskId,
    policyDecision,
    verdict: verification.verdict,
    result,
    attempts,
    transitions,
    reason: "terminal evidence passed deterministic verification",
  };
}

export function runT0Task(
  request: RunT0TaskRequest,
  dependencies: RunT0TaskDependencies = {},
): RunT0TaskOutcome {
  let lock;
  try {
    lock = acquireMutationLock(request.rootDir, "run");
  } catch (error: unknown) {
    if (error instanceof MutationLockBusyError) {
      return halted("mutation already in progress; execution.lock is held");
    }
    return halted("could not acquire execution.lock for run");
  }

  let outcome: RunT0TaskOutcome;
  try {
    outcome = runT0TaskUnlocked(request, dependencies);
  } catch {
    outcome = halted("run halted after an unexpected mutation failure");
  }

  try {
    releaseMutationLock(lock);
  } catch (error: unknown) {
    if (error instanceof MutationLockReleaseError) {
      return halted(error.message, {
        taskId: outcome.taskId,
        policyDecision: outcome.policyDecision,
        verdict: outcome.verdict,
        result: outcome.result,
        attempts: outcome.attempts,
        transitions: outcome.transitions,
      });
    }
    return halted("execution.lock release integrity failure", {
      taskId: outcome.taskId,
      policyDecision: outcome.policyDecision,
      verdict: outcome.verdict,
      result: outcome.result,
      attempts: outcome.attempts,
      transitions: outcome.transitions,
    });
  }
  return outcome;
}

export {
  hasM2TaskContract,
  runM2Task,
  type M2RunPhase,
  type M2RunTaskDependencies,
  type M2RunTaskOutcome,
  type M2RunTaskRequest,
} from "./m2Orchestration.js";
