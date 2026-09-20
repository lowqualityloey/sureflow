import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { EvidenceDraft } from "../src/evidence.js";
import { defaultEvidencePath, resolveEvidencePath } from "../src/evidencePaths.js";
import { appendEvidence, readEvidence } from "../src/evidenceStore.js";
import { REDACTED, redactUnknownValue } from "../src/redaction.js";

function draft(overrides: Partial<EvidenceDraft> = {}): EvidenceDraft {
  return {
    actor: "worker:t0",
    recordedAt: "2026-09-20T00:00:00.000Z",
    taskId: "TASK-T3",
    capability: "repo.write",
    policyDecision: "ALLOW",
    target: "fixtures/t0-basic/output.txt",
    result: "wrote marker",
    provenance: "node v24.20.0",
    ...overrides,
  };
}

function tempRoot(): string {
  return mkdtempSync(join(tmpdir(), "sureflow-t3-"));
}

describe("T3 redaction-before-write", () => {
  it("redacts secret-bearing values before bytes hit disk", () => {
    const root = tempRoot();
    appendEvidence(
      root,
      draft({ result: "token=ghp_1234567890abcdefghij done", provenance: "AKIAIOSFODNN7EXAMPLE" }),
    );
    const raw = readFileSync(defaultEvidencePath(root), "utf8");
    expect(raw).not.toContain("ghp_1234567890abcdefghij");
    expect(raw).not.toContain("AKIAIOSFODNN7EXAMPLE");
    expect(raw).toContain(REDACTED);
  });

  it("covers representative secret forms and keeps plain values intact", () => {
    expect(redactUnknownValue({ apiKey: "live-value", note: "plain text" })).toEqual({
      apiKey: REDACTED,
      note: "plain text",
    });
    const sk = redactUnknownValue("key sk-abc12345XYZ ok") as string;
    expect(sk).toContain(REDACTED);
    expect(sk).not.toContain("sk-abc12345XYZ");
    const jwt = redactUnknownValue("eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJVadQssw5c") as string;
    expect(jwt).toBe(REDACTED);
    const pem = redactUnknownValue("-----BEGIN RSA PRIVATE KEY-----\nMIIB\n-----END RSA PRIVATE KEY-----") as string;
    expect(pem).toBe(REDACTED);
    expect(redactUnknownValue("ordinary build output, exit 0")).toBe("ordinary build output, exit 0");
  });
});

describe("T3 corruption is surfaced, never silently dropped", () => {
  it("reports malformed lines with line numbers", () => {
    const root = tempRoot();
    appendEvidence(root, draft({ result: "good" }));
    const file = defaultEvidencePath(root);
    writeFileSync(file, `${readFileSync(file, "utf8")}{not-json\n{"schemaVersion":999}\n`, "utf8");
    const entries = readEvidence(root);
    expect(entries.filter((e) => e.kind === "record")).toHaveLength(1);
    const corrupt = entries.filter((e) => e.kind === "corrupt");
    expect(corrupt).toHaveLength(2);
    expect(corrupt[0]?.line).toBe(2);
    expect(corrupt[1]?.line).toBe(3);
  });
});

describe("T3 evidence namespace guard", () => {
  it("confines evidence to .sureflow/evidence/ .jsonl files", () => {
    const root = tempRoot();
    expect(resolveEvidencePath(root, ".sureflow/evidence/evidence.jsonl")).toBe(
      `${root}/.sureflow/evidence/evidence.jsonl`,
    );
    expect(() => resolveEvidencePath(root, "docs/STATE.md")).toThrow(/not evidence/);
    expect(() => resolveEvidencePath(root, ".sureflow/state/tasks/a.json")).toThrow(/outside/);
    expect(() => resolveEvidencePath(root, ".sureflow/evidence/../state/x.jsonl")).toThrow();
    expect(() => resolveEvidencePath(root, ".sureflow/evidence/notes.txt")).toThrow(/jsonl/);
  });
});
