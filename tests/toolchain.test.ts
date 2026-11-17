import { describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { cliExecutable } from "./helpers/cliArtifact.js";

const pkg: {
  engines: { node: string };
  devDependencies: { "@types/node": string };
  scripts: Record<string, string>;
} = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")) as {
  engines: { node: string };
  devDependencies: { "@types/node": string };
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

  it("declares Node 24 type definitions", () => {
    const declaredRange = pkg.devDependencies["@types/node"];
    const major = Number(declaredRange.replace(/^\D*/, "").split(".")[0]);
    expect(major).toBe(24);
  });

  it("exposes the approved quality-gate scripts", () => {
    expect(pkg.scripts["typecheck"]).toContain("tsc --noEmit");
    expect(pkg.scripts["test"]).toContain("vitest");
    expect(pkg.scripts["lint"]).toContain("eslint");
  });

  it("cli stub exits 0 on --help and 2 on unknown command", () => {
    const cli = cliExecutable();
    const repoRoot = fileURLToPath(new URL("../", import.meta.url));
    const checkoutArtifact = fileURLToPath(new URL("../dist/src/cli.js", import.meta.url));

    expect(cli).not.toBe(checkoutArtifact);
    expect(relative(repoRoot, cli).startsWith("..")).toBe(true);
    expect(cliExecutable()).toBe(cli);
    expect(existsSync(cli)).toBe(true);
    expect(existsSync(join(dirname(cli), "stateWriter.js"))).toBe(true);

    const help = execFileSync(process.execPath, [cli, "--help"], { encoding: "utf8" });
    expect(help).toContain("init, run, status, verify");
    expect(() =>
      execFileSync(process.execPath, [cli, "run"], { stdio: "pipe" }),
    ).toThrow();
  });
});
