/**
 * M3-T1 closed project-adapter contract.
 *
 * This module is the single resolution seam between task/project evidence and
 * manager-neutral kernel behavior:
 *
 *   task/project evidence
 *       |
 *       v
 *   resolveAdapterContract()   <-- the only place that names a package manager
 *       |
 *       v
 *   ResolvedAdapterContract    <-- everything downstream consumes this
 *       |
 *       v
 *   manager-neutral kernel behavior (orchestration, verification, evidence)
 *
 * The contract is CLOSED: one compile-time-known discriminated union member,
 * one exhaustive switch, no registry, no plugin loader, no registration API,
 * no filesystem discovery, no runtime adapter installation, and no
 * caller-supplied executable or argv. T1 resolves only the accepted npm
 * adapter. pnpm representation and support belong to T2 and must not appear
 * externally supported here.
 */

import {
  M2_ADAPTER_ID,
  M2_VERIFICATION_PROFILES,
} from "./taskContract.js";
import type {
  M2VerificationProfile,
  ValidatedExecutionPlan,
} from "./taskContract.js";
import type { DetectedNodeTypeScriptProject } from "./projectDetection.js";

/** Version of this closed adapter-contract shape (not the evidence schema). */
export const M3_ADAPTER_CONTRACT_VERSION = 1 as const;

/**
 * Closed adapter identity set. Exactly one member in T1. A future T2 pnpm
 * member may extend this union; nothing here may be extended at runtime.
 */
export const M3_ADAPTER_IDS = [M2_ADAPTER_ID] as const;

export type M3AdapterId = (typeof M3_ADAPTER_IDS)[number];

/** Closed project-manager identity set. npm only in T1. */
export type M3ProjectManager = "npm";

/** Closed cwd-role set. Verification always runs at the project root in M3. */
export type M3CwdRole = "project-root";

/**
 * Fixed dispatch table for the npm adapter: verification profile to the exact
 * fixed argv Sureflow spawns. Owned by the resolution seam only; kernel code
 * must read dispatch through a ResolvedAdapterContract, never this table.
 */
const NPM_ADAPTER_DISPATCH: Readonly<Record<M2VerificationProfile, readonly string[]>> =
  Object.freeze({
    typecheck: Object.freeze(["run", "typecheck"]),
    test: Object.freeze(["test"]),
    lint: Object.freeze(["run", "lint"]),
    build: Object.freeze(["run", "build"]),
  });

/**
 * Resolved adapter contract consumed by kernel/orchestration code after
 * resolution. Carries only fixed reviewed values: no caller input, no
 * executable/argv injection surface.
 */
export interface ResolvedAdapterContract {
  readonly adapterId: M3AdapterId;
  readonly contractVersion: typeof M3_ADAPTER_CONTRACT_VERSION;
  readonly manager: M3ProjectManager;
  readonly executable: "npm";
  readonly cwdRole: M3CwdRole;
  readonly verificationProfiles: readonly M2VerificationProfile[];
  readonly dispatch: Readonly<Record<M2VerificationProfile, readonly string[]>>;
}

export type ResolveAdapterOutcome =
  | { readonly kind: "resolved"; readonly contract: ResolvedAdapterContract }
  | { readonly kind: "unsupported"; readonly reason: string };

function unsupported(reason: string): ResolveAdapterOutcome {
  return Object.freeze({ kind: "unsupported" as const, reason });
}

function npmContract(): ResolvedAdapterContract {
  return Object.freeze({
    adapterId: M2_ADAPTER_ID,
    contractVersion: M3_ADAPTER_CONTRACT_VERSION,
    manager: "npm" as const,
    executable: "npm" as const,
    cwdRole: "project-root" as const,
    verificationProfiles: M2_VERIFICATION_PROFILES,
    dispatch: NPM_ADAPTER_DISPATCH,
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readAdapterId(value: unknown): string | null {
  if (!isRecord(value)) return null;
  const adapter = value["adapter"];
  return typeof adapter === "string" ? adapter : null;
}

function isNonEmptyStringArray(value: unknown): value is readonly string[] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every(
      (element) => typeof element === "string" && element.length > 0 && !element.includes("\u0000"),
    )
  );
}

/**
 * Fail-closed validation for a caller-supplied contract object (forged or
 * stale). Kernel entry points must pass explicit contracts through this
 * guard; comparisons stay meaningful because the input is unknown.
 */
export function isResolvedAdapterContract(value: unknown): value is ResolvedAdapterContract {
  if (!isRecord(value)) return false;
  if (value["adapterId"] !== M2_ADAPTER_ID) return false;
  if (value["contractVersion"] !== M3_ADAPTER_CONTRACT_VERSION) return false;
  if (value["manager"] !== "npm") return false;
  if (value["executable"] !== "npm") return false;
  if (value["cwdRole"] !== "project-root") return false;
  const profiles = value["verificationProfiles"];
  if (
    !Array.isArray(profiles) ||
    profiles.length !== M2_VERIFICATION_PROFILES.length ||
    !M2_VERIFICATION_PROFILES.every((profile, index) => profiles[index] === profile)
  ) {
    return false;
  }
  const dispatch = value["dispatch"];
  if (!isRecord(dispatch)) return false;
  return M2_VERIFICATION_PROFILES.every((profile) => isNonEmptyStringArray(dispatch[profile]));
}

/**
 * Resolve one closed adapter contract from two adapter identities (detected
 * project side and plan side). This exhaustive switch is the only place
 * permitted to name a package manager or adapter identity.
 */
export function resolveAdapterContractForIds(
  projectAdapter: unknown,
  planAdapter: unknown,
): ResolveAdapterOutcome {
  if (typeof projectAdapter !== "string" || typeof planAdapter !== "string") {
    return unsupported("adapter identity is missing from project or plan evidence");
  }
  if (projectAdapter !== planAdapter) {
    return unsupported("project and plan adapter identities disagree");
  }
  switch (projectAdapter) {
    case M2_ADAPTER_ID:
      return Object.freeze({ kind: "resolved" as const, contract: npmContract() });
    default:
      return unsupported(`unsupported adapter identity: ${projectAdapter}`);
  }
}

/**
 * Resolve one closed adapter contract from detected-project and
 * snapshot-owned task-plan evidence.
 */
export function resolveAdapterContract(
  project: DetectedNodeTypeScriptProject,
  plan: ValidatedExecutionPlan,
): ResolveAdapterOutcome {
  return resolveAdapterContractForIds(readAdapterId(project), readAdapterId(plan));
}

/**
 * Fixed argv for one verification profile from an already-resolved contract.
 * Kernel consumers call this instead of branching on a package manager.
 */
export function adapterStepArgv(
  contract: ResolvedAdapterContract,
  check: M2VerificationProfile,
): readonly string[] {
  return contract.dispatch[check];
}
