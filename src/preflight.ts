/**
 * M3-T2 public preflight: read-only structural eligibility observation.
 *
 * Preflight answers one question: is the canonical task structurally
 * eligible to be attempted (valid contract, matching taskId, resolvable
 * adapter/project shape, required scripts present, unambiguous manager
 * evidence)? It performs pure reads only:
 *
 * - reads .sureflow/task.json once (parse/validate, no writes)
 * - reads project evidence through detectProject (no execution)
 * - resolves the closed adapter contract (pure)
 * - resolves the fixed verification plan (pure)
 *
 * It MUST NOT acquire the mutation lock, create or modify state, append
 * evidence or events, write project files, or authorize a future run.
 * `run` independently repeats every authoritative safety check; a
 * successful preflight is structural observation, never authorization.
 */
import {
  loadValidatedExecutionPlan,
  loadValidatedM4ExecutionPlan,
  loadValidatedPreflightExecutionPlan,
  InvalidM4PreflightContractError,
  M2_TASK_CONTRACT_SCHEMA_VERSION,
  type M4ValidatedExecutionPlan,
  type ValidatedExecutionPlan,
  type ValidatedPreflightExecutionPlan,
} from "./taskContract.js";
import {
  detectProject,
  type DetectedNodeTypeScriptProject,
  type ProjectDetectionRequest,
} from "./projectDetection.js";
import {
  validateM4CompleteTargetSet,
  type M4TargetSetDependencies,
  type M4TargetSetOutcome,
} from "./completeTargetSet.js";
import {
  inspectProjectBaseline,
  type ProjectBaselineResult,
  type ProjectScopeDependencies,
} from "./projectScope.js";
import {
  resolveAdapterContract,
  resolveAdapterContractForIds,
} from "./projectAdapter.js";
import type { ResolvedAdapterContract } from "./projectAdapter.js";
import { resolveM4VerificationPlan } from "./m4VerificationBinding.js";
import {
  resolveVerificationPlan,
  type VerificationPlan,
} from "./verificationAdapter.js";

export interface PreflightRequest {
  readonly rootDir: string;
  readonly requestedTaskId: string;
}

export type PreflightOutcome =
  | {
      readonly kind: "eligible";
      readonly taskId: string;
      readonly adapterId: string;
      readonly executable: ResolvedAdapterContract["executable"];
    }
  | { readonly kind: "ineligible"; readonly reason: string };

export type M4ExecutionPreflight =
  | {
      readonly kind: "ready";
      readonly plan: M4ValidatedExecutionPlan;
      readonly project: DetectedNodeTypeScriptProject;
      readonly targetSet: Extract<M4TargetSetOutcome, { readonly kind: "validated" }>;
      readonly baseline: Extract<ProjectBaselineResult, { readonly kind: "clean" }>;
      readonly adapterContract: ResolvedAdapterContract;
      readonly verificationPlan: VerificationPlan;
    }
  | { readonly kind: "ineligible"; readonly reason: string };

export interface M4ExecutionPreflightDependencies {
  readonly targetSet?: M4TargetSetDependencies;
  readonly scope?: ProjectScopeDependencies;
}

function ineligible(reason: string): PreflightOutcome {
  return Object.freeze({ kind: "ineligible" as const, reason });
}

/**
 * Observe structural eligibility without mutating anything. Every step is a
 * read or a pure computation; no lock, state, evidence, event, or project
 * write occurs on any path.
 */
export function preflightM2Task(request: PreflightRequest): PreflightOutcome {
  let plan;
  try {
    plan = loadValidatedExecutionPlan(request.rootDir);
  } catch {
    return ineligible("invalid M2 task contract");
  }
  return preflightM2Plan(request, plan);
}

function preflightM2Plan(
  request: PreflightRequest,
  plan: ValidatedExecutionPlan,
): PreflightOutcome {
  if (request.requestedTaskId !== plan.taskId) {
    return ineligible("requested taskId does not match the M2 task contract");
  }

  const detected = detectProject(request.rootDir, plan);
  if (detected.kind !== "supported") {
    return ineligible(`project detection ${detected.kind}: ${detected.reason}`);
  }

  const adapterResolution = resolveAdapterContract(detected.project, plan);
  if (adapterResolution.kind !== "resolved") {
    return ineligible(`adapter resolution unsupported: ${adapterResolution.reason}`);
  }

  const verification = resolveVerificationPlan(detected.project, plan, adapterResolution.contract);
  if (verification.kind !== "resolved") {
    return ineligible(
      `verification profile resolution unsupported: ${verification.missingChecks.join(", ") || "invalid plan"}`,
    );
  }

  return Object.freeze({
    kind: "eligible" as const,
    taskId: plan.taskId,
    adapterId: adapterResolution.contract.adapterId,
    executable: adapterResolution.contract.executable,
  });
}

