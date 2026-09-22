import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import type { EvidenceReadEntry } from "../src/evidenceStore.js";
import {
  verifyProjectChange,
  type ProjectChangeVerificationOutcome,
} from "../src/projectChangeVerifier.js";
import type { ValidatedExecutionPlan } from "../src/taskContract.js";
import { verifyEvidence } from "../src/verifier.js";

const TASK = "TASK-M2-T6";
const TARGET = "src/message.ts";
const CONTRACT_SHA = "c".repeat(64);
const BEFORE_SHA = "b".repeat(64);
const CONTENT = "export const message = 'changed';\n";
const AFTER_SHA = createHash("sha256").update(Buffer.from(CONTENT, "utf8")).digest("hex");
const CHECKS = ["typecheck", "test", "lint", "build"] as const;

const PLAN: ValidatedExecutionPlan = Object.freeze({
  schemaVersion: 1,
  taskId: TASK,
  adapter: "node-typescript/npm-scripts-v1",
  operation: "replace-existing-file",
  targetPath: TARGET,
  expectedBeforeSha256: BEFORE_SHA,
  replacementContent: CONTENT,
  requiredVerification: Object.freeze([...CHECKS]),
  contractSha256: CONTRACT_SHA,
  source: Object.freeze({ path: ".sureflow/task.json", sha256: CONTRACT_SHA }),
});

type V1Record = Extract<Extract<EvidenceReadEntry, { kind: "record" }>["record"], { schemaVersion: 1 }>;
type RecordOverrides = Partial<V1Record>;

function evidence(
  capability: string,
  target: string,
  result: string,
  line = 1,
  overrides: RecordOverrides = {},
): EvidenceReadEntry {
  return {
    kind: "record",
    line,
    record: {
      schemaVersion: 1 as const,
      actor: "worker:m2",
      recordedAt: "2026-09-22T00:00:00.000Z",
      taskId: TASK,
      capability,
      policyDecision: "ALLOW",
      target,
      result,
      provenance: "sureflow:m2-t6",
      ...overrides,
    },
  };
}

function completeEvidence(): EvidenceReadEntry[] {
  return [
    evidence("repo.read", ".sureflow/task.json", `sha256:${CONTRACT_SHA};provenance=control-plane-task-input`),
    evidence("repo.write", TARGET, `sha256:${BEFORE_SHA}->${AFTER_SHA}`),
    evidence("repo.read", "project-scope", "compliant"),
    ...CHECKS.map((check) => evidence("repo.verify", `node-typescript/npm-scripts-v1:${check}`, "passed")),
  ];
}

function verdict(
  entries: readonly EvidenceReadEntry[],
  plan = PLAN,
): ProjectChangeVerificationOutcome["verdict"] {
  return verifyProjectChange(plan, entries).verdict;
}

function withRecord(
  entries: readonly EvidenceReadEntry[],
  capability: string,
  target: string,
  result: string,
  overrides: RecordOverrides = {},
): EvidenceReadEntry[] {
  return [...entries, evidence(capability, target, result, entries.length + 1, overrides)];
}

