import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  M2_ADAPTER_ID,
  M2_TASK_CONTRACT_RELATIVE_PATH,
  M3_PNPM_ADAPTER_ID,
  M4_REPLACEMENT_OPERATION,
  M4_TASK_CONTRACT_SCHEMA_VERSION,
  loadValidatedExecutionPlan,
  loadValidatedM4ExecutionPlan,
  parseM4TaskContract,
} from "../src/taskContract.js";

const HASH_A = "a".repeat(64);
const temporaryRoots: string[] = [];

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

function temporaryRoot(): string {
  const root = mkdtempSync(join(tmpdir(), "sureflow-m4-t1-"));
  temporaryRoots.push(root);
  return root;
}

function writeTask(root: string, raw: string): void {
  mkdirSync(join(root, ".sureflow"), { recursive: true });
  writeFileSync(join(root, M2_TASK_CONTRACT_RELATIVE_PATH), raw, "utf8");
}

function loadRawM4Plan(raw: string) {
  const root = temporaryRoot();
  writeTask(root, raw);
  return loadValidatedM4ExecutionPlan(root);
}

function rawV2(targets: readonly string[], suffix = ""): string {
  return `{"schemaVersion":2,"taskId":"TASK-M4-T1-FIXTURE","adapter":"${M2_ADAPTER_ID}","operation":"${M4_REPLACEMENT_OPERATION}","targets":[${targets.join(",")}],"requiredVerification":["test"]${suffix}}`;
}

function rawTarget(path: string): string {
  return JSON.stringify(target(path));
}

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) rmSync(root, { recursive: true, force: true });
});

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

describe("M4-T1 raw contract loader", () => {
  it("binds exact raw bytes and deeply freezes the validated plan", () => {
    const raw = `${JSON.stringify(validContract())}\n`;
    const plan = loadRawM4Plan(raw);

    expect(plan.source.sha256).toBe(sha256(Buffer.from(raw, "utf8")));
    expect(plan.contractSha256).toBe(plan.source.sha256);
    expect(plan.source.path).toBe(M2_TASK_CONTRACT_RELATIVE_PATH);
    expect(Object.isFrozen(plan)).toBe(true);
    expect(Object.isFrozen(plan.targets)).toBe(true);
    expect(plan.targets.every((item) => Object.isFrozen(item))).toBe(true);
    expect(Object.isFrozen(plan.requiredVerification)).toBe(true);
    expect(Object.isFrozen(plan.source)).toBe(true);
  });

  it("separates byte identity from canonical verification meaning", () => {
    const firstRaw = JSON.stringify(validContract({ requiredVerification: ["build", "test"] }));
    const secondRaw = JSON.stringify({
      requiredVerification: ["test", "build"],
      targets: [target("src/first.ts"), target("src/second.ts")],
      operation: M4_REPLACEMENT_OPERATION,
      adapter: M2_ADAPTER_ID,
      taskId: "TASK-M4-T1-FIXTURE",
      schemaVersion: 2,
    });
    const first = loadRawM4Plan(firstRaw);
    const second = loadRawM4Plan(secondRaw);

    expect(first.requiredVerification).toEqual(["test", "build"]);
    expect(second.requiredVerification).toEqual(first.requiredVerification);
    expect(first.source.sha256).not.toBe(second.source.sha256);
  });

  it("rejects malformed JSON and invalid UTF-8", () => {
    const root = temporaryRoot();
    mkdirSync(join(root, ".sureflow"), { recursive: true });
    writeFileSync(join(root, M2_TASK_CONTRACT_RELATIVE_PATH), "{\"schemaVersion\":2", "utf8");
    expect(() => loadValidatedM4ExecutionPlan(root)).toThrow(/malformed JSON/);

    writeFileSync(join(root, M2_TASK_CONTRACT_RELATIVE_PATH), Buffer.from([0xff, 0xfe]));
    expect(() => loadValidatedM4ExecutionPlan(root)).toThrow(/UTF-8/);
  });

  it("rejects duplicate schemaVersion before last-key-wins can hide v2", () => {
    const raw = rawV2([rawTarget("src/first.ts"), rawTarget("src/second.ts")], ",\"schemaVersion\":1");
    expect(() => loadRawM4Plan(raw)).toThrow(/duplicate.*schemaVersion/i);
  });

  it("rejects duplicate top-level fields", () => {
    const raw = rawV2(
      [rawTarget("src/first.ts"), rawTarget("src/second.ts")],
      ",\"taskId\":\"TASK-OTHER\"",
    );
    expect(() => loadRawM4Plan(raw)).toThrow(/duplicate.*taskId/i);
  });

  it.each([
    ["path", "src/replaced.ts"],
    ["expectedBeforeSha256", "b".repeat(64)],
    ["replacementContent", "export const replacement = true;\n"],
  ])("rejects duplicate target %s member names", (field, duplicateValue) => {
    const first = target("src/first.ts");
    const members = Object.entries(first).map(([key, value]) => `${JSON.stringify(key)}:${JSON.stringify(value)}`);
    members.push(`${JSON.stringify(field)}:${JSON.stringify(duplicateValue)}`);
    const duplicateTarget = `{${members.join(",")}}`;
    const raw = rawV2([duplicateTarget, rawTarget("src/second.ts")]);
    expect(() => loadRawM4Plan(raw)).toThrow(/duplicate.*target/i);
  });

  it("rejects escaped-equivalent target member names", () => {
    const first = target("src/first.ts");
    const members = Object.entries(first).map(([key, value]) => `${JSON.stringify(key)}:${JSON.stringify(value)}`);
    members.push(`"\\u0070ath":"src/replaced.ts"`);
    const raw = rawV2([`{${members.join(",")}}`, rawTarget("src/second.ts")]);
    expect(() => loadRawM4Plan(raw)).toThrow(/duplicate.*target/i);
  });

  it("preserves historical v1 duplicate-key last-key-wins behavior", () => {
    const root = temporaryRoot();
    const raw = `{"schemaVersion":1,"taskId":"first","taskId":"last","adapter":"${M2_ADAPTER_ID}","operation":"replace-existing-file","targetPath":"src/displayName.ts","expectedBeforeSha256":"${HASH_A}","replacementContent":"ok","requiredVerification":["test"]}`;
    writeTask(root, raw);
    expect(loadValidatedExecutionPlan(root).taskId).toBe("last");
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