function projectDetectionView(
  plan: M4ValidatedExecutionPlan,
): ProjectDetectionRequest | null {
  const target = plan.targets[0];
  if (target === undefined) return null;
  return Object.freeze({
    adapter: plan.adapter,
    targetPath: target.path,
    requiredVerification: plan.requiredVerification,
  });
}

function preflightM4Plan(
  request: PreflightRequest,
  plan: M4ValidatedExecutionPlan,
): PreflightOutcome {
  const result = preflightM4Execution(request, plan);
  if (result.kind !== "ready") return ineligible(result.reason);
  return Object.freeze({
    kind: "eligible" as const,
    taskId: plan.taskId,
    adapterId: result.adapterContract.adapterId,
    executable: result.adapterContract.executable,
  });
}

export function preflightM4Execution(
  request: PreflightRequest,
  plan: M4ValidatedExecutionPlan,
  dependencies: M4ExecutionPreflightDependencies = {},
): M4ExecutionPreflight {
  if (request.requestedTaskId !== plan.taskId) {
    return { kind: "ineligible", reason: "requested taskId does not match the M4 task contract" };
  }
  const detectionPlan = projectDetectionView(plan);
  if (detectionPlan === null) {
    return { kind: "ineligible", reason: "M4 task contract has no project target" };
  }

  const detected = detectProject(request.rootDir, detectionPlan);
  if (detected.kind !== "supported") {
    return { kind: "ineligible", reason: `project detection ${detected.kind}: ${detected.reason}` };
  }

  const targetSet = validateM4CompleteTargetSet(
    detected.project.root,
    plan.targets,
    dependencies.targetSet,
  );
  if (targetSet.kind === "refused") {
    return { kind: "ineligible", reason: `M4 complete target set refused: ${targetSet.reason}` };
  }

  const baseline = inspectProjectBaseline(detected.project, dependencies.scope);
  if (baseline.kind !== "clean") {
    const reason = baseline.kind === "dirty"
      ? "project baseline is not clean"
      : `${baseline.kind}: ${baseline.reason}`;
    return { kind: "ineligible", reason: `M4 project baseline refused: ${reason}` };
  }

  const adapterResolution = resolveAdapterContractForIds(detected.project.adapter, plan.adapter);
  if (adapterResolution.kind !== "resolved") {
    return { kind: "ineligible", reason: `adapter resolution unsupported: ${adapterResolution.reason}` };
  }
  const verification = resolveM4VerificationPlan(detected.project, plan, adapterResolution.contract);
  if (verification.kind !== "resolved") {
    return {
      kind: "ineligible",
      reason: `verification profile resolution unsupported: ${verification.missingChecks.join(", ") || "invalid plan"}`,
    };
  }
  return Object.freeze({
    kind: "ready" as const,
    plan,
    project: detected.project,
    targetSet,
    baseline,
    adapterContract: adapterResolution.contract,
    verificationPlan: verification.plan,
  });
}

function preflightPlan(
  request: PreflightRequest,
  plan: ValidatedPreflightExecutionPlan,
): PreflightOutcome {
  switch (plan.schemaVersion) {
    case M2_TASK_CONTRACT_SCHEMA_VERSION:
      return preflightM2Plan(request, plan);
    case 2:
      return preflightM4Plan(request, plan);
    default:
      return assertNever(plan);
  }
}

function assertNever(value: never): never {
  throw new Error(`unsupported task contract version: ${String(value)}`);
}

export function preflightM4Task(request: PreflightRequest): PreflightOutcome {
  let plan;
  try {
    plan = loadValidatedM4ExecutionPlan(request.rootDir);
  } catch {
    return ineligible("invalid M4 task contract");
  }
  return preflightM4Plan(request, plan);
}

export function preflightTask(request: PreflightRequest): PreflightOutcome {
  let plan;
  try {
    plan = loadValidatedPreflightExecutionPlan(request.rootDir);
  } catch (error: unknown) {
    return ineligible(
      error instanceof InvalidM4PreflightContractError
        ? "invalid M4 task contract"
        : "invalid M2 task contract",
    );
  }
  return preflightPlan(request, plan);
}
