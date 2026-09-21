import { readFileSync } from "node:fs";
import type { PolicyConfig } from "./policy.js";
import { POLICY_RELATIVE_PATH, resolveSureflowPath } from "./sureflowPaths.js";

function isStringArray(value: unknown): value is readonly string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === "string");
}

export function loadPolicy(rootDir: string): PolicyConfig {
  const path = resolveSureflowPath(rootDir, POLICY_RELATIVE_PATH);
  const parsed: unknown = JSON.parse(readFileSync(path, "utf8"));
  if (typeof parsed !== "object" || parsed === null) {
    throw new Error("invalid policy: expected an object");
  }
  const value = parsed as Record<string, unknown>;
  if (!isStringArray(value["allowlist"]) || !isStringArray(value["protectedOperations"])) {
    throw new Error("invalid policy: allowlist and protectedOperations must be string arrays");
  }
  return {
    allowlist: value["allowlist"],
    protectedOperations: value["protectedOperations"],
  };
}
