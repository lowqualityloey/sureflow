import { describe, expect, it } from "vitest";
import type { EvidenceReadEntry } from "../src/evidenceStore.js";
import { verifyM4ProjectChange } from "../src/m4ProjectChangeVerifier.js";
import { digestM4ResolvedPlan } from "../src/m4OrderedEvidence.js";
import type { M4ScopeComplianceResult } from "../src/projectScope.js";
import {
  M2_ADAPTER_ID,
  M3_PNPM_ADAPTER_ID,
  M4_REPLACEMENT_OPERATION,
  M4_TASK_CONTRACT_RELATIVE_PATH,
  M4_TASK_CONTRACT_SCHEMA_VERSION,
  type M4ValidatedExecutionPlan,
} from "../src/taskContract.js";
import { m4CompleteCertificate, m4PartialCertificate } from "./helpers/projectScope.js";

const CONTRACT = "c".repeat(64);

function plan(
  paths = ["src/b.ts", "src/a.ts"],
  checks: M4ValidatedExecutionPlan["requiredVerification"] = ["typecheck", "test"],
  adapter: typeof M2_ADAPTER_ID | typeof M3_PNPM_ADAPTER_ID = M2_ADAPTER_ID,
): M4ValidatedExecutionPlan {
  return Object.freeze({
    schemaVersion: M4_TASK_CONTRACT_SCHEMA_VERSION,
    taskId: "task-m4-certificate-test",
    adapter,
    operation: M4_REPLACEMENT_OPERATION,
    targets: Object.freeze(paths.map((path) => Object.freeze({
      path,
      expectedBeforeSha256: "b".repeat(64),
      replacementContent: `replacement ${path}\n`,
    }))),
    requiredVerification: Object.freeze([...checks]),
    contractSha256: CONTRACT,
    source: Object.freeze({ path: M4_TASK_CONTRACT_RELATIVE_PATH, sha256: CONTRACT }),
  });
}

