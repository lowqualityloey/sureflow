import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  M2_ADAPTER_ID,
  M2_TASK_CONTRACT_RELATIVE_PATH,
  M4_REPLACEMENT_OPERATION,
  M4_TASK_CONTRACT_SCHEMA_VERSION,
  loadValidatedExecutionPlan,
  loadValidatedM4ExecutionPlan,
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
