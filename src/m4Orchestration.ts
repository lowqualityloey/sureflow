import { readEvidence } from "./evidenceStore.js";
import { appendM4Evidence } from "./m4VerificationBinding.js";
import { readRuntimeState } from "./stateReader.js";
import { beginTask, taskStateExists, transitionTask } from "./taskStateStore.js";
import { loadPolicy } from "./policyStore.js";
import { allPolicyDecisions, blockedCapability } from "./m2VerificationBinding.js";
import { preflightM4Execution } from "./preflight.js";
import type { M2RunTaskDependencies, M2RunTaskOutcome, M2RunTaskRequest } from "./m2RunSupport.js";
import { emptyPolicyDecisions, haltedRun, m2Verdict, phase, persistEvent, readExistingEvidenceForReplay, transitionHalted } from "./m2RunSupport.js";
import { executeM4WriteCoordinator } from "./m4WriteCoordinator.js";
import type { M4TargetWriteEvent } from "./m4WriteCoordinator.js";
import { recordM4TargetOutcome } from "./m4PostWriteEvidence.js";
import type { M4PostWriteEvidenceDependencies } from "./m4PostWriteEvidence.js";
import {
  appendM4InputBinding,
  appendM4PrewriteBinding,
  appendM4TerminalContractObservation,
  computeM4VerificationInputBinding,
  M4_ACTOR,
  M4_SCOPE_PROVENANCE,
  m4ScopeResult,
  verificationEvidence,
} from "./m4VerificationBinding.js";
import { verifyM4ProjectChange } from "./m4ProjectChangeVerifier.js";
import { inspectM4PostWriteScope } from "./projectScope.js";
import type { M4PostimageProof } from "./projectEvidenceEvaluation.js";
import type { M4ValidatedExecutionPlan } from "./taskContract.js";
import type { ProjectScopeDependencies } from "./projectScope.js";
import type { M4ExecutionPreflightDependencies } from "./preflight.js";
import type { M4TargetSetDependencies } from "./completeTargetSet.js";
import type { AtomicRename } from "./singleFileReplacement.js";
import type { M3TerminalCause } from "./evidenceV2.js";
import { runBoundedVerificationPlan, terminalCauseForResult } from "./verificationExecution.js";
import type { VerificationStepResult } from "./verificationAdapter.js";
import type { PolicyDecision } from "./policy.js";
import type { TaskStatus } from "./state.js";

export interface M4RunTaskDependencies extends M2RunTaskDependencies {
  readonly preflight?: M4ExecutionPreflightDependencies;
  readonly targetInspection?: M4TargetSetDependencies;
  readonly projectScope?: ProjectScopeDependencies;
  readonly postWriteEvidence?: M4PostWriteEvidenceDependencies;
  readonly atomicRename?: AtomicRename;
  readonly onTargetOutcome?: (outcome: M4TargetWriteEvent) => void;
}

function finish(
  request: M2RunTaskRequest,
  plan: M4ValidatedExecutionPlan,
  nowIso: () => string,
  transitions: TaskStatus[],
  verificationResults: readonly VerificationStepResult[],
  policyDecisions: Readonly<Record<string, PolicyDecision>>,
  verdict: "PASS" | "FAIL" | "UNKNOWN",
  reasons: readonly string[],
): M2RunTaskOutcome {
  const status = verdict === "PASS" ? "accepted" : "halted";
  try {
    transitionTask(request.rootDir, plan.taskId, status, nowIso());
    transitions.push(status);
  } catch {
    return haltedRun("could not persist the final authoritative task state", {
      taskId: plan.taskId,
      verdict,
      transitions,
      verificationResults,
      policyDecisions,
    });
  }
  return verdict === "PASS"
    ? {
        kind: "accepted",
        taskId: plan.taskId,
        verdict,
        transitions,
        verificationResults,
        policyDecisions,
        reason: "complete-set project-change evidence passed deterministic certification",
      }
    : haltedRun(`verification ${verdict}: ${reasons.join("; ")}`, {
        taskId: plan.taskId,
        verdict,
        transitions,
        verificationResults,
        policyDecisions,
      });
}

