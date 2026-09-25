import { describe, expect, it } from "vitest";
import type { EvidenceReadEntry } from "../src/evidenceStore.js";
import { validateM4OrderedEvidence } from "../src/m4OrderedEvidence.js";
import {
  M2_ADAPTER_ID,
  M4_REPLACEMENT_OPERATION,
  M4_TASK_CONTRACT_RELATIVE_PATH,
  M4_TASK_CONTRACT_SCHEMA_VERSION,
} from "../src/taskContract.js";
import type { M4ValidatedExecutionPlan } from "../src/taskContract.js";

const TASK = "ordered-m4-task";
const CONTRACT_SHA = "c".repeat(64);
const BEFORE_SHA = "b".repeat(64);
const AFTER_SHA = "a".repeat(64);

function plan(paths = ["src/b.ts", "src/a.ts"]): M4ValidatedExecutionPlan {
  return Object.freeze({
    schemaVersion: M4_TASK_CONTRACT_SCHEMA_VERSION,
    taskId: TASK,
    adapter: M2_ADAPTER_ID,
    operation: M4_REPLACEMENT_OPERATION,
    targets: Object.freeze(paths.map((path) => Object.freeze({
      path,
      expectedBeforeSha256: BEFORE_SHA,
      replacementContent: `replacement ${path}\n`,
    }))),
    requiredVerification: Object.freeze(["typecheck"] as const),
    contractSha256: CONTRACT_SHA,
    source: Object.freeze({ path: M4_TASK_CONTRACT_RELATIVE_PATH, sha256: CONTRACT_SHA }),
  });
}

function evidence(
  capability: string,
  target: string,
  result: string,
  line: number,
): EvidenceReadEntry {
  return {
    kind: "record",
    line,
    record: {
      schemaVersion: 1,
      actor: "worker:m4",
      recordedAt: "2026-09-24T00:00:00.000Z",
      taskId: TASK,
      capability,
      policyDecision: "ALLOW",
      target,
      result,
      provenance: "m4-test-evidence",
    },
  };
}

function binding(line = 1): EvidenceReadEntry {
  return evidence("repo.read", "task-contract-prewrite-binding", `sha256:${CONTRACT_SHA}`, line);
}

function write(path: string, line: number): EvidenceReadEntry {
  return evidence("repo.write", path, `sha256:${BEFORE_SHA}->${AFTER_SHA}`, line);
}

function refusal(path: string, line: number): EvidenceReadEntry {
  return evidence("repo.write", path, "refused:stale-preimage", line);
}

function terminal(line: number): EvidenceReadEntry {
  return evidence(
    "repo.read",
    ".sureflow/task.json",
    `sha256:${CONTRACT_SHA};provenance=control-plane-task-input`,
    line,
  );
}

function fullSuccess(): EvidenceReadEntry[] {
  return [binding(), write("src/a.ts", 2), write("src/b.ts", 3), terminal(4)];
}

describe("M4 ordered evidence shape", () => {
  it("accepts complete writes in canonical bytewise order independent of declaration order", () => {
    expect(validateM4OrderedEvidence(plan(), fullSuccess())).toMatchObject({ kind: "complete" });
  });

  it("accepts an empty successful prefix followed by first-target refusal", () => {
    expect(validateM4OrderedEvidence(plan(), [binding(), refusal("src/a.ts", 2), terminal(3)]))
      .toMatchObject({ kind: "partial", completed: [], refusal: { path: "src/a.ts" } });
  });

  it("accepts a canonical success prefix followed by one refusal", () => {
    expect(validateM4OrderedEvidence(
      plan(),
      [binding(), write("src/a.ts", 2), refusal("src/b.ts", 3), terminal(4)],
    )).toMatchObject({ kind: "partial", completed: [{ path: "src/a.ts" }], refusal: { path: "src/b.ts" } });
  });

  it("rejects out-of-order successful write evidence", () => {
    expect(validateM4OrderedEvidence(
      plan(),
      [binding(), write("src/b.ts", 2), write("src/a.ts", 3), terminal(4)],
    )).toMatchObject({ kind: "invalid" });
  });

  it("rejects a write observation after the first refusal", () => {
    expect(validateM4OrderedEvidence(
      plan(),
      [binding(), refusal("src/a.ts", 2), write("src/b.ts", 3), terminal(4)],
    )).toMatchObject({ kind: "invalid" });
  });

  it("rejects duplicate and unauthorized target evidence", () => {
    expect(validateM4OrderedEvidence(
      plan(),
      [binding(), write("src/a.ts", 2), write("src/a.ts", 3), terminal(4)],
    )).toMatchObject({ kind: "invalid" });
    expect(validateM4OrderedEvidence(
      plan(),
      [binding(), write("src/a.ts", 2), write("src/extra.ts", 3), terminal(4)],
    )).toMatchObject({ kind: "invalid" });
  });

  it("rejects malformed refusal codes and missing write proof", () => {
    expect(validateM4OrderedEvidence(
      plan(),
      [binding(), evidence("repo.write", "src/a.ts", "refused:maybe", 2), terminal(3)],
    )).toMatchObject({ kind: "invalid" });
    expect(validateM4OrderedEvidence(plan(), [binding(), terminal(2)])).toMatchObject({ kind: "invalid" });
  });

  it("rejects terminal contract evidence before the ordered target writes", () => {
    expect(validateM4OrderedEvidence(
      plan(),
      [binding(), terminal(2), write("src/a.ts", 3), write("src/b.ts", 4)],
    )).toMatchObject({ kind: "invalid" });
  });

  it("rejects missing pre-write binding and corrupt evidence", () => {
    expect(validateM4OrderedEvidence(
      plan(),
      [write("src/a.ts", 1), write("src/b.ts", 2), terminal(3)],
    )).toMatchObject({ kind: "invalid" });
    expect(validateM4OrderedEvidence(
      plan(),
      [binding(), write("src/a.ts", 2), { kind: "corrupt", line: 3, raw: "{", error: "invalid" }, terminal(4)],
    )).toMatchObject({ kind: "invalid" });
  });
});