describe("M4 aggregate project-change certificate", () => {
  it("passes two-target evidence with observed postimages and exact scope", () => {
    const taskPlan = plan();
    const input = m4CompleteCertificate(taskPlan);
    expect(verifyM4ProjectChange(taskPlan, input.entries, input.scope, input.proofs).verdict).toBe("PASS");
  });

  it("passes maximum targets and alternate check order for pnpm", () => {
    const taskPlan = plan(
      ["src/e.ts", "src/d.ts", "src/c.ts", "src/b.ts", "src/a.ts"],
      ["build", "typecheck"],
      M3_PNPM_ADAPTER_ID,
    );
    const input = m4CompleteCertificate(taskPlan);
    expect(verifyM4ProjectChange(taskPlan, input.entries, input.scope, input.proofs).verdict).toBe("PASS");
  });

  it("fails exact-set extra and missing path observations", () => {
    const taskPlan = plan();
    const input = m4CompleteCertificate(taskPlan);
    const scopes: M4ScopeComplianceResult[] = [
      { kind: "violation", compliant: false, changedPaths: ["extra.ts", "src/a.ts", "src/b.ts"], unauthorizedPaths: ["extra.ts"], missingPaths: [], reason: "extra" },
      { kind: "violation", compliant: false, changedPaths: ["src/a.ts"], unauthorizedPaths: [], missingPaths: ["src/b.ts"], reason: "missing" },
    ];
    for (const scope of scopes) {
      const reason = scope.kind === "violation" ? scope.reason : "scope mismatch";
      const entries = input.entries.map((entry) => entry.kind === "record" && entry.record.target === "project-scope"
        ? { ...entry, record: { ...entry.record, result: `violation:${reason}` } }
        : entry);
      expect(verifyM4ProjectChange(taskPlan, entries, scope, input.proofs).verdict).toBe("FAIL");
    }
  });

  it("returns UNKNOWN for unavailable scope or missing readback proof", () => {
    const taskPlan = plan();
    const input = m4CompleteCertificate(taskPlan);
    const unavailable: M4ScopeComplianceResult = {
      kind: "unavailable", compliant: false, changedPaths: [], unauthorizedPaths: [], missingPaths: [], reason: "git unavailable",
    };
    expect(verifyM4ProjectChange(taskPlan, input.entries, unavailable, input.proofs).verdict).toBe("UNKNOWN");
    expect(verifyM4ProjectChange(taskPlan, input.entries, input.scope, input.proofs.slice(1)).verdict).toBe("UNKNOWN");
  });

  it("rejects planned-replacement proof as unknown and fails a valid mismatching observation", () => {
    const taskPlan = plan();
    const input = m4CompleteCertificate(taskPlan);
    const planned = input.proofs.map((proof) => ({ ...proof, kind: "planned-replacement" as const }));
    const contradictory = input.proofs.map((proof, index) => index === 0 ? { ...proof, sha256: "d".repeat(64) } : proof);
    expect(verifyM4ProjectChange(taskPlan, input.entries, input.scope, planned).verdict).toBe("UNKNOWN");
    expect(verifyM4ProjectChange(taskPlan, input.entries, input.scope, contradictory).verdict).toBe("FAIL");
  });

  it("fails wrong before or planned-after digests", () => {
    const taskPlan = plan();
    const input = m4CompleteCertificate(taskPlan);
    const wrongBefore = input.entries.map((entry) => {
      if (entry.kind !== "record" || entry.record.capability !== "repo.write") return entry;
      const proof = input.proofs.find((candidate) => candidate.path === entry.record.target);
      return proof === undefined ? entry : {
        ...entry,
        record: { ...entry.record, result: `sha256:${"d".repeat(64)}->${proof.sha256}` },
      };
    });
    const firstPath = taskPlan.targets[0]?.path;
    if (firstPath === undefined) throw new Error("target absent from test plan");
    const wrongAfter = input.entries.map((entry) => entry.kind === "record" && entry.record.capability === "repo.write" && entry.record.target === firstPath
      ? { ...entry, record: { ...entry.record, result: `sha256:${"b".repeat(64)}->${"d".repeat(64)}` } }
      : entry);
    const wrongAfterProofs = input.proofs.map((proof) => proof.path === firstPath ? { ...proof, sha256: "d".repeat(64) } : proof);
    expect(verifyM4ProjectChange(taskPlan, wrongBefore, input.scope, input.proofs).verdict).toBe("FAIL");
    expect(verifyM4ProjectChange(taskPlan, wrongAfter, input.scope, wrongAfterProofs).verdict).toBe("FAIL");
  });

  it("fails valid prefix/refusal certificates but not their diagnostic scope", () => {
    const taskPlan = plan();
    for (const completed of [0, 1]) {
      const input = m4PartialCertificate(taskPlan, completed);
      expect(verifyM4ProjectChange(taskPlan, input.entries, input.scope, input.proofs).verdict).toBe("FAIL");
    }
  });

  it("returns UNKNOWN for evidence after refusal", () => {
    const taskPlan = plan();
    const input = m4PartialCertificate(taskPlan, 0);
    const terminal = input.entries.at(-1);
    if (terminal === undefined) throw new Error("test terminal record missing");
    const priorWrite = input.entries[1];
    if (priorWrite === undefined) throw new Error("test refusal evidence missing");
    const afterRefusal = [
      ...input.entries.slice(0, -1),
      { ...priorWrite, line: terminal.line },
      { ...terminal, line: terminal.line + 1 },
    ];
    expect(verifyM4ProjectChange(taskPlan, afterRefusal, input.scope, input.proofs).verdict).toBe("UNKNOWN");
  });

  it("fails terminal contract drift and wrong plan binding", () => {
    const taskPlan = plan();
    const input = m4CompleteCertificate(taskPlan);
    const drifted = input.entries.map((entry) => entry.kind === "record" && entry.record.target === ".sureflow/task.json"
      ? { ...entry, record: { ...entry.record, result: `integrity-mismatch:${"d".repeat(64)}` } }
      : entry);
    const planDigest = digestM4ResolvedPlan(taskPlan);
    const wrongBinding = input.entries.map((entry) => entry.kind === "record" && entry.record.target === "verification-input-binding"
      ? { ...entry, record: { ...entry.record, result: entry.record.result.replace(planDigest ?? "", "e".repeat(64)) } }
      : entry);
    expect(verifyM4ProjectChange(taskPlan, drifted, input.scope, input.proofs).verdict).toBe("FAIL");
    expect(verifyM4ProjectChange(taskPlan, wrongBinding, input.scope, input.proofs).verdict).toBe("FAIL");
  });

  it("fails verification errors and returns UNKNOWN for missing verification", () => {
    const taskPlan = plan();
    const input = m4CompleteCertificate(taskPlan);
    const failed = input.entries.map((entry) => entry.kind === "record" && entry.record.schemaVersion === 2
      ? { ...entry, record: { ...entry.record, result: "failed:1", executionContext: { ...entry.record.executionContext, terminalCause: "failed:1" } } }
      : entry);
    const missing = input.entries.filter((entry) => !(entry.kind === "record" && entry.record.target === `${taskPlan.adapter}:test`));
    expect(verifyM4ProjectChange(taskPlan, failed, input.scope, input.proofs).verdict).toBe("FAIL");
    expect(verifyM4ProjectChange(taskPlan, missing, input.scope, input.proofs).verdict).toBe("UNKNOWN");
  });

  it("returns UNKNOWN for duplicate writes and corrupt evidence", () => {
    const taskPlan = plan();
    const input = m4CompleteCertificate(taskPlan);
    const firstWrite = input.entries.find((entry): entry is Extract<EvidenceReadEntry, { kind: "record" }> =>
      entry.kind === "record" && entry.record.capability === "repo.write",
    );
    if (firstWrite === undefined) throw new Error("write record absent from test evidence");
    const duplicate = [...input.entries, { ...firstWrite, line: input.entries.length + 1 }];
    const corrupt: EvidenceReadEntry = { kind: "corrupt", line: input.entries.length + 1, raw: "{", error: "invalid" };
    expect(verifyM4ProjectChange(taskPlan, duplicate, input.scope, input.proofs).verdict).toBe("UNKNOWN");
    expect(verifyM4ProjectChange(taskPlan, [...input.entries, corrupt], input.scope, input.proofs).verdict).toBe("UNKNOWN");
  });
});
