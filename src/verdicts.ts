/**
 * Verification verdicts (M1 contract).
 *
 * Deliberately isolated from policy decisions: a verifier reports
 * evidence outcomes, it never authorizes execution. DENY is NOT a
 * member of this union — see `src/policy.ts`.
 */
export type VerificationVerdict = "PASS" | "FAIL" | "UNKNOWN" | "BLOCKED";

export const VERIFICATION_VERDICTS: readonly VerificationVerdict[] = [
  "PASS",
  "FAIL",
  "UNKNOWN",
  "BLOCKED",
] as const;

export function isVerificationVerdict(value: string): value is VerificationVerdict {
  return (VERIFICATION_VERDICTS as readonly string[]).includes(value);
}
