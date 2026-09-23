import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { validateM4CompleteTargetSet } from "../src/completeTargetSet.js";

function digest(content: string): string {
  return createHash("sha256").update(content).digest("hex");
}

describe("M4 complete target identity", () => {
  it("fails closed when a target has no usable filesystem identity", () => {
    const root = mkdtempSync(join(tmpdir(), "sureflow-m4-identity-"));
    try {
      mkdirSync(join(root, "src"));
      const firstContent = "first\n";
      const secondContent = "second\n";
      writeFileSync(join(root, "src/first.ts"), firstContent);
      writeFileSync(join(root, "src/second.ts"), secondContent);

      const result = validateM4CompleteTargetSet(root, [
        { path: "src/first.ts", expectedBeforeSha256: digest(firstContent), replacementContent: "new first\n" },
        { path: "src/second.ts", expectedBeforeSha256: digest(secondContent), replacementContent: "new second\n" },
      ], { readFileIdentity: () => null });

      expect(result.kind).toBe("refused");
      if (result.kind === "refused") expect(result.reason).toContain("identity");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
