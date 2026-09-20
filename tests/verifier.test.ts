import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { defaultEvidencePath } from "../src/evidencePaths.js";
import { appendEvidence, readEvidence, type EvidenceReadEntry } from "../src/evidenceStore.js";
import { type VerificationRequest, verifyEvidence } from "../src/verifier.js";

const TASK = "TASK-T4";
const CAPABILITY = "repo.test";
const TARGET = "fixtures/t0-basic/output.txt";

/** Request under test: the approved (taskId, capability, target) tuple. */
function req(overrides: Partial<VerificationRequest> = {}): VerificationRequest {
  return {
    taskId: TASK,
    capability: CAPABILITY,
    target: TARGET,
    expectedResult: "ok",
    ...overrides,
  };
}

type RecordEntry = Extract<EvidenceReadEntry, { kind: "record" }>;

function recordEntry(result: string, line = 1, overrides: Partial<RecordEntry["record"]> = {}): RecordEntry {
  return {
    kind: "record",
    line,
    record: {
      schemaVersion: 1,
      actor: "worker:t0",
      recordedAt: "2026-09-20T00:00:00.000Z",
      taskId: TASK,
      capability: CAPABILITY,
      policyDecision: "ALLOW",
      target: TARGET,
      result,
      provenance: "node v24.20.0",
      ...overrides,
    },
  };
}

function record(result: string, line = 1): EvidenceReadEntry {
  return recordEntry(result, line);
}

function corrupt(line = 1): EvidenceReadEntry {
  return { kind: "corrupt", line, raw: "{not-json", error: "Unexpected token" };
}

describe("T4 deterministic verifier", () => {
  it("returns PASS for valid complete positive evidence on the requested tuple", () => {
    const out = verifyEvidence(req(), [record("ok")]);
    expect(out.verdict).toBe("PASS");
    expect(out.recordsExamined).toBe(1);
    expect(out.corruptLines).toEqual([]);
  });

  it("returns FAIL for an explicit non-matching result", () => {
    const out = verifyEvidence(req(), [record("exit 1")]);
    expect(out.verdict).toBe("FAIL");
  });

  it("selects by (taskId, capability, target) without ordering semantics", () => {
    // Same task, other capability/target: not applicable to this request.
    const otherCapability = recordEntry("other", 1, { capability: "repo.write" });
    const otherTarget = recordEntry("other", 2, { target: "fixtures/t0-basic/other.txt" });
    const out = verifyEvidence(req(), [otherCapability, otherTarget, record("ok", 3)]);
    expect(out.verdict).toBe("PASS");
    expect(out.recordsExamined).toBe(1);
  });

  it("returns UNKNOWN for missing, empty, malformed, invalid, and unreadable evidence", () => {
    expect(verifyEvidence(req(), []).verdict).toBe("UNKNOWN");
    expect(verifyEvidence(req(), [corrupt(2)]).verdict).toBe("UNKNOWN");
    expect(verifyEvidence(req(), [record("ok", 1), corrupt(2)]).verdict).toBe("UNKNOWN");
    // Wrong task, wrong capability, wrong target: zero applicable records.
    expect(
      verifyEvidence(req({ taskId: "OTHER" }), [record("ok")]).verdict,
    ).toBe("UNKNOWN");
    expect(
      verifyEvidence(req({ capability: "repo.read" }), [record("ok")]).verdict,
    ).toBe("UNKNOWN");
    expect(
      verifyEvidence(req({ target: "fixtures/t0-basic/missing.txt" }), [record("ok")]).verdict,
    ).toBe("UNKNOWN");
    // Duplicate terminal record for the same tuple: no "latest wins".
    expect(
      verifyEvidence(req(), [record("ok", 1), record("ok", 2)]).verdict,
    ).toBe("UNKNOWN");
  });

  it("never drops corrupt lines to verify the rest, and never mutates inputs", () => {
    const entries: readonly EvidenceReadEntry[] = [record("ok"), corrupt(2)];
    const frozen = JSON.stringify(entries);
    const out = verifyEvidence(req(), entries);
    expect(out.verdict).toBe("UNKNOWN");
    expect(out.corruptLines).toEqual([2]);
    expect(JSON.stringify(entries)).toBe(frozen);
  });

  it("keeps policy decisions separate from verdicts and never emits BLOCKED", () => {
    const deniedRecord = recordEntry("ok");
    const withDeniedPolicy: RecordEntry = {
      ...deniedRecord,
      record: { ...deniedRecord.record, policyDecision: "DENY" },
    };
    const approvalRecord: RecordEntry = {
      ...deniedRecord,
      record: { ...deniedRecord.record, policyDecision: "REQUIRE_APPROVAL" },
    };

    const verdicts = [
      verifyEvidence(req(), [withDeniedPolicy]),
      verifyEvidence(req(), [approvalRecord]),
      verifyEvidence(req({ expectedResult: "mismatch" }), [approvalRecord]),
      verifyEvidence(req(), []),
    ].map((out) => out.verdict);

    for (const verdict of verdicts) {
      expect(["PASS", "FAIL", "UNKNOWN"]).toContain(verdict);
      expect(verdict).not.toBe("BLOCKED");
    }
    // Policy-domain values must never surface as verification verdicts.
    for (const policyValue of ["ALLOW", "DENY", "REQUIRE_APPROVAL"]) {
      expect(verdicts).not.toContain(policyValue);
    }
  });

  it("returns UNKNOWN for line-0 unreadable evidence and on-disk schema-invalid input", () => {
    const unreadable: EvidenceReadEntry = {
      kind: "corrupt",
      line: 0,
      raw: "",
      error: "unreadable evidence file: ENOENT",
    };
    const out = verifyEvidence(req(), [unreadable]);
    expect(out.verdict).toBe("UNKNOWN");
    expect(out.verdict).not.toBe("PASS");
    expect(out.corruptLines).toEqual([0]);

    // T3 classifies on-disk garbage as corrupt; T4 must surface it
    // rather than verifying around it.
    const root = mkdtempSync(join(tmpdir(), "sureflow-t4-"));
    appendEvidence(root, {
      actor: "worker:t0",
      recordedAt: "2026-09-20T00:00:00.000Z",
      taskId: TASK,
      capability: CAPABILITY,
      policyDecision: "ALLOW",
      target: TARGET,
      result: "ok",
      provenance: "node v24.20.0",
    });
    const file = defaultEvidencePath(root);
    writeFileSync(file, `${readFileSync(file, "utf8")}{"schemaVersion":999}\n`, "utf8");
    const diskOut = verifyEvidence(req(), readEvidence(root));
    expect(diskOut.verdict).toBe("UNKNOWN");
    expect(diskOut.corruptLines).toEqual([2]);
  });
});
