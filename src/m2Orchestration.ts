import { existsSync } from "node:fs";
import { join } from "node:path";
import {
  acquireMutationLock,
  MutationLockBusyError,
  MutationLockReleaseError,
  releaseMutationLock,
} from "./mutationLock.js";
import {
  InvalidM4PreflightContractError,
  loadValidatedPreflightExecutionPlan,
  M2_TASK_CONTRACT_RELATIVE_PATH,
} from "./taskContract.js";
import type { ValidatedPreflightExecutionPlan } from "./taskContract.js";
import { resolveSureflowPath } from "./sureflowPaths.js";
import { runM2TaskUnlocked } from "./m2RunExecution.js";
import { verifyM2TaskUnlocked } from "./m2VerifyExecution.js";
import { runM4TaskUnlocked } from "./m4Orchestration.js";
import type { M4RunTaskDependencies } from "./m4Orchestration.js";
import { verifyM4TaskUnlocked } from "./m4TaskVerification.js";
import type { M4VerifyTaskDependencies } from "./m4TaskVerification.js";
import {
  haltedRun,
  haltedVerify,
  type M2RunTaskOutcome,
  type M2RunTaskRequest,
  type M2VerifyTaskOutcome,
  type M2VerifyTaskRequest,
} from "./m2RunSupport.js";

export {
  processInterruptionSource,
  type M2RunPhase,
  type M2RunTaskDependencies,
  type M2RunTaskOutcome,
  type M2RunTaskRequest,
  type M2VerifyTaskDependencies,
  type M2VerifyTaskOutcome,
  type M2VerifyTaskRequest,
} from "./m2RunSupport.js";

function assertNever(value: never): never {
  throw new Error(`unsupported task contract version: ${String(value)}`);
}

export function hasM2TaskContract(rootDir: string): boolean {
  try {
    return existsSync(resolveSureflowPath(rootDir, M2_TASK_CONTRACT_RELATIVE_PATH));
  } catch {
    return existsSync(join(rootDir, M2_TASK_CONTRACT_RELATIVE_PATH));
  }
}

export async function runM2Task(
  request: M2RunTaskRequest,
  dependencies: M4RunTaskDependencies = {},
): Promise<M2RunTaskOutcome> {
  let lock;
  try {
    lock = acquireMutationLock(request.rootDir, "run");
  } catch (error: unknown) {
    if (error instanceof MutationLockBusyError) {
      return haltedRun("mutation already in progress; execution.lock is held");
    }
    return haltedRun("could not acquire execution.lock for run");
  }

  let outcome: M2RunTaskOutcome;
  try {
    const plan: ValidatedPreflightExecutionPlan = loadValidatedPreflightExecutionPlan(request.rootDir);
    switch (plan.schemaVersion) {
      case 1:
        outcome = await runM2TaskUnlocked(request, dependencies, plan);
        break;
      case 2:
        outcome = await runM4TaskUnlocked(request, dependencies, plan);
        break;
      default:
        outcome = assertNever(plan);
    }
  } catch (error: unknown) {
    outcome = haltedRun(error instanceof InvalidM4PreflightContractError
      ? "invalid M4 task contract"
      : "invalid M2 task contract");
  }
  try {
    releaseMutationLock(lock);
  } catch (error: unknown) {
    if (error instanceof MutationLockReleaseError) {
      return haltedRun(error.message, {
        taskId: outcome.taskId,
        verdict: outcome.verdict,
        policyDecisions: outcome.policyDecisions,
        transitions: outcome.transitions,
        verificationResults: outcome.verificationResults,
      });
    }
    return haltedRun("execution.lock release integrity failure", {
      taskId: outcome.taskId,
      verdict: outcome.verdict,
      policyDecisions: outcome.policyDecisions,
      transitions: outcome.transitions,
      verificationResults: outcome.verificationResults,
    });
  }
  return outcome;
}

export function verifyM2Task(
  request: M2VerifyTaskRequest,
  dependencies: M4VerifyTaskDependencies = {},
): M2VerifyTaskOutcome {
  let lock;
  try {
    lock = acquireMutationLock(request.rootDir, "verify");
  } catch (error: unknown) {
    if (error instanceof MutationLockBusyError) {
      return haltedVerify("mutation already in progress; execution.lock is held");
    }
    return haltedVerify("could not acquire execution.lock for verify");
  }

  let outcome: M2VerifyTaskOutcome;
  try {
    const plan: ValidatedPreflightExecutionPlan = loadValidatedPreflightExecutionPlan(request.rootDir);
    switch (plan.schemaVersion) {
      case 1:
        outcome = verifyM2TaskUnlocked(request, dependencies, plan);
        break;
      case 2:
        outcome = verifyM4TaskUnlocked(request, dependencies, plan);
        break;
      default:
        outcome = assertNever(plan);
    }
  } catch (error: unknown) {
    outcome = haltedVerify(error instanceof InvalidM4PreflightContractError
      ? "invalid M4 task contract"
      : "verify halted after an unexpected state/evidence failure");
  }
  try {
    releaseMutationLock(lock);
  } catch (error: unknown) {
    if (error instanceof MutationLockReleaseError) {
      return haltedVerify(error.message, {
        taskId: outcome.taskId,
        verdict: outcome.verdict,
        stateStatus: outcome.stateStatus,
        stateTransition: outcome.stateTransition,
      });
    }
    return haltedVerify("execution.lock release integrity failure", {
      taskId: outcome.taskId,
      verdict: outcome.verdict,
      stateStatus: outcome.stateStatus,
      stateTransition: outcome.stateTransition,
    });
  }
  return outcome;
}