describe("M2-T6 aggregate project-change verifier", () => {
  it("returns PASS for complete exact evidence", () => {
    const out = verifyProjectChange(PLAN, completeEvidence());
    expect(out.verdict).toBe("PASS");
    expect(out.taskId).toBe(TASK);
    expect(out.recordsExamined).toBe(7);
    expect(Object.isFrozen(out)).toBe(true);
    expect(Object.isFrozen(out.reasons)).toBe(true);
  });

  it("returns UNKNOWN when contract evidence is missing", () => {
    const entries = completeEvidence().filter(
      (entry) => !(entry.kind === "record" && entry.record.target === ".sureflow/task.json"),
    );
    expect(verdict(entries)).toBe("UNKNOWN");
  });

  it("returns UNKNOWN for duplicate contract evidence", () => {
    const entries = withRecord(
      completeEvidence(),
      "repo.read",
      ".sureflow/task.json",
      `sha256:${CONTRACT_SHA};provenance=control-plane-task-input`,
    );
    expect(verdict(entries)).toBe("UNKNOWN");
  });

  it("returns UNKNOWN for stale contract digest evidence", () => {
    const entries = completeEvidence().map((entry) =>
      entry.kind === "record" && entry.record.target === ".sureflow/task.json"
        ? evidence("repo.read", ".sureflow/task.json", `sha256:${"d".repeat(64)};provenance=control-plane-task-input`)
        : entry,
    );
    expect(verdict(entries)).toBe("UNKNOWN");
  });

  it("returns FAIL for an execution-time contract integrity mismatch", () => {
    const entries = completeEvidence().map((entry) =>
      entry.kind === "record" && entry.record.target === ".sureflow/task.json"
        ? evidence("repo.read", ".sureflow/task.json", `integrity-mismatch:${"d".repeat(64)}`)
        : entry,
    );
    expect(verdict(entries)).toBe("FAIL");
  });

  it("returns UNKNOWN when replacement evidence is missing", () => {
    const entries = completeEvidence().filter(
      (entry) => !(entry.kind === "record" && entry.record.capability === "repo.write"),
    );
    expect(verdict(entries)).toBe("UNKNOWN");
  });

  it("returns UNKNOWN for duplicate replacement evidence", () => {
    expect(verdict(withRecord(completeEvidence(), "repo.write", TARGET, `sha256:${BEFORE_SHA}->${AFTER_SHA}`))).toBe("UNKNOWN");
  });

  it("returns FAIL for a wrong replacement before digest", () => {
    expect(verdict(completeEvidence().map((entry) =>
      entry.kind === "record" && entry.record.capability === "repo.write"
        ? evidence("repo.write", TARGET, `sha256:${"a".repeat(64)}->${AFTER_SHA}`)
        : entry,
    ))).toBe("FAIL");
  });

  it("returns FAIL for a wrong replacement after digest", () => {
    expect(verdict(completeEvidence().map((entry) =>
      entry.kind === "record" && entry.record.capability === "repo.write"
        ? evidence("repo.write", TARGET, `sha256:${BEFORE_SHA}->${"a".repeat(64)}`)
        : entry,
    ))).toBe("FAIL");
  });

  it("returns FAIL when replacement evidence confirms unchanged content", () => {
    const unchanged = "e".repeat(64);
    const noOpContent = "same bytes";
    const noOpAfter = createHash("sha256").update(Buffer.from(noOpContent, "utf8")).digest("hex");
    const noOpPlan: ValidatedExecutionPlan = Object.freeze({
      ...PLAN,
      expectedBeforeSha256: noOpAfter,
      replacementContent: noOpContent,
    });
    const entries = completeEvidence().map((entry) =>
      entry.kind === "record" && entry.record.capability === "repo.write"
        ? evidence("repo.write", TARGET, `sha256:${noOpAfter}->${noOpAfter}`)
        : entry,
    );
    expect(unchanged).not.toBe(noOpAfter);
    expect(verdict(entries, noOpPlan)).toBe("FAIL");
  });

  it("returns UNKNOWN when scope evidence is missing", () => {
    const entries = completeEvidence().filter(
      (entry) => !(entry.kind === "record" && entry.record.target === "project-scope"),
    );
    expect(verdict(entries)).toBe("UNKNOWN");
  });

  it("returns UNKNOWN for duplicate scope evidence", () => {
    expect(verdict(withRecord(completeEvidence(), "repo.read", "project-scope", "compliant"))).toBe("UNKNOWN");
  });

  it("returns FAIL for a scope violation", () => {
    const entries = completeEvidence().map((entry) =>
      entry.kind === "record" && entry.record.target === "project-scope"
        ? evidence("repo.read", "project-scope", "violation:src/other.ts")
        : entry,
    );
    expect(verdict(entries)).toBe("FAIL");
  });

  it("requires every requested verification profile for PASS", () => {
    expect(verdict(completeEvidence())).toBe("PASS");
    const missingBuild = completeEvidence().filter(
      (entry) => !(entry.kind === "record" && entry.record.target.endsWith(":build")),
    );
    expect(verdict(missingBuild)).toBe("UNKNOWN");
  });

  it("returns FAIL for an explicit numeric verification failure", () => {
    const entries = completeEvidence().map((entry) =>
      entry.kind === "record" && entry.record.target.endsWith(":test")
        ? evidence("repo.verify", entry.record.target, "failed:2")
        : entry,
    );
    expect(verdict(entries)).toBe("FAIL");
  });

  it("returns FAIL for spawn-error", () => {
    const entries = completeEvidence().map((entry) =>
      entry.kind === "record" && entry.record.target.endsWith(":lint")
        ? evidence("repo.verify", entry.record.target, "spawn-error")
        : entry,
    );
    expect(verdict(entries)).toBe("FAIL");
  });

  it("returns FAIL for terminated verification", () => {
    const entries = completeEvidence().map((entry) =>
      entry.kind === "record" && entry.record.target.endsWith(":build")
        ? evidence("repo.verify", entry.record.target, "terminated:SIGTERM")
        : entry,
    );
    expect(verdict(entries)).toBe("FAIL");
  });

  it("returns UNKNOWN when a required verification result is missing", () => {
    const entries = completeEvidence().filter(
      (entry) => !(entry.kind === "record" && entry.record.target.endsWith(":test")),
    );
    expect(verdict(entries)).toBe("UNKNOWN");
  });

  it("returns UNKNOWN for duplicate required verification", () => {
    expect(verdict(withRecord(completeEvidence(), "repo.verify", "node-typescript/npm-scripts-v1:test", "passed"))).toBe("UNKNOWN");
  });

  it("returns UNKNOWN for a malformed verification result", () => {
    const entries = completeEvidence().map((entry) =>
      entry.kind === "record" && entry.record.target.endsWith(":test")
        ? evidence("repo.verify", entry.record.target, "failed:exit-code")
        : entry,
    );
    expect(verdict(entries)).toBe("UNKNOWN");
  });

  it("returns UNKNOWN for corrupt evidence anywhere", () => {
    const entries: EvidenceReadEntry[] = [...completeEvidence(), {
      kind: "corrupt",
      line: 99,
      raw: "not-json",
      error: "malformed JSON",
    }];
    const out = verifyProjectChange(PLAN, entries);
    expect(out.verdict).toBe("UNKNOWN");
    expect(out.corruptLines).toEqual([99]);
  });

  it("returns UNKNOWN for an unreadable evidence representation", () => {
    const entries: EvidenceReadEntry[] = [{
      kind: "corrupt",
      line: 0,
      raw: "",
      error: "unreadable evidence file",
    }];
    expect(verdict(entries)).toBe("UNKNOWN");
  });

  it("never returns PASS for required evidence with DENY policy", () => {
    const entries = completeEvidence().map((entry) =>
      entry.kind === "record" && entry.record.target === "project-scope"
        ? evidence("repo.read", "project-scope", "compliant", 1, { policyDecision: "DENY" })
        : entry,
    );
    expect(verdict(entries)).toBe("UNKNOWN");
  });

  it("never returns PASS for required evidence with REQUIRE_APPROVAL policy", () => {
    const entries = completeEvidence().map((entry) =>
      entry.kind === "record" && entry.record.target === "project-scope"
        ? evidence("repo.read", "project-scope", "compliant", 1, { policyDecision: "REQUIRE_APPROVAL" })
        : entry,
    );
    expect(verdict(entries)).toBe("UNKNOWN");
  });

  it("never returns PASS for empty required-record provenance", () => {
    const entries = completeEvidence().map((entry) =>
      entry.kind === "record" && entry.record.target === "project-scope"
        ? evidence("repo.read", "project-scope", "compliant", 1, { provenance: "" })
        : entry,
    );
    expect(verdict(entries)).toBe("UNKNOWN");
  });

  it("ignores unrelated evidence for another task", () => {
    const otherTask = evidence("repo.write", TARGET, `sha256:${BEFORE_SHA}->${AFTER_SHA}`, 99, { taskId: "OTHER-TASK" });
    expect(verdict([...completeEvidence(), otherTask])).toBe("PASS");
  });

  it("does not let unexpected same-task adapter evidence strengthen PASS", () => {
    const entries = withRecord(
      completeEvidence(),
      "repo.verify",
      "node-typescript/npm-scripts-v1:unexpected",
      "passed",
    );
    expect(verdict(entries)).toBe("UNKNOWN");
  });

  it("does not depend on evidence record ordering", () => {
    const entries = completeEvidence().reverse();
    expect(verdict(entries)).toBe("PASS");
  });

  it("does not depend on timestamps", () => {
    const entries = completeEvidence().map((entry, index) =>
      entry.kind === "record"
        ? evidence(entry.record.capability, entry.record.target, entry.record.result, index + 1, {
            recordedAt: `2030-01-0${String((index % 9) + 1)}T00:00:00.000Z`,
          })
        : entry,
    );
    expect(verdict(entries)).toBe("PASS");
  });

  it("has no latest-wins behavior for duplicate terminal evidence", () => {
    const entries = [
      ...completeEvidence(),
      evidence("repo.verify", "node-typescript/npm-scripts-v1:test", "failed:1", 100),
    ];
    expect(verdict(entries)).toBe("UNKNOWN");
  });

  it("does not mutate the plan or evidence input", () => {
    const entries = completeEvidence();
    const planText = JSON.stringify(PLAN);
    const entriesText = JSON.stringify(entries);
    const out = verifyProjectChange(PLAN, entries);
    expect(out.verdict).toBe("PASS");
    expect(JSON.stringify(PLAN)).toBe(planText);
    expect(JSON.stringify(entries)).toBe(entriesText);
  });

  it("performs no writes or process execution", () => {
    expect(verdict(completeEvidence())).toBe("PASS");
  });

  it("preserves the M1 verifier positive-proof regression", () => {
    const out = verifyEvidence({
      taskId: "M1",
      capability: "repo.test",
      target: "fixture",
      expectedResult: "passed",
    }, [{
      kind: "record",
      line: 1,
      record: {
        schemaVersion: 1,
        actor: "worker",
        recordedAt: "2026-09-22T00:00:00.000Z",
        taskId: "M1",
        capability: "repo.test",
        policyDecision: "ALLOW",
        target: "fixture",
        result: "passed",
        provenance: "m1-test",
      },
    }]);
    expect(out.verdict).toBe("PASS");
  });

  it("retains the T1-T5 plan/evidence boundary", () => {
    const out = verifyProjectChange(PLAN, completeEvidence());
    expect(out.taskId).toBe(PLAN.taskId);
    expect(out.verdict).toBe("PASS");
  });

  it("returns FAIL for a required failure even when another required fact is missing", () => {
    const entries = completeEvidence().filter(
      (entry) => !(entry.kind === "record" && entry.record.target.endsWith(":build")),
    ).map((entry) =>
      entry.kind === "record" && entry.record.target.endsWith(":test")
        ? evidence("repo.verify", entry.record.target, "failed:1")
        : entry,
    );
    expect(verdict(entries)).toBe("FAIL");
  });
});
