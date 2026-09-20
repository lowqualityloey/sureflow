/**
 * Best-effort deterministic redaction BEFORE persistence (never after).
 * Covered forms (SECURITY.md / M1 credential+secret ops):
 * - secret-bearing KEY names (password, secret, token, apiKey,
 *   private keys, credentials, …) → whole value redacted;
 * - secret-shaped VALUES in free text (AWS AKIA, GitHub gh*,
 *   OpenAI sk-, Slack xox, JWTs, PEM private-key blocks).
 *
 * Documented limitation: unrecognized shapes pass through. Redacted
 * output is NOT proof that no secret remains. The original secret is
 * never stored alongside the redacted value.
 */
import type { EvidenceDraft, EvidenceRecord } from "./evidence.js";
import { EVIDENCE_SCHEMA_VERSION, REDACTED } from "./evidenceConstants.js";

export { REDACTED };

const SECRET_KEY_PATTERN =
  /password|passwd|secret|token|api[_-]?key|access[_-]?key|private[_-]?key|client[_-]?secret|refresh[_-]?token|session[_-]?token|credential|authorization|bearer|sessionid/i;

const SECRET_VALUE_PATTERNS: readonly RegExp[] = [
  /AKIA[0-9A-Z]{16}/g,
  /gh[pousr]_[A-Za-z0-9]{16,}/g,
  /sk-[A-Za-z0-9]{8,}(?:-[A-Za-z0-9]{8,})?/g,
  /xox[bpas]-[A-Za-z0-9-]+/g,
  /eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/g,
  /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g,
];

function redactText(text: string): string {
  let out = text;
  for (const pattern of SECRET_VALUE_PATTERNS) {
    pattern.lastIndex = 0;
    out = out.replace(pattern, REDACTED);
  }
  return out;
}

export function redactUnknownValue(value: unknown): unknown {
  if (typeof value === "string") return redactText(value);
  if (Array.isArray(value)) return value.map((entry) => redactUnknownValue(entry));
  if (typeof value === "object" && value !== null) {
    const out: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
      out[key] = SECRET_KEY_PATTERN.test(key) ? REDACTED : redactUnknownValue(entry);
    }
    return out;
  }
  return value;
}

/** Redact a draft and stamp the schema version. */
export function toPersistedRecord(draft: EvidenceDraft): EvidenceRecord {
  const redacted = redactUnknownValue({ ...draft }) as Record<string, unknown>;
  return {
    schemaVersion: EVIDENCE_SCHEMA_VERSION,
    actor: redacted["actor"] as string,
    recordedAt: redacted["recordedAt"] as string,
    taskId: redacted["taskId"] as string,
    capability: redacted["capability"] as string,
    policyDecision: redacted["policyDecision"] as EvidenceRecord["policyDecision"],
    target: redacted["target"] as string,
    result: redacted["result"] as string,
    provenance: redacted["provenance"] as string,
  };
}
