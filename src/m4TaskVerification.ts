import { readEvidence } from "./evidenceStore.js";
import { detectProject } from "./projectDetection.js";
import { inspectM4PostWriteScope } from "./projectScope.js";
import type { ProjectScopeDependencies } from "./projectScope.js";
import { validateM4OrderedEvidence } from "./m4OrderedEvidence.js";
import type { M4PostimageProof } from "./projectEvidenceEvaluation.js";
import { verifyM4ProjectChange } from "./m4ProjectChangeVerifier.js";
import { M4_WRITE_PROVENANCE } from "./m4VerificationBinding.js";
import type { M4ValidatedExecutionPlan } from "./taskContract.js";
import { readRuntimeState } from "./stateReader.js";
import { transitionTask } from "./taskStateStore.js";
import type { M2VerifyTaskDependencies, M2VerifyTaskOutcome, M2VerifyTaskRequest } from "./m2RunSupport.js";
import { haltedVerify, m2Verdict } from "./m2RunSupport.js";

export interface M4VerifyTaskDependencies extends M2VerifyTaskDependencies {
  readonly projectScope?: ProjectScopeDependencies;
}

function observedPostimages(
  plan: M4ValidatedExecutionPlan,
  entries: ReturnType<typeof readEvidence>,
): readonly M4PostimageProof[] {
  const ordered = validateM4OrderedEvidence(plan, entries);
  if (ordered.kind === "invalid") return Object.freeze([]);
  const writes = ordered.kind === "complete" ? ordered.writes : ordered.completed;
  return Object.freeze(writes.flatMap((write) => {
    if (write.entry.record.schemaVersion !== 1 || write.entry.record.provenance !== M4_WRITE_PROVENANCE) {
      return [];
    }
    return [Object.freeze({
      kind: "observed-postimage" as const,
      taskId: plan.taskId,
      path: write.path,
      writeLine: write.entry.line,
      sha256: write.afterSha256,
    })];
  }));
}

function currentScope(
  request: M2VerifyTaskRequest,
  plan: M4ValidatedExecutionPlan,
  dependencies: M4VerifyTaskDependencies,
) {
  const target = plan.targets[0];
  if (target === undefined) return null;
  const detected = detectProject(request.rootDir, {
    adapter: plan.adapter,
    targetPath: target.path,
    requiredVerification: plan.requiredVerification,
  });
  if (detected.kind !== "supported") return null;
  return inspectM4PostWriteScope(detected.project, plan, dependencies.projectScope);
}

function matchingTask(plan: M4ValidatedExecutionPlan, rootDir: string) {
  const runtime = readRuntimeState(rootDir);
  if (runtime.kind !== "ok") return null;
  const matches = runtime.tasks.filter((task) => task.taskId === plan.taskId);
  return matches.length === 1 ? matches[0] ?? null : null;
}

export function verifyM4TaskUnlocked(
  request: M2VerifyTaskRequest,
  dependencies: M4VerifyTaskDependencies,
  plan: M4ValidatedExecutionPlan,
): M2VerifyTaskOutcome {
  if (request.requestedTaskId !== plan.taskId) {
    return haltedVerify("requested taskId does not match the current M4 task contract", { taskId: plan.taskId });
  }
  const task = matchingTask(plan, request.rootDir);
  if (task === null) return haltedVerify("authoritative M4 task state is missing or ambiguous", { taskId: plan.taskId });

  const entries = readEvidence(request.rootDir);
  const scope = currentScope(request, plan, dependencies);
  const verification = verifyM4ProjectChange(plan, entries, scope, observedPostimages(plan, entries));
  const verdict = m2Verdict(verification.verdict);
  if (verdict === "PASS") {
    return {
      kind: "verified",
      taskId: plan.taskId,
      verdict: "PASS",
      stateStatus: task.status,
      stateTransition: "none",
      reason: "persisted M4 evidence and fresh project scope passed deterministic certification",
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
      return haltedVerify("could not reconcile stale accepted M4 task state", {
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
