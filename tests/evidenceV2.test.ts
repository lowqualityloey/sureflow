/**
 * M3-T1 EvidenceRecord v2 contract/codec tests.
 *
 * Covers authorization items F–I:
 * F. EvidenceRecord v1 remains valid/readable
 * G. EvidenceRecord v2 contract is deterministic and strictly validated
 * H. unknown/malformed evidence versions fail closed
 * I. v2 codec/digest is stable for equal values and distinct for
 *    semantically different argv/adapter/context values
 */
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import { isEvidenceRecord } from "../src/evidence.js";
import {
  decodeTerminalCause,
  digestArgv,
  digestExecutionContextV2,
  encodeArgvForDigest,
  encodeExecutionContextV2,
  encodeInputBindingV1,
  encodeTerminalCause,
  EVIDENCE_V2_SCHEMA_VERSION,
  isEvidenceRecordV2,
  M3_OVERALL_BUDGET_SECONDS,
  M3_STEP_LIMIT_SECONDS,
  M3_TERMINATION_GRACE_SECONDS,
  parseExecutionContext,
  parseInputBindingV1,
  parseStoredEvidenceRecord,
  type EvidenceRecordV2,
  type EvidenceV2ExecutionContext,
  type M3TerminalCause,
} from "../src/evidenceV2.js";

function contextFor(overrides: Partial<EvidenceV2ExecutionContext> = {}): EvidenceV2ExecutionContext {
  const argv = overrides.argv ?? ["test"];
  return Object.freeze({
    adapterId: "node-typescript/npm-scripts-v1" as const,
    adapterContractVersion: 1 as const,
    executable: "npm" as const,
    argv: Object.freeze([...argv]),
    argvDigest: overrides.argvDigest ?? digestArgv(argv),
    cwdRole: "project-root" as const,
    stepLimitSeconds: M3_STEP_LIMIT_SECONDS,
    overallBudgetSeconds: M3_OVERALL_BUDGET_SECONDS,
    terminationGraceSeconds: M3_TERMINATION_GRACE_SECONDS,
    terminalCause: "passed",
    ...overrides,
  });
}

function recordFor(context: EvidenceV2ExecutionContext): EvidenceRecordV2 {
  return Object.freeze({
    schemaVersion: EVIDENCE_V2_SCHEMA_VERSION,
    actor: "worker:m2",
    recordedAt: "2026-09-22T00:00:00.000Z",
    taskId: "TASK-M3-T1",
    capability: "repo.verify",
    policyDecision: "ALLOW" as const,
    target: "node-typescript/npm-scripts-v1:test",
    result: "passed",
    provenance: "npm test; shell=false",
    executionContext: context,
  });
}

function v1Record(): Record<string, unknown> {
  return {
    schemaVersion: 1,
    actor: "worker:m2",
    recordedAt: "2026-09-22T00:00:00.000Z",
    taskId: "TASK-M2",
    capability: "repo.verify",
    policyDecision: "ALLOW",
    target: "node-typescript/npm-scripts-v1:test",
    result: "passed",
    provenance: "npm test; shell=false",
  };
}

