import { describe, expect, it } from "vitest";
import {
  DEFAULT_M1_POLICY,
  M1_CAPABILITY_ALLOWLIST,
  M1_PROTECTED_OPERATIONS,
  decidePolicy,
} from "../src/policy.js";
import { createTaskState, isTaskState, resolveStatePath } from "../src/state.js";
import { VERIFICATION_VERDICTS, isVerificationVerdict } from "../src/verdicts.js";

describe("T2 policy decisions (default deny, explicit allow, approval)", () => {
  it("denies anything outside the allowlist", () => {
    expect(decidePolicy(DEFAULT_M1_POLICY, "network.external")).toBe("DENY");
    expect(decidePolicy(DEFAULT_M1_POLICY, "deploy.preview")).toBe("DENY");
    expect(decidePolicy(DEFAULT_M1_POLICY, "")).toBe("DENY");
  });

  it("allows exactly the M1 capability allowlist", () => {
    for (const capability of M1_CAPABILITY_ALLOWLIST) {
      expect(decidePolicy(DEFAULT_M1_POLICY, capability)).toBe("ALLOW");
    }
  });

  it("requires approval for all five protected operations", () => {
    expect(M1_PROTECTED_OPERATIONS).toHaveLength(5);
    for (const op of M1_PROTECTED_OPERATIONS) {
      expect(decidePolicy(DEFAULT_M1_POLICY, op)).toBe("REQUIRE_APPROVAL");
    }
  });

  it("protection wins even if a capability were also allowlisted", () => {
    const overlapping = {
      allowlist: [...M1_CAPABILITY_ALLOWLIST, "deploy.production"],
      protectedOperations: [...M1_PROTECTED_OPERATIONS],
    };
    expect(decidePolicy(overlapping, "deploy.production")).toBe("REQUIRE_APPROVAL");
  });
});

describe("T2 domain separation: policy decisions are not verifier verdicts", () => {
  it("verdicts are exactly PASS/FAIL/UNKNOWN/BLOCKED", () => {
    expect([...VERIFICATION_VERDICTS].sort()).toEqual(["BLOCKED", "FAIL", "PASS", "UNKNOWN"]);
    expect(isVerificationVerdict("DENY")).toBe(false);
    expect(isVerificationVerdict("ALLOW")).toBe(false);
    expect(isVerificationVerdict("REQUIRE_APPROVAL")).toBe(false);
  });

  it("DENY is a policy decision, never a verifier verdict", () => {
    expect(decidePolicy(DEFAULT_M1_POLICY, "secret.read")).toBe("DENY");
    expect(isVerificationVerdict("DENY")).toBe(false);
  });
});

describe("T2 state authority (AC-6)", () => {
  it("resolves paths strictly inside .sureflow/state/", () => {
    expect(resolveStatePath("/repo", ".sureflow/state/tasks/a.json")).toBe(
      "/repo/.sureflow/state/tasks/a.json",
    );
  });

  it("refuses docs/STATE.md as runtime state input", () => {
    expect(() => resolveStatePath("/repo", "docs/STATE.md")).toThrow(/not authoritative/);
    expect(() => resolveStatePath("/repo", "/repo/docs/STATE.md")).toThrow(/not authoritative/);
  });

  it("refuses paths outside .sureflow/state/ and traversal escapes", () => {
    expect(() => resolveStatePath("/repo", "src/policy.ts")).toThrow(/outside/);
    expect(() => resolveStatePath("/repo", ".sureflow/events/x.jsonl")).toThrow(/outside/);
    expect(() => resolveStatePath("/repo", ".sureflow/state/../policy/d.json")).toThrow(
      /escapes|outside/,
    );
  });

  it("round-trips a minimal task record with schema version", () => {
    const task = createTaskState("TASK-1", "2026-09-20T00:00:00.000Z");
    expect(isTaskState(task)).toBe(true);
    expect(isTaskState({ ...task, status: "accepted" })).toBe(true);
    expect(isTaskState({ ...task, schemaVersion: 999 })).toBe(false);
    expect(isTaskState(null)).toBe(false);
  });
});
