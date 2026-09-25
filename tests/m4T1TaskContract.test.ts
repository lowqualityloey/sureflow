import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  M2_ADAPTER_ID,
  M3_PNPM_ADAPTER_ID,
  M4_REPLACEMENT_OPERATION,
  M4_TASK_CONTRACT_SCHEMA_VERSION,
  parseM4TaskContract,
} from "../src/taskContract.js";

const HASH_A = "a".repeat(64);

function sha256(value: Uint8Array | string): string {
  return createHash("sha256").update(value).digest("hex");
}

function target(path: string, overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    path,
    expectedBeforeSha256: HASH_A,
    replacementContent: `export const value = ${JSON.stringify(path)};\n`,
    ...overrides,
  };
}

function validContract(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    schemaVersion: M4_TASK_CONTRACT_SCHEMA_VERSION,
    taskId: "TASK-M4-T1-FIXTURE",
    adapter: M2_ADAPTER_ID,
    operation: M4_REPLACEMENT_OPERATION,
    targets: [target("src/first.ts"), target("src/second.ts")],
    requiredVerification: ["typecheck", "test", "lint", "build"],
    ...overrides,
  };
}

function withoutField(value: Record<string, unknown>, field: string): Record<string, unknown> {
  return Object.fromEntries(Object.entries(value).filter(([key]) => key !== field));
}