describe("M3-T1 EvidenceRecord v2", () => {
  it("F: a v1 record remains valid and parses as version 1", () => {
    const record = v1Record();

    expect(isEvidenceRecord(record)).toBe(true);
    const parsed = parseStoredEvidenceRecord(record);
    expect(parsed.kind).toBe("v1");
  });

  it("F: a v2 record is never silently accepted as v1", () => {
    expect(isEvidenceRecord(recordFor(contextFor()))).toBe(false);
  });

  it("G: a well-formed v2 record validates and parses as version 2", () => {
    const record = recordFor(contextFor({ terminalCause: "failed:3" }));

    expect(isEvidenceRecordV2(record)).toBe(true);
    const parsed = parseStoredEvidenceRecord(record);
    expect(parsed.kind).toBe("v2");
  });

  it("G: v2 rejects unknown fields, tampered digests, wrong limits, and bad causes", () => {
    const valid = recordFor(contextFor());
    expect(isEvidenceRecordV2({ ...valid, extra: true })).toBe(false);
    expect(
      isEvidenceRecordV2(recordFor(contextFor({ argvDigest: "0".repeat(64) }))),
    ).toBe(false);
    expect(
      isEvidenceRecordV2(
        recordFor(
          contextFor({ stepLimitSeconds: 999 } as unknown as Partial<EvidenceV2ExecutionContext>),
        ),
      ),
    ).toBe(false);
    expect(isEvidenceRecordV2(recordFor(contextFor({ terminalCause: "maybe" })))).toBe(false);
    expect(
      isEvidenceRecordV2({ ...valid, executionContext: { ...valid.executionContext, unexpected: 1 } }),
    ).toBe(false);
    expect(parseExecutionContext(null)).toBe(null);
  });

  it("accepts only the exact canonical input-binding encoding", () => {
    const fingerprints = {
      manifestPath: "package.json" as const,
      manifestSha256: "a".repeat(64),
      lockfilePath: "package-lock.json" as const,
      lockfileSha256: "b".repeat(64),
      tsconfigPath: "tsconfig.json" as const,
      tsconfigSha256: "c".repeat(64),
      planDigest: "d".repeat(64),
    };
    const canonical = encodeInputBindingV1(fingerprints);
    expect(parseInputBindingV1(canonical)).toEqual(fingerprints);
    const lines = canonical.split("\n");
    const reordered = [lines[1], lines[0], ...lines.slice(2)].join("\n");
    const duplicate = [...lines];
    duplicate[1] = lines[0] ?? "";
    const missing = lines.slice(0, 7).join("\n");
    const extra = `${canonical}\nextra=value`;
    const whitespace = `${canonical} `;
    const alternatePath = canonical.replace("manifest=package.json", "manifest=./package.json");
    const trailingNewline = `${canonical}\n`;
    for (const invalid of [reordered, duplicate.join("\n"), missing, extra, whitespace, alternatePath, trailingNewline]) {
      expect(parseInputBindingV1(invalid)).toBe(null);
    }
  });

  it("H: unknown schema versions and malformed records fail closed", () => {
    for (const schemaVersion of [0, 3, 99, "2", "1", null, undefined]) {
      expect(parseStoredEvidenceRecord({ ...v1Record(), schemaVersion }).kind).toBe("unknown");
    }
    expect(parseStoredEvidenceRecord({ ...v1Record(), schemaVersion: 1, actor: 42 }).kind).toBe(
      "unknown",
    );
    expect(parseStoredEvidenceRecord(null).kind).toBe("unknown");
    expect(parseStoredEvidenceRecord("evidence").kind).toBe("unknown");
    expect(parseStoredEvidenceRecord(recordFor(contextFor({ terminalCause: "" }))).kind).toBe(
      "unknown",
    );
  });

  it("terminal causes round-trip through the canonical encoding", () => {
    const causes: readonly M3TerminalCause[] = [
      { kind: "passed" },
      { kind: "failed", exitCode: 1 },
      { kind: "failed", exitCode: 255 },
      { kind: "spawn-error" },
      { kind: "terminated", signal: "SIGKILL" },
      { kind: "interrupted", signal: "SIGINT" },
      { kind: "interrupted", signal: "SIGTERM" },
      { kind: "timed-out" },
    ];
    expect(causes.map(encodeTerminalCause)).toEqual([
      "passed",
      "failed:1",
      "failed:255",
      "spawn-error",
      "terminated:SIGKILL",
      "interrupted:SIGINT",
      "interrupted:SIGTERM",
      "timed-out",
    ]);
    for (const cause of causes) {
      expect(decodeTerminalCause(encodeTerminalCause(cause))).toEqual(cause);
    }
  });

  it("terminal cause decoding rejects ambiguous or malformed input", () => {
    for (const bad of [
      "",
      " passed",
      "failed:0",
      "failed:256",
      "failed:01",
      "failed:abc",
      "failed:",
      "terminated:",
      "terminated:sigkill",
      "terminated:has space",
      "interrupted:SIGHUP",
      "maybe",
      null,
      42,
    ]) {
      expect(decodeTerminalCause(bad)).toBe(null);
    }
  });

  it("terminated:SIGINT/SIGTERM record an independent child signal (not owned interruption)", () => {
    // Human T3 decision: ownership, not the signal name, distinguishes the
    // two. A child independently observed exiting with SIGINT/SIGTERM is
    // terminated:SIG*; Sureflow-owned cancellation is interrupted:SIG*.
    expect(decodeTerminalCause("terminated:SIGINT")).toEqual({ kind: "terminated", signal: "SIGINT" });
    expect(decodeTerminalCause("terminated:SIGTERM")).toEqual({ kind: "terminated", signal: "SIGTERM" });
    expect(decodeTerminalCause("interrupted:SIGINT")).toEqual({ kind: "interrupted", signal: "SIGINT" });
    expect(decodeTerminalCause("interrupted:SIGTERM")).toEqual({ kind: "interrupted", signal: "SIGTERM" });
  });

  it("I: identical contexts encode and digest identically", () => {
    const left = contextFor({ argv: ["run", "typecheck"], terminalCause: "passed" });
    const right = contextFor({ argv: ["run", "typecheck"], terminalCause: "passed" });

    expect(encodeExecutionContextV2(left)).toBe(encodeExecutionContextV2(right));
    expect(digestExecutionContextV2(left)).toBe(digestExecutionContextV2(right));
    expect(digestExecutionContextV2(left)).toBe(
      createHash("sha256").update(encodeExecutionContextV2(left), "utf8").digest("hex"),
    );
  });

  it("I: argv element boundaries cannot collide and ordering is significant", () => {
    expect(encodeArgvForDigest(["ab", "c"])).not.toBe(encodeArgvForDigest(["a", "bc"]));
    expect(encodeArgvForDigest(["a\nb"])).not.toBe(encodeArgvForDigest(["a", "b"]));
    expect(digestArgv(["run", "typecheck"])).not.toBe(digestArgv(["typecheck", "run"]));
    expect(digestArgv(["test"])).toMatch(/^[0-9a-f]{64}$/u);
  });

  it("I: the digest distinguishes every preserved execution fact", () => {
    const base = contextFor({ argv: ["test"] });
    const variants: Array<Partial<EvidenceV2ExecutionContext>> = [
      { argv: ["run", "test"], argvDigest: digestArgv(["run", "test"]) },
      { terminalCause: "failed:1" },
      { terminalCause: "timed-out" },
      { terminalCause: "interrupted:SIGTERM" },
    ];
    const digests = new Set([digestExecutionContextV2(base)]);
    for (const variant of variants) {
      digests.add(digestExecutionContextV2(contextFor(variant)));
    }
    expect(digests.size).toBe(1 + variants.length);
  });

  it("I: canonical encoding carries machine-neutral facts only", () => {
    const encoded = encodeExecutionContextV2(contextFor({ argv: ["run", "build"] }));

    expect(encoded).toBe(
      [
        "adapterId=node-typescript/npm-scripts-v1",
        "adapterContractVersion=1",
        "executable=npm",
        `argv=${encodeArgvForDigest(["run", "build"])}`,
        `argvDigest=${digestArgv(["run", "build"])}`,
        "cwdRole=project-root",
        "stepLimitSeconds=120",
        "overallBudgetSeconds=300",
        "terminationGraceSeconds=5",
        "terminalCause=passed",
      ].join("\n"),
    );
    expect(encoded).not.toContain(tmpdir());
  });
});

