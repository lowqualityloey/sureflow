/**
 * Policy decisions (M1 contract).
 *
 * Separate domain from verification verdicts (`src/verdicts.ts`).
 * Policy answers ONE question: is this operation eligible to execute?
 * It never reports evidence outcomes. There is no shared status enum.
 */
export type PolicyDecision = "ALLOW" | "DENY" | "REQUIRE_APPROVAL";

export const POLICY_DECISIONS: readonly PolicyDecision[] = [
  "ALLOW",
  "DENY",
  "REQUIRE_APPROVAL",
] as const;

/**
 * Allowlisted M1 capabilities. Everything else is denied by default.
 * `repo.write` is fixture-scoped (see worker jail, T6).
 */
export const M1_CAPABILITY_ALLOWLIST: readonly string[] = [
  "repo.read",
  "repo.write",
  "repo.test",
] as const;

/**
 * Approved M1 protected operations (M-D3). Each requires explicit
 * human approval evidence; tests and model output never substitute.
 */
export const M1_PROTECTED_OPERATIONS: readonly string[] = [
  "deploy.production",
  "git.merge.protected",
  "db.mutate.production",
  "fs.destructive",
  "secret.operate",
] as const;

export interface PolicyConfig {
  readonly allowlist: readonly string[];
  readonly protectedOperations: readonly string[];
}

export const DEFAULT_M1_POLICY: PolicyConfig = {
  allowlist: M1_CAPABILITY_ALLOWLIST,
  protectedOperations: M1_PROTECTED_OPERATIONS,
};

/**
 * Minimal default-deny evaluator. Pure function: no I/O, no worker
 * machinery (T6 owns execution), no verifier import (separate domain).
 */
export function decidePolicy(
  policy: PolicyConfig,
  capability: string,
): PolicyDecision {
  if (policy.protectedOperations.includes(capability)) {
    return "REQUIRE_APPROVAL";
  }
  if (policy.allowlist.includes(capability)) {
    return "ALLOW";
  }
  return "DENY";
}