describe("M4-T1 version-2 task contract", () => {
  it.each([
    ["npm", M2_ADAPTER_ID],
    ["pnpm", M3_PNPM_ADAPTER_ID],
  ] as const)("accepts a valid two-target %s contract", (_name, adapter) => {
    const parsed = parseM4TaskContract(validContract({ adapter }));
    expect(parsed.schemaVersion).toBe(2);
    expect(parsed.adapter).toBe(adapter);
    expect(parsed.operation).toBe("replace-existing-files");
    expect(parsed.targets).toHaveLength(2);
  });

  it("accepts the five-target boundary", () => {
    const parsed = parseM4TaskContract(validContract({
      targets: Array.from({ length: 5 }, (_, index) => target(`src/file-${String(index)}.ts`)),
    }));
    expect(parsed.targets).toHaveLength(5);
  });

  it.each([0, 1, 6])("rejects %i targets", (count) => {
    const targets = Array.from({ length: count }, (_, index) => target(`src/file-${String(index)}.ts`));
    expect(() => parseM4TaskContract(validContract({ targets }))).toThrow(/2–5 targets/);
  });

  it("requires the exact version-2 top-level field set", () => {
    for (const field of [
      "schemaVersion",
      "taskId",
      "adapter",
      "operation",
      "targets",
      "requiredVerification",
    ]) {
      const candidate = withoutField(validContract(), field);
      expect(() => parseM4TaskContract(candidate)).toThrow(/missing field/);
    }
    expect(() => parseM4TaskContract(validContract({ command: "npm test" }))).toThrow(
      /unsupported field.*command/,
    );
  });

  it.each([
    ["wrong schema version", { schemaVersion: 1 }],
    ["unsupported operation", { operation: "run-command" }],
    ["unsupported adapter", { adapter: "node-typescript/arbitrary-v1" }],
    ["empty task id", { taskId: "  " }],
    ["control character in task id", { taskId: "bad\nid" }],
  ])("rejects %s", (_label, overrides) => {
    expect(() => parseM4TaskContract(validContract(overrides))).toThrow(/invalid M4 task contract/);
  });

  it.each([
    ["absolute path", "/src/file.ts"],
    ["drive path", "C:src/file.ts"],
    ["backslash", "src\\file.ts"],
    ["parent traversal", "src/../file.ts"],
    ["dot segment", "src/./file.ts"],
    ["empty segment", "src//file.ts"],
    [".git segment", "src/.git/config"],
    [".sureflow segment", "src/.sureflow/state.json"],
    ["NUL", "src/\u0000file.ts"],
  ])("rejects a target with %s", (_label, path) => {
    expect(() => parseM4TaskContract(validContract({ targets: [target(path), target("src/other.ts")] })))
      .toThrow(/target path/);
  });

  it("rejects duplicate target paths, malformed hashes, and no-op replacements", () => {
    expect(() => parseM4TaskContract(validContract({
      targets: [target("src/same.ts"), target("src/same.ts")],
    }))).toThrow(/duplicate target path/);
    expect(() => parseM4TaskContract(validContract({
      targets: [target("src/first.ts", { expectedBeforeSha256: "A".repeat(64) }), target("src/second.ts")],
    }))).toThrow(/lowercase SHA-256/);
    const replacementContent = "unchanged bytes\n";
    expect(() => parseM4TaskContract(validContract({
      targets: [
        target("src/first.ts", {
          expectedBeforeSha256: sha256(Buffer.from(replacementContent, "utf8")),
          replacementContent,
        }),
        target("src/second.ts"),
      ],
    }))).toThrow(/no-op/);
  });

  it("requires exact target fields and well-formed replacement strings", () => {
    for (const field of ["path", "expectedBeforeSha256", "replacementContent"]) {
      const incomplete = withoutField(target("src/first.ts"), field);
      expect(() => parseM4TaskContract(validContract({ targets: [incomplete, target("src/second.ts")] })))
        .toThrow(/missing field/);
    }
    expect(() => parseM4TaskContract(validContract({
      targets: [target("src/first.ts", { unexpected: true }), target("src/second.ts")],
    }))).toThrow(/unsupported field.*unexpected/);
    expect(() => parseM4TaskContract(validContract({
      targets: [target("src/first.ts", { replacementContent: 42 }), target("src/second.ts")],
    }))).toThrow(/replacementContent must be a string/);
    expect(() => parseM4TaskContract(validContract({
      targets: [target("src/first.ts", { replacementContent: "\uD800" }), target("src/second.ts")],
    }))).toThrow(/Unicode scalar/);
  });

  it("requires a non-empty, duplicate-free closed verification selection", () => {
    expect(() => parseM4TaskContract(validContract({ requiredVerification: [] })))
      .toThrow(/non-empty array/);
    expect(() => parseM4TaskContract(validContract({ requiredVerification: ["test", "test"] })))
      .toThrow(/duplicate verification/);
    expect(() => parseM4TaskContract(validContract({ requiredVerification: ["shell"] })))
      .toThrow(/unsupported verification/);
  });

  it("canonicalizes verification while retaining target declaration data only", () => {
    const parsed = parseM4TaskContract(validContract({
      targets: [target("src/z.ts"), target("src/a.ts")],
      requiredVerification: ["build", "test"],
    }));
    expect(parsed.requiredVerification).toEqual(["test", "build"]);
    expect(parsed.targets.map(({ path }) => path)).toEqual(["src/z.ts", "src/a.ts"]);
    expect(parsed).not.toHaveProperty("writeOrder");
  });

  it("does not impose a replacement byte cap", () => {
    const replacementContent = "x".repeat(1024 * 1024);
    const parsed = parseM4TaskContract(validContract({
      targets: [target("src/large.ts", { replacementContent }), target("src/second.ts")],
    }));
    expect(Buffer.byteLength(parsed.targets[0]?.replacementContent ?? "", "utf8")).toBe(1024 * 1024);
  });
});

describe("M4-T1 independent fixture shapes", () => {
  it.each([
    ["fixtures/m2-node-ts-project", M2_ADAPTER_ID],
    ["fixtures/m3-pnpm-node-ts-project", M3_PNPM_ADAPTER_ID],
  ] as const)("validates the two-target example and exact preimage bytes in %s", (fixtureRoot, adapter) => {
    const raw = readFileSync(join(fixtureRoot, "task.m4.example.json"), "utf8");
    const contract = parseM4TaskContract(JSON.parse(raw) as unknown);

    expect(contract.adapter).toBe(adapter);
    expect(contract.targets).toHaveLength(2);
    for (const fixtureTarget of contract.targets) {
      const beforeBytes = readFileSync(join(fixtureRoot, fixtureTarget.path));
      expect(fixtureTarget.expectedBeforeSha256).toBe(sha256(beforeBytes));
      expect(sha256(Buffer.from(fixtureTarget.replacementContent, "utf8")))
        .not.toBe(fixtureTarget.expectedBeforeSha256);
    }
  });
});
