import { readEvidence } from "./evidenceStore.js";
import { verifyProjectChange } from "./projectChangeVerifier.js";
import { readRuntimeState } from "./stateReader.js";
import { transitionTask } from "./taskStateStore.js";
import { loadValidatedExecutionPlan } from "./taskContract.js";
import type { ValidatedExecutionPlan } from "./taskContract.js";
import {
  haltedVerify,
  m2Verdict,
  type M2VerifyTaskDependencies,
  type M2VerifyTaskOutcome,
  type M2VerifyTaskRequest,
} from "./m2RunSupport.js";

export function verifyM2TaskUnlocked(
  request: M2VerifyTaskRequest,
  dependencies: M2VerifyTaskDependencies,
  loadedPlan?: ValidatedExecutionPlan,
): M2VerifyTaskOutcome {
  let plan;
  try {
    plan = loadedPlan ?? loadValidatedExecutionPlan(request.rootDir);
  } catch {
    return haltedVerify("invalid M2 task contract");
  }
  if (request.requestedTaskId !== plan.taskId) {
    return haltedVerify("requested taskId does not match the current M2 task contract", {
      taskId: plan.taskId,
    });
  }

  const runtime = readRuntimeState(request.rootDir);
  if (runtime.kind !== "ok") {
    return haltedVerify("authoritative runtime state is not initialized or valid", {
      taskId: plan.taskId,
    });
  }
  const matching = runtime.tasks.filter((task) => task.taskId === plan.taskId);
  if (matching.length === 0) {
    return haltedVerify("authoritative task state is missing", { taskId: plan.taskId });
  }
  if (matching.length > 1 || matching[0] === undefined) {
    return haltedVerify("authoritative task state is ambiguous", { taskId: plan.taskId });
  }
  const task = matching[0];
  const verification = (dependencies.verify ?? verifyProjectChange)(plan, readEvidence(request.rootDir));
  const verdict = m2Verdict(verification.verdict);

  if (verdict === "PASS") {
    return {
      kind: "verified",
      taskId: plan.taskId,
      verdict: "PASS",
      stateStatus: task.status,
      stateTransition: "none",
      reason: "persisted project-change evidence passed deterministic verification",
    };
  }
  if (task.status === "accepted") {
    try {
      transitionTask(
        request.rootDir,
        plan.taskId,
        "halted",
        (dependencies.nowIso ?? (() => new Date().toISOString()))(),
      );
    } catch {
      return haltedVerify("could not reconcile stale accepted task state", {
        taskId: plan.taskId,
        verdict,
        stateStatus: task.status,
      });
    }
    return haltedVerify(`verification ${verdict}; stale accepted task halted`, {
      taskId: plan.taskId,
      verdict,
      stateStatus: "halted",
      stateTransition: "halted",
    });
  }
  return haltedVerify(`verification ${verdict}`, {
    taskId: plan.taskId,
    verdict,
    stateStatus: task.status,
  });
}