export async function runM4TaskUnlocked(
  request: M2RunTaskRequest,
  dependencies: M4RunTaskDependencies,
  plan: M4ValidatedExecutionPlan,
): Promise<M2RunTaskOutcome> {
  const nowIso = dependencies.nowIso ?? (() => new Date().toISOString());
  const transitions: TaskStatus[] = [];
  const noResults: readonly VerificationStepResult[] = Object.freeze([]);
  let policyDecisions = emptyPolicyDecisions();
  let taskStarted = false;
  let taskRunning = false;
  let terminalRecorded = false;
  const proofs: M4PostimageProof[] = [];
  const ensureTerminal = (): void => {
    if (terminalRecorded) return;
    appendM4TerminalContractObservation(request.rootDir, plan, nowIso());
    terminalRecorded = true;
  };
  const haltStarted = (reason: string, results: readonly VerificationStepResult[] = noResults): M2RunTaskOutcome => {
    let terminalFailure: string | null = null;
    if (taskStarted && !terminalRecorded) {
      try {
        ensureTerminal();
      } catch {
        terminalFailure = "terminal contract observation could not be persisted";
      }
    }
    const stateFailure = taskStarted
      ? transitionHalted(request.rootDir, plan.taskId, nowIso, transitions)
      : null;
    taskRunning = false;
    return haltedRun(stateFailure ?? terminalFailure ?? reason, {
      taskId: plan.taskId,
      transitions,
      verificationResults: results,
      policyDecisions,
    });
  };

  try {
    if (request.requestedTaskId !== plan.taskId) {
      return haltedRun("requested taskId does not match the M4 task contract", { taskId: plan.taskId });
    }
    const runtime = readRuntimeState(request.rootDir);
    if (runtime.kind !== "ok") return haltedRun("authoritative runtime state is not initialized or valid", { taskId: plan.taskId });
    if (runtime.tasks.some((task) => task.status === "pending" || task.status === "running")) {
      return haltedRun("another task is already pending or running", { taskId: plan.taskId });
    }
    if (taskStateExists(request.rootDir, plan.taskId)) {
      return haltedRun("authoritative task state already exists; replay is refused", { taskId: plan.taskId });
    }
    const replay = readExistingEvidenceForReplay(request.rootDir, plan.taskId);
    if (replay.kind === "halted") return haltedRun(replay.reason, { taskId: plan.taskId });
    const preflight = preflightM4Execution(request, plan, dependencies.preflight);
    if (preflight.kind !== "ready") return haltedRun(preflight.reason, { taskId: plan.taskId });
    const protectedInputs = new Set(["package.json", preflight.project.lockfilePath, "tsconfig.json"]);
    if (plan.targets.some((target) => protectedInputs.has(target.path))) {
      return haltedRun("M4 target set cannot replace project verification inputs", { taskId: plan.taskId });
    }
    let policy;
    try {
      policy = loadPolicy(request.rootDir);
    } catch {
      return haltedRun("policy authority is missing or invalid", { taskId: plan.taskId });
    }
    await phase(dependencies, "project-detected");
    await phase(dependencies, "verification-resolved");
    await phase(dependencies, "baseline-captured");
    await phase(dependencies, "replacement-preflighted");

    policyDecisions = allPolicyDecisions(policy);
    const blocked = blockedCapability(policyDecisions);
    if (blocked !== null) {
      const decision = policyDecisions[blocked];
      if (decision === undefined) return haltedRun("policy decision could not be established", { taskId: plan.taskId, policyDecisions });
      persistEvent(request.rootDir, plan.taskId, blocked, decision, blocked, decision === "DENY" ? "policy-denied" : "approval-required", nowIso());
      return haltedRun(`policy ${decision.toLowerCase()} for ${blocked}`, { taskId: plan.taskId, policyDecisions });
    }

    beginTask(request.rootDir, plan.taskId, nowIso());
    taskStarted = true;
    transitions.push("pending");
    transitionTask(request.rootDir, plan.taskId, "running", nowIso());
    taskRunning = true;
    transitions.push("running");
    await phase(dependencies, "task-running");
    appendM4PrewriteBinding(request.rootDir, plan, nowIso());

    const coordinator = executeM4WriteCoordinator({
      projectRoot: preflight.project.root,
      plan,
      eligibleSet: preflight.targetSet,
      dependencies: {
        ...(dependencies.targetInspection === undefined ? {} : { inspection: dependencies.targetInspection }),
        ...(dependencies.atomicRename === undefined ? {} : { atomicRename: dependencies.atomicRename }),
        onTargetOutcome: (outcome) => {
          const observation = recordM4TargetOutcome(
            request.rootDir,
            preflight.project.root,
            plan,
            outcome,
            nowIso(),
            dependencies.postWriteEvidence,
          );
          if (observation.kind === "applied") proofs.push(observation.proof);
          dependencies.onTargetOutcome?.(outcome);
        },
      },
    });
    await phase(dependencies, "replacement-applied");
    if (coordinator.kind !== "completed") {
      ensureTerminal();
      const verification = verifyM4ProjectChange(plan, readEvidence(request.rootDir), null, proofs);
      await phase(dependencies, "verdict-computed");
      return finish(request, plan, nowIso, transitions, noResults, policyDecisions, m2Verdict(verification.verdict), verification.reasons);
    }

    const binding = computeM4VerificationInputBinding(preflight.project, plan);
    appendM4InputBinding(request.rootDir, plan.taskId, binding.result, nowIso());
    let verificationResults: readonly VerificationStepResult[];
    let causes: readonly M3TerminalCause[];
    if (dependencies.runVerification !== undefined && dependencies.verificationSpawn === undefined) {
      verificationResults = await dependencies.runVerification(preflight.project, preflight.verificationPlan);
      causes = verificationResults.map((result) => terminalCauseForResult(result));
    } else {
      const bounded = await runBoundedVerificationPlan(preflight.project, preflight.verificationPlan, {
        ...(dependencies.verificationSpawn === undefined ? {} : { spawn: dependencies.verificationSpawn }),
        ...(dependencies.verificationClock === undefined ? {} : { clock: dependencies.verificationClock }),
        ...(dependencies.verificationInterruption === undefined ? {} : { interruption: dependencies.verificationInterruption }),
      });
      verificationResults = bounded.results;
      causes = bounded.causes;
    }
    await phase(dependencies, "verification-complete");
    verificationEvidence(request.rootDir, plan, preflight.adapterContract, verificationResults, causes, binding.digest, nowIso);
    const scope = inspectM4PostWriteScope(preflight.project, plan, dependencies.projectScope);
    appendM4Evidence(request.rootDir, {
      actor: M4_ACTOR,
      recordedAt: nowIso(),
      taskId: plan.taskId,
      capability: "repo.read",
      policyDecision: "ALLOW",
      target: "project-scope",
      result: m4ScopeResult(scope),
      provenance: M4_SCOPE_PROVENANCE,
    });
    await phase(dependencies, "scope-captured");
    ensureTerminal();
    await phase(dependencies, "contract-rechecked");
    const verification = verifyM4ProjectChange(plan, readEvidence(request.rootDir), scope, proofs);
    await phase(dependencies, "evidence-appended");
    await phase(dependencies, "verdict-computed");
    return finish(request, plan, nowIso, transitions, verificationResults, policyDecisions, m2Verdict(verification.verdict), verification.reasons);
  } catch {
    if (taskStarted && taskRunning) return haltStarted("run halted after an unexpected M4 mutation or evidence failure");
    return haltedRun("run halted before the bounded M4 project change completed", {
      taskId: plan.taskId,
      policyDecisions,
      transitions,
    });
  }
}
