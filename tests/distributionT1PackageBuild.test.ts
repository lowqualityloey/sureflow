import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const repositoryRoot = fileURLToPath(new URL("../", import.meta.url));
const compilerPath = realpathSync(join(repositoryRoot, "node_modules/.bin/tsc"));
const productionCommands = ["init", "run", "status", "verify", "preflight"] as const;

function listFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = join(directory, entry.name);
    return entry.isDirectory() ? listFiles(entryPath) : [entryPath];
  });
}

function createPackageWorkspace(): string {
  const workspace = mkdtempSync(join(tmpdir(), "sureflow-t1-package-"));
  expect(existsSync(join(repositoryRoot, "tsconfig.package.json"))).toBe(true);
  expect(existsSync(join(repositoryRoot, "scripts/clean-package-output.mjs"))).toBe(true);
  cpSync(join(repositoryRoot, "src"), join(workspace, "src"), { recursive: true });
  cpSync(join(repositoryRoot, "tsconfig.json"), join(workspace, "tsconfig.json"));
  cpSync(join(repositoryRoot, "tsconfig.package.json"), join(workspace, "tsconfig.package.json"));
  cpSync(join(repositoryRoot, "package.json"), join(workspace, "package.json"));
  mkdirSync(join(workspace, "scripts"), { recursive: true });
  cpSync(
    join(repositoryRoot, "scripts/clean-package-output.mjs"),
    join(workspace, "scripts/clean-package-output.mjs"),
  );
  symlinkSync(join(repositoryRoot, "node_modules"), join(workspace, "node_modules"), "dir");
  return workspace;
}

function runCleanup(workspace: string): void {
  execFileSync(process.execPath, [join(workspace, "scripts/clean-package-output.mjs")], {
    cwd: workspace,
    stdio: "pipe",
  });
}

function runPackageBuild(workspace: string): void {
  runCleanup(workspace);
  execFileSync(process.execPath, [compilerPath, "-p", "tsconfig.package.json"], {
    cwd: workspace,
    stdio: "pipe",
  });
}

function outputHashes(directory: string): readonly (readonly [string, string])[] {
  return listFiles(directory)
    .map((path) => {
      const relativePath = relative(directory, path).split(sep).join("/");
      const digest = createHash("sha256").update(readFileSync(path)).digest("hex");
      return [relativePath, digest] as const;
    })
    .sort(([left], [right]) => left.localeCompare(right));
}

function sourceOutputPaths(workspace: string): readonly string[] {
  return listFiles(join(workspace, "src"))
    .filter((path) => path.endsWith(".ts"))
    .map((path) => relative(join(workspace, "src"), path).split(sep).join("/").replace(/\.ts$/, ".js"))
    .sort((left, right) => left.localeCompare(right));
}

function withPackageWorkspace(check: (workspace: string) => void): void {
  const workspace = createPackageWorkspace();
  try {
    check(workspace);
  } finally {
    rmSync(workspace, { recursive: true, force: true });
  }
}

describe("Distribution T1 package build/bin contract", () => {
  it("has a package-specific production compiler config", () => {
    expect(existsSync(join(repositoryRoot, "tsconfig.package.json"))).toBe(true);
  });

  it("removes stale package output without deleting adjacent dist content", () => {
    withPackageWorkspace((workspace) => {
      const stalePath = join(workspace, "dist/src/t1-distinctive-stale-probe.js");
      const siblingPath = join(workspace, "dist/config-output.keep");
      mkdirSync(dirname(stalePath), { recursive: true });
      mkdirSync(dirname(siblingPath), { recursive: true });
      writeFileSync(stalePath, "stale");
      writeFileSync(siblingPath, "preserve");

      runCleanup(workspace);

      expect(existsSync(stalePath)).toBe(false);
      expect(readFileSync(siblingPath, "utf8")).toBe("preserve");
    });
  });

  it("emits exactly current production source modules and removes stale output", () => {
    withPackageWorkspace((workspace) => {
      const stalePath = join(workspace, "dist/src/t1-distinctive-stale-probe.js");
      mkdirSync(dirname(stalePath), { recursive: true });
      writeFileSync(stalePath, "stale");

      runPackageBuild(workspace);

      const outputDirectory = join(workspace, "dist/src");
      const outputPaths = listFiles(outputDirectory)
        .map((path) => relative(outputDirectory, path).split(sep).join("/"))
        .sort((left, right) => left.localeCompare(right));
      expect(outputPaths).toEqual(sourceOutputPaths(workspace));
      expect(existsSync(stalePath)).toBe(false);
      expect(outputPaths.some((path) => path.includes(".test."))).toBe(false);
    });
  });

  it("emits an executable CLI entry with the existing command surface", () => {
    withPackageWorkspace((workspace) => {
      runPackageBuild(workspace);
      const cliPath = join(workspace, "dist/src/cli.js");
      const cliContents = readFileSync(cliPath, "utf8");
      const help = execFileSync(process.execPath, [cliPath, "--help"], {
        cwd: workspace,
        encoding: "utf8",
      });

      expect(cliContents.split(/\r?\n/, 1)[0]).toBe("#!/usr/bin/env node");
      for (const command of productionCommands) {
        expect(help).toContain(command);
      }
    });
  });

  it(
    "produces identical sorted output paths and hashes across clean builds",
    () => {
      withPackageWorkspace((workspace) => {
        runPackageBuild(workspace);
        const firstBuild = outputHashes(join(workspace, "dist/src"));

        runPackageBuild(workspace);
        const secondBuild = outputHashes(join(workspace, "dist/src"));

        expect(secondBuild).toEqual(firstBuild);
      });
    },
    15_000,
  );
});
