import { readFileSync } from "node:fs";
import { join } from "node:path";
import { M1_CAPABILITY_ALLOWLIST } from "./policy.js";

export const T0_FIXTURE_RELATIVE_PATH = "fixtures/t0-basic/task.json";
export const M1_TEST_PROFILE = "npm-test" as const;

export type T0Capability = "repo.read" | "repo.write" | "repo.test";

export interface T0TaskFixture {
  readonly taskId: string;
  readonly capability: T0Capability;
  readonly target: string;
  readonly expectedResult: string;
  readonly testProfile?: typeof M1_TEST_PROFILE;
}

const BASE_FIELDS = ["taskId", "capability", "target", "expectedResult"] as const;
const TEST_FIELDS = [...BASE_FIELDS, "testProfile"] as const;

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isT0Capability(value: unknown): value is T0Capability {
  return typeof value === "string" && M1_CAPABILITY_ALLOWLIST.includes(value);
}

function assertExactFields(
  value: Record<string, unknown>,
  allowedFields: readonly string[],
): void {
  const unsupported = Object.keys(value).filter((field) => !allowedFields.includes(field));
  if (unsupported.length > 0) {
    throw new Error(`invalid T0 fixture: unsupported field(s): ${unsupported.join(", ")}`);
  }
}

/**
 * Validate the closed M1 T0 task/acceptance contract.
 *
 * This function only parses deterministic fixture input. It does not make a
 * policy decision, execute a capability, emit a verdict, or persist runtime
 * state, events, or evidence.
 */
export function parseT0TaskFixture(value: unknown): T0TaskFixture {
  if (!isObject(value)) {
    throw new Error("invalid T0 fixture: expected an object");
  }
  if (!isNonEmptyString(value.taskId)) {
    throw new Error("invalid T0 fixture: taskId must be a non-empty string");
  }
  if (!isT0Capability(value.capability)) {
    throw new Error("invalid T0 fixture: capability must be an approved M1 capability");
  }
  if (!isNonEmptyString(value.target)) {
    throw new Error("invalid T0 fixture: target must be a non-empty string");
  }
  if (!isNonEmptyString(value.expectedResult)) {
    throw new Error("invalid T0 fixture: expectedResult must be a non-empty string");
  }

  if (value.capability === "repo.test") {
    assertExactFields(value, TEST_FIELDS);
    if (value.testProfile !== M1_TEST_PROFILE) {
      throw new Error(`invalid T0 fixture: repo.test requires testProfile ${M1_TEST_PROFILE}`);
    }
    return {
      taskId: value.taskId,
      capability: value.capability,
      target: value.target,
      expectedResult: value.expectedResult,
      testProfile: value.testProfile,
    };
  }

  assertExactFields(value, BASE_FIELDS);
  return {
    taskId: value.taskId,
    capability: value.capability,
    target: value.target,
    expectedResult: value.expectedResult,
  };
}

/** Load the one approved T0 fixture from a repository root. */
export function loadT0TaskFixture(rootDir: string): T0TaskFixture {
  const fixturePath = join(rootDir, T0_FIXTURE_RELATIVE_PATH);
  const parsed: unknown = JSON.parse(readFileSync(fixturePath, "utf8"));
  return parseT0TaskFixture(parsed);
}
