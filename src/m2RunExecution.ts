import {
  applyBoundedReplacement,
  validateBoundedReplacement,
  type BoundedReplacementOutcome,
  type ReplacementPreflight,
} from "./boundedReplacement.js";
import { detectProject, type DetectedNodeTypeScriptProject } from "./projectDetection.js";
import { resolveAdapterContract, type ResolvedAdapterContract } from "./projectAdapter.js";
import {
  inspectProjectBaseline,
  type ProjectBaselineResult,
} from "./projectScope.js";
import { loadPolicy } from "./policyStore.js";
import { readRuntimeState } from "./stateReader.js";
import type { TaskStatus } from "./state.js";
import { beginTask, taskStateExists, transitionTask } from "./taskStateStore.js";
import { loadValidatedExecutionPlan } from "./taskContract.js";
import type { ValidatedExecutionPlan } from "./taskContract.js";
import { resolveVerificationPlan, type VerificationPlan } from "./verificationAdapter.js";
import {
  emptyPolicyDecisions,
  haltedRun,
  phase,
  persistEvent,
  readExistingEvidenceForReplay,
  transitionHalted,
  type M2RunTaskDependencies,
  type M2RunTaskOutcome,
  type M2RunTaskRequest,
} from "./m2RunSupport.js";
import { completeM2RunVerification } from "./m2RunVerification.js";
import { allPolicyDecisions } from "./m2VerificationBinding.js";
import type { PolicyDecision } from "./policy.js";

export async function runM2TaskUnlocked(
  request: M2RunTaskRequest,
  dependencies: M2RunTaskDependencies,
  loadedPlan?: ValidatedExecutionPlan,
): Promise<M2RunTaskOutcome> {
  const nowIso = dependencies.nowIso ?? (() => new Date().toISOString());
  const transitions: TaskStatus[] = [];
  let taskStarted = false;
  let taskRunning = false;
  let taskId: string | null = null;
  let policyDecisions: Readonly<Record<string, PolicyDecision>> = emptyPolicyDecisions();

  let plan;
  try {
    plan = loadedPlan ?? loadValidatedExecutionPlan(request.rootDir);
  } catch {
    return haltedRun("invalid M2 task contract");
  }

  try {
    taskId = plan.taskId;
    await phase(dependencies, "plan-loaded");
    if (request.requestedTaskId !== plan.taskId) {
      return haltedRun("requested taskId does not match the M2 task contract", { taskId });
    }
    const runtime = readRuntimeState(request.rootDir);
    if (runtime.kind !== "ok") {
      return haltedRun("authoritative runtime state is not initialized or valid", { taskId });
    }
    if (runtime.tasks.some((task) => task.status === "pending" || task.status === "running")) {
      return haltedRun("another task is already pending or running", { taskId });
    }
    if (taskStateExists(request.rootDir, plan.taskId)) {
      return haltedRun("authoritative task state already exists; replay is refused", { taskId });
    }
    const existingEvidence = readExistingEvidenceForReplay(request.rootDir, plan.taskId);
    if (existingEvidence.kind === "halted") return haltedRun(existingEvidence.reason, { taskId });

    let policy;
    try {
      policy = loadPolicy(request.rootDir);
    } catch {
      return haltedRun("policy authority is missing or invalid", { taskId });
    }
    const detected = detectProject(request.rootDir, plan);
    if (detected.kind !== "supported") {
      return haltedRun(`project detection ${detected.kind}: ${detected.reason}`, { taskId });
    }
    const project: DetectedNodeTypeScriptProject = detected.project;
    await phase(dependencies, "project-detected");

    const adapterResolution = resolveAdapterContract(project, plan);
    if (adapterResolution.kind !== "resolved") {
      return haltedRun(`adapter resolution unsupported: ${adapterResolution.reason}`, { taskId });
    }
    const adapterContract: ResolvedAdapterContract = adapterResolution.contract;
    const resolved = resolveVerificationPlan(project, plan, adapterContract);
    if (resolved.kind !== "resolved") {
      return haltedRun(
        `verification profile resolution unsupported: ${resolved.missingChecks.join(", ") || "invalid plan"}`,
        { taskId },
      );
    }
    const verificationPlan: VerificationPlan = resolved.plan;
    await phase(dependencies, "verification-resolved");

    const baseline: ProjectBaselineResult = inspectProjectBaseline(project);
    if (baseline.kind !== "clean") {
      return haltedRun(`project baseline ${baseline.kind}: ${"reason" in baseline ? baseline.reason : "unexpected changes"}`, { taskId });
    }
    await phase(dependencies, "baseline-captured");

    const preflight: ReplacementPreflight | BoundedReplacementOutcome =
      validateBoundedReplacement(project, plan);
    if (preflight.kind !== "ready") {
      return haltedRun(`replacement preflight refused: ${preflight.reason}`, { taskId });
    }
    await phase(dependencies, "replacement-preflighted");

    policyDecisions = allPolicyDecisions(policy);
    const blockedCapability = (["repo.read", "repo.write", "repo.verify"] as const).find(
      (capability) => policyDecisions[capability] !== "ALLOW",
    );
    if (blockedCapability !== undefined) {
      const decision = policyDecisions[blockedCapability];
      if (decision === undefined) {
        return haltedRun("policy decision could not be established", { taskId, policyDecisions });
      }
      persistEvent(
        request.rootDir,
        plan.taskId,
        blockedCapability,
        decision,
        blockedCapability,
        decision === "DENY" ? "policy-denied" : "approval-required",
        nowIso(),
      );
      return haltedRun(`policy ${decision.toLowerCase()} for ${blockedCapability}`, {
        taskId,
        policyDecisions,
      });
    }

    beginTask(request.rootDir, plan.taskId, nowIso());
    taskStarted = true;
    transitions.push("pending");
    transitionTask(request.rootDir, plan.taskId, "running", nowIso());
    taskRunning = true;
    transitions.push("running");
    await phase(dependencies, "task-running");

    const replacement = applyBoundedReplacement(project, plan, policy);
    if (replacement.kind !== "applied") {
      const persistFailure = transitionHalted(request.rootDir, plan.taskId, nowIso, transitions);
      taskRunning = false;
      return haltedRun(
        persistFailure ?? `replacement refused: ${replacement.reason}`,
        { taskId, policyDecisions, transitions },
      );
    }
    return await completeM2RunVerification({
      request,
      dependencies,
      nowIso,
      transitions,
      taskId: plan.taskId,
      plan,
      project,
      adapterContract,
      verificationPlan,
      replacement,
      policyDecisions,
    });
  } catch {
    if (taskStarted && taskRunning) {
      const persistFailure = transitionHalted(request.rootDir, plan.taskId, nowIso, transitions);
      taskRunning = false;
      return haltedRun(
        persistFailure ?? "run halted after an unexpected mutation failure",
        { taskId, policyDecisions, transitions },
      );
    }
    return haltedRun("run halted before the bounded project change completed", {
      taskId,
      policyDecisions,
      transitions,
    });
  }
}