describe("M3-T2 EvidenceRecord v2 closed adapter/executable pairing", () => {
  function pairedContext(
    adapterId: "node-typescript/npm-scripts-v1" | "node-typescript/pnpm-scripts-v1",
    executable: "npm" | "pnpm",
  ): Record<string, unknown> {
    const argv = ["test"];
    return {
      adapterId,
      adapterContractVersion: 1,
      executable,
      argv,
      argvDigest: digestArgv(argv),
      cwdRole: "project-root",
      stepLimitSeconds: M3_STEP_LIMIT_SECONDS,
      overallBudgetSeconds: M3_OVERALL_BUDGET_SECONDS,
      terminationGraceSeconds: M3_TERMINATION_GRACE_SECONDS,
      terminalCause: "passed",
    };
  }

  function pairedRecord(adapterId: Parameters<typeof pairedContext>[0], executable: "npm" | "pnpm") {
    return {
      schemaVersion: EVIDENCE_V2_SCHEMA_VERSION,
      actor: "worker:m2",
      recordedAt: "2026-09-22T00:00:00.000Z",
      taskId: "TASK-M3-T2",
      capability: "repo.verify",
      policyDecision: "ALLOW",
      target: `${adapterId}:test`,
      result: "passed",
      provenance: `${executable} test; shell=false`,
      executionContext: pairedContext(adapterId, executable),
    };
  }

  it("A: npm adapter + npm executable is accepted", () => {
    expect(
      parseExecutionContext(pairedContext("node-typescript/npm-scripts-v1", "npm")),
    ).not.toBe(null);
    expect(isEvidenceRecordV2(pairedRecord("node-typescript/npm-scripts-v1", "npm"))).toBe(true);
  });

  it("B: pnpm adapter + pnpm executable is accepted", () => {
    const parsed = parseExecutionContext(pairedContext("node-typescript/pnpm-scripts-v1", "pnpm"));

    expect(parsed).not.toBe(null);
    expect(parsed?.executable).toBe("pnpm");
    expect(isEvidenceRecordV2(pairedRecord("node-typescript/pnpm-scripts-v1", "pnpm"))).toBe(true);
    expect(parseStoredEvidenceRecord(pairedRecord("node-typescript/pnpm-scripts-v1", "pnpm")).kind).toBe(
      "v2",
    );
  });

  it("C: npm adapter + pnpm executable is rejected", () => {
    expect(parseExecutionContext(pairedContext("node-typescript/npm-scripts-v1", "pnpm"))).toBe(null);
    expect(isEvidenceRecordV2(pairedRecord("node-typescript/npm-scripts-v1", "pnpm"))).toBe(false);
  });

  it("D: pnpm adapter + npm executable is rejected", () => {
    expect(parseExecutionContext(pairedContext("node-typescript/pnpm-scripts-v1", "npm"))).toBe(null);
    expect(isEvidenceRecordV2(pairedRecord("node-typescript/pnpm-scripts-v1", "npm"))).toBe(false);
  });

  it("E: unknown adapter or executable values are rejected", () => {
    const valid = pairedContext("node-typescript/npm-scripts-v1", "npm");
    expect(parseExecutionContext({ ...valid, adapterId: "node-typescript/yarn-scripts-v1" })).toBe(
      null,
    );
    expect(parseExecutionContext({ ...valid, executable: "yarn" })).toBe(null);
    expect(parseExecutionContext({ ...valid, executable: "" })).toBe(null);
  });

  it("F: pnpm execution contexts encode and digest deterministically", () => {
    const left = pairedContext("node-typescript/pnpm-scripts-v1", "pnpm");
    const right = pairedContext("node-typescript/pnpm-scripts-v1", "pnpm");
    const parsedLeft = parseExecutionContext(left);
    const parsedRight = parseExecutionContext(right);
    expect(parsedLeft).not.toBe(null);
    expect(parsedRight).not.toBe(null);
    if (parsedLeft === null || parsedRight === null) return;

    expect(encodeExecutionContextV2(parsedLeft)).toBe(encodeExecutionContextV2(parsedRight));
    expect(digestExecutionContextV2(parsedLeft)).toBe(digestExecutionContextV2(parsedRight));
    expect(encodeExecutionContextV2(parsedLeft)).toContain("adapterId=node-typescript/pnpm-scripts-v1");
    expect(encodeExecutionContextV2(parsedLeft)).toContain("executable=pnpm");
    expect(digestExecutionContextV2(parsedLeft)).not.toBe(
      digestExecutionContextV2(contextFor({ argv: ["test"] })),
    );
  });

  it("G+H: npm v2 behavior is unchanged and v1 remains readable", () => {
    expect(isEvidenceRecordV2(recordFor(contextFor({ terminalCause: "failed:3" })))).toBe(true);
    const parsed = parseStoredEvidenceRecord(v1Record());
    expect(parsed.kind).toBe("v1");
  });
});
