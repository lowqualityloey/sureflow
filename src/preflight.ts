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
import { loadValidatedExecutionPlan } from "./taskContract.js";
import { detectProject } from "./projectDetection.js";
import {
  resolveAdapterContract,
} from "./projectAdapter.js";
import type { ResolvedAdapterContract } from "./projectAdapter.js";
import { resolveVerificationPlan } from "./verificationAdapter.js";

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
