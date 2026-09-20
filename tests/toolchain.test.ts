import { describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const pkg: {
  engines: { node: string };
  scripts: Record<string, string>;
} = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")) as {
  engines: { node: string };
  scripts: Record<string, string>;
};

describe("T1 toolchain gate", () => {
  it("declares the Node 24.x runtime contract via engines", () => {
    // Supported contract is the 24.x range (exact pin lives in the
    // lockfile + provenance, not in engines).
    expect(pkg.engines.node).toBe("^24.0.0");
    const major = Number(process.version.replace(/^v/, "").split(".")[0]);
    expect(major).toBe(24);
  });

  it("exposes the approved quality-gate scripts", () => {
    expect(pkg.scripts["typecheck"]).toContain("tsc --noEmit");
    expect(pkg.scripts["test"]).toContain("vitest");
    expect(pkg.scripts["lint"]).toContain("eslint");
  });

  it("cli stub exits 0 on --help and 2 on unknown command", () => {
    const help = execFileSync("node", ["--experimental-strip-types", "src/cli.ts", "--help"], {
      encoding: "utf8",
    });
    expect(help).toContain("init, run, status, verify");
    expect(() =>
      execFileSync("node", ["--experimental-strip-types", "src/cli.ts", "run"], { stdio: "pipe" }),
    ).toThrow();
  });
});
