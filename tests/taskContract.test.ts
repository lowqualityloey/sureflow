import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  M2_ADAPTER_ID,
  M2_REPLACEMENT_OPERATION,
  M2_TASK_CONTRACT_RELATIVE_PATH,
  M2_TASK_CONTRACT_SCHEMA_VERSION,
  loadValidatedExecutionPlan,
  parseM2TaskContract,
} from "../src/taskContract.js";

const VALID_TASK = {
  schemaVersion: M2_TASK_CONTRACT_SCHEMA_VERSION,
  taskId: "TASK-M2-T1-FIXTURE",
  adapter: M2_ADAPTER_ID,
  operation: M2_REPLACEMENT_OPERATION,
  targetPath: "src/displayName.ts",
  expectedBeforeSha256: "a".repeat(64),
  replacementContent: "export function displayName(): string { return \"ok\"; }\n",
  requiredVerification: ["typecheck", "test", "lint", "build"],
} as const;

const temporaryRoots: string[] = [];

function temporaryRoot(): string {
  const root = mkdtempSync(join(tmpdir(), "sureflow-m2-t1-"));
  temporaryRoots.push(root);
  return root;
}

function writeTask(root: string, value: string): void {
  mkdirSync(join(root, ".sureflow"), { recursive: true });
  writeFileSync(join(root, M2_TASK_CONTRACT_RELATIVE_PATH), value, "utf8");
}

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe("M2-T1 task contract", () => {
  it("produces an immutable validated plan and provenance hash from one task read", () => {
    const root = temporaryRoot();
    const bytes = JSON.stringify(VALID_TASK) + "\n";
    writeTask(root, bytes);

    const plan = loadValidatedExecutionPlan(root);

    expect(plan).toMatchObject({
      schemaVersion: 1,
      taskId: VALID_TASK.taskId,
      adapter: M2_ADAPTER_ID,
      operation: M2_REPLACEMENT_OPERATION,
      targetPath: VALID_TASK.targetPath,
      expectedBeforeSha256: VALID_TASK.expectedBeforeSha256,
      replacementContent: VALID_TASK.replacementContent,
      requiredVerification: VALID_TASK.requiredVerification,
      source: {
        path: M2_TASK_CONTRACT_RELATIVE_PATH,
        sha256: createHash("sha256").update(bytes).digest("hex"),
      },
    });
    expect(plan.contractSha256).toBe(plan.source.sha256);
    expect(Object.isFrozen(plan)).toBe(true);
    expect(Object.isFrozen(plan.requiredVerification)).toBe(true);
    expect(Object.isFrozen(plan.source)).toBe(true);
  });

  it("rejects malformed JSON before contract validation", () => {
    const root = temporaryRoot();
    writeTask(root, "{\"schemaVersion\":1");

    expect(() => loadValidatedExecutionPlan(root)).toThrow(/malformed JSON/);
  });

  it.each([
    ["schemaVersion", { schemaVersion: 2 }],
    ["adapter", { adapter: "arbitrary-adapter" }],
    ["operation", { operation: "run-command" }],
  ])("rejects unsupported %s values", (_field, override) => {
    expect(() => parseM2TaskContract({ ...VALID_TASK, ...override })).toThrow(/unsupported/);
  });

  it("rejects missing target and non-string replacement content", () => {
    const withoutTarget = { ...VALID_TASK } as Record<string, unknown>;
    delete withoutTarget.targetPath;
    expect(() => parseM2TaskContract(withoutTarget)).toThrow(/targetPath/);

    expect(() =>
      parseM2TaskContract({ ...VALID_TASK, replacementContent: 42 }),
    ).toThrow(/replacementContent/);
  });

  it("rejects malformed preimage hashes", () => {
    expect(() =>
      parseM2TaskContract({ ...VALID_TASK, expectedBeforeSha256: "not-a-sha" }),
    ).toThrow(/SHA-256/);
  });

  it("rejects unknown and duplicate verification profiles", () => {
    expect(() =>
      parseM2TaskContract({ ...VALID_TASK, requiredVerification: ["typecheck", "compile"] }),
    ).toThrow(/unsupported verification profile/);
    expect(() =>
      parseM2TaskContract({ ...VALID_TASK, requiredVerification: ["test", "test"] }),
    ).toThrow(/duplicate verification profile/);
  });

  it("rejects unknown authority-bearing fields and non-object input", () => {
    expect(() => parseM2TaskContract({ ...VALID_TASK, command: "npm test" })).toThrow(
      /unsupported field\(s\): command/,
    );
    expect(() => parseM2TaskContract(null)).toThrow(/expected an object/);
    expect(() => parseM2TaskContract([])).toThrow(/expected an object/);
  });

  it.each([
    "/absolute/file.ts",
    "../outside.ts",
    ".git/config",
    ".sureflow/task.json",
    "C:/absolute/file.ts",
    "src\\displayName.ts",
    "src/./displayName.ts",
  ])("rejects prohibited target path %s", (targetPath) => {
    expect(() => parseM2TaskContract({ ...VALID_TASK, targetPath })).toThrow(/targetPath/);
  });

  it("rejects an empty verification profile list", () => {
    expect(() => parseM2TaskContract({ ...VALID_TASK, requiredVerification: [] })).toThrow(
      /requiredVerification/,
    );
  });

  it("keeps the independent fixture's before-image and replacement example explicit", () => {
    const fixtureContract = JSON.parse(
      readFileSync("fixtures/m2-node-ts-project/task.example.json", "utf8"),
    ) as unknown;
    const contract = parseM2TaskContract(fixtureContract);
    const sourceBytes = readFileSync("fixtures/m2-node-ts-project/src/displayName.ts");

    expect(contract.targetPath).toBe("src/displayName.ts");
    expect(contract.expectedBeforeSha256).toBe(
      createHash("sha256").update(sourceBytes).digest("hex"),
    );
    expect(contract.replacementContent).toContain('replace(/\\s+/gu, "-")');
  });
});
