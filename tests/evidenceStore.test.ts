import { appendFileSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  EVIDENCE_RELATIVE_PATH,
  type EvidenceDraft,
} from "../src/evidence.js";
import { defaultEvidencePath } from "../src/evidencePaths.js";
import { appendEvidence, appendEvidenceV2, readEvidence } from "../src/evidenceStore.js";
import { digestArgv, type EvidenceRecordV2 } from "../src/evidenceV2.js";

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

function v2Draft(
  terminalCause: string,
): Omit<EvidenceRecordV2, "schemaVersion"> {
  return {
    actor: "worker:m2",
    recordedAt: "2026-09-22T00:00:00.000Z",
    taskId: "TASK-T3",
    capability: "repo.verify",
    policyDecision: "ALLOW",
    target: "node-typescript/npm-scripts-v1:test",
    result: terminalCause,
    provenance: `verification-execution-v2;binding=${"a".repeat(64)};shell=false`,
    executionContext: {
      adapterId: "node-typescript/npm-scripts-v1",
      adapterContractVersion: 1,
      executable: "npm",
      argv: ["test"],
      argvDigest: digestArgv(["test"]),
      cwdRole: "project-root",
      stepLimitSeconds: 120,
      overallBudgetSeconds: 300,
      terminationGraceSeconds: 5,
      terminalCause,
    },
  };
}

function tempRoot(): string {
  return mkdtempSync(join(tmpdir(), "sureflow-t3-"));
}

describe("T3 append-only JSONL persistence", () => {
  it("appends multiple records without replacing prior ones", () => {
    const root = tempRoot();
    appendEvidence(root, draft({ result: "first" }));
    appendEvidence(root, draft({ result: "second" }));
    const file = defaultEvidencePath(root);
    const lines = readFileSync(file, "utf8").trim().split("\n");
    expect(lines).toHaveLength(2);
    expect(readEvidence(root).filter((e) => e.kind === "record")).toHaveLength(2);
  });

  it("writes one independently-parseable JSON object per line", () => {
    const root = tempRoot();
    appendEvidence(root, draft());
    const file = defaultEvidencePath(root);
    for (const line of readFileSync(file, "utf8").trim().split("\n")) {
      const parsed: unknown = JSON.parse(line);
      expect(typeof parsed).toBe("object");
    }
    expect(EVIDENCE_RELATIVE_PATH).toBe(".sureflow/evidence/evidence.jsonl");
  });

  it("stores v1 and v2 records side by side and keeps their line numbers", () => {
    const root = tempRoot();
    appendEvidence(root, draft({ result: "v1 read" }));
    appendEvidenceV2(root, v2Draft("passed"));
    const entries = readEvidence(root);
    expect(entries).toHaveLength(2);
    expect(entries[0]).toMatchObject({ kind: "record", line: 1 });
    expect(entries[1]).toMatchObject({ kind: "record", line: 2 });
    const first = entries[0];
    const second = entries[1];
    if (first?.kind !== "record" || second?.kind !== "record") throw new Error("unreachable");
    expect(first.record.schemaVersion).toBe(1);
    expect(second.record.schemaVersion).toBe(2);
  });

  it("appending a v2 draft refuses invalid execution context", () => {
    const root = tempRoot();
    expect(() =>
      appendEvidenceV2(root, {
        ...v2Draft("passed"),
        executionContext: { ...v2Draft("passed").executionContext, terminalCause: "" },
      }),
    ).toThrow(/invalid EvidenceRecord v2 draft/);
  });

  it("surfaces malformed v2 and unknown schema versions as corrupt", () => {
    const root = tempRoot();
    appendEvidence(root, draft({ result: "v1 stays readable" }));
    appendFileSync(
      defaultEvidencePath(root),
      `${JSON.stringify({
        schemaVersion: 2,
        actor: "worker:m2",
        recordedAt: "2026-09-22T00:00:00.000Z",
        taskId: "TASK-T3",
        capability: "repo.verify",
        policyDecision: "ALLOW",
        target: "node-typescript/npm-scripts-v1:test",
        result: "passed",
        provenance: `verification-execution-v2;binding=${"a".repeat(64)};shell=false`,
      })}
`,
      "utf8",
    );
    appendFileSync(
      defaultEvidencePath(root),
      `${JSON.stringify({ schemaVersion: 3, taskId: "TASK-T3" })}
`,
      "utf8",
    );
    const entries = readEvidence(root);
    expect(entries[0]?.kind).toBe("record");
    expect(entries[1]).toMatchObject({ kind: "corrupt", line: 2 });
    expect(entries[2]).toMatchObject({ kind: "corrupt", line: 3 });
  });

  it("does not create a verification verdict when persisting", () => {
    const root = tempRoot();
    const record = appendEvidence(root, draft());
    const keys = Object.keys(record);
    for (const forbidden of ["verdict", "PASS", "FAIL", "UNKNOWN", "BLOCKED"]) {
      expect(keys).not.toContain(forbidden);
    }
    expect(JSON.stringify(record)).not.toMatch(/"(PASS|FAIL|UNKNOWN|BLOCKED)"/);
  });
});
