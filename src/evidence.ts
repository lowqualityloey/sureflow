/**
 * Minimal M1 evidence contracts (T3).
 *
 * Boundary: policy decides eligibility (ALLOW/DENY/REQUIRE_APPROVAL);
 * evidence records what occurred. It NEVER infers verification
 * verdicts — T4 owns interpretation (no verdicts import by design).
 * Evidence is NOT authoritative task state (.sureflow/state/ is).
 */

import type { PolicyDecision } from "./policy.js";
import { EVIDENCE_SCHEMA_VERSION } from "./evidenceConstants.js";

export { EVIDENCE_RELATIVE_PATH, EVIDENCE_SCHEMA_VERSION, REDACTED } from "./evidenceConstants.js";

/**
 * Exact persisted record. camelCase keys; only M1 §4 fields
 * (actor, recordedAt, taskId, capability, policyDecision, target,
 * result, provenance) plus schemaVersion for safe interpretation.
 */
export interface EvidenceRecord {
  readonly schemaVersion: typeof EVIDENCE_SCHEMA_VERSION;
  readonly actor: string;
  readonly recordedAt: string;
  readonly taskId: string;
  readonly capability: string;
  readonly policyDecision: PolicyDecision;
  readonly target: string;
  readonly result: string;
  readonly provenance: string;
}

export type EvidenceDraft = Omit<EvidenceRecord, "schemaVersion">;

export function isEvidenceRecord(value: unknown): value is EvidenceRecord {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    v["schemaVersion"] === EVIDENCE_SCHEMA_VERSION &&
    typeof v["actor"] === "string" &&
    typeof v["recordedAt"] === "string" &&
    typeof v["taskId"] === "string" &&
    typeof v["capability"] === "string" &&
    (v["policyDecision"] === "ALLOW" ||
      v["policyDecision"] === "DENY" ||
      v["policyDecision"] === "REQUIRE_APPROVAL") &&
    typeof v["target"] === "string" &&
    typeof v["result"] === "string" &&
    typeof v["provenance"] === "string"
  );
}
