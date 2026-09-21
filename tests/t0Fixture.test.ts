import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  loadT0TaskFixture,
  M1_TEST_PROFILE,
  parseT0TaskFixture,
  T0_FIXTURE_RELATIVE_PATH,
} from "../src/t0Fixture.js";

const EXPECTED_T0_FIXTURE = {
  taskId: "TASK-T0-BASIC",
  capability: "repo.test",
  target: "fixtures/t0-basic/output.txt",
  expectedResult: "ok",
  testProfile: "npm-test",
} as const;

describe("T8 minimal T0 fixture contract", () => {
  it("loads the repository fixture deterministically from its fixed path", () => {
    expect(T0_FIXTURE_RELATIVE_PATH).toBe("fixtures/t0-basic/task.json");
    expect(loadT0TaskFixture(process.cwd())).toEqual(EXPECTED_T0_FIXTURE);
  });

  it("contains exactly the approved repo.test fields and profile", () => {
    const raw: unknown = JSON.parse(readFileSync(T0_FIXTURE_RELATIVE_PATH, "utf8"));
    expect(raw).toEqual(EXPECTED_T0_FIXTURE);
    expect(M1_TEST_PROFILE).toBe("npm-test");
    expect(Object.keys(EXPECTED_T0_FIXTURE)).toEqual([
      "taskId",
      "capability",
      "target",
      "expectedResult",
      "testProfile",
    ]);
  });

  it("accepts approved non-test capabilities only without testProfile", () => {
    expect(
      parseT0TaskFixture({
        taskId: "TASK-READ",
        capability: "repo.read",
        target: "README.md",
        expectedResult: "readable",
      }),
    ).toEqual({
      taskId: "TASK-READ",
      capability: "repo.read",
      target: "README.md",
      expectedResult: "readable",
    });
  });

  it("rejects repo.test without exactly the npm-test profile", () => {
    const withoutProfile = { ...EXPECTED_T0_FIXTURE } as Record<string, unknown>;
    delete withoutProfile.testProfile;

    expect(() => parseT0TaskFixture(withoutProfile)).toThrow(/requires testProfile npm-test/);
    expect(() =>
      parseT0TaskFixture({ ...EXPECTED_T0_FIXTURE, testProfile: "custom" }),
    ).toThrow(/requires testProfile npm-test/);
  });

  it.each([
    "executable",
    "argv",
    "command",
    "shell",
    "environmentCommand",
    "runId",
    "attemptId",
    "sequence",
    "approvalEvidence",
    "providerMetadata",
  ])(
    "rejects unsupported field %s rather than accepting execution control",
    (field) => {
      expect(() =>
        parseT0TaskFixture({ ...EXPECTED_T0_FIXTURE, [field]: "caller-controlled" }),
      ).toThrow(new RegExp(`unsupported field\\(s\\): ${field}`));
    },
  );

  it("rejects malformed or unsupported fixture shapes", () => {
    expect(() => parseT0TaskFixture(null)).toThrow(/expected an object/);
    expect(() => parseT0TaskFixture({ ...EXPECTED_T0_FIXTURE, taskId: "" })).toThrow(/taskId/);
    expect(() => parseT0TaskFixture({ ...EXPECTED_T0_FIXTURE, capability: "network.external" })).toThrow(
      /approved M1 capability/,
    );
    expect(() => parseT0TaskFixture({ ...EXPECTED_T0_FIXTURE, expectedResult: undefined })).toThrow(
      /expectedResult/,
    );
    expect(() =>
      parseT0TaskFixture({
        taskId: "TASK-READ",
        capability: "repo.read",
        target: "README.md",
        expectedResult: "readable",
        testProfile: "npm-test",
      }),
    ).toThrow(/unsupported field\(s\): testProfile/);
  });

  it("keeps expectedResult fixture-owned and independent from evidence", () => {
    const persistedEvidence = { result: "different runtime result" };
    const fixture = parseT0TaskFixture(EXPECTED_T0_FIXTURE);

    expect(fixture.expectedResult).toBe("ok");
    expect(fixture.expectedResult).not.toBe(persistedEvidence.result);
  });
});
