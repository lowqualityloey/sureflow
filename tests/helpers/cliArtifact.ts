/**
 * Test helper: locate the built CLI artifact.
 *
 * The real CLI entrypoint imports sibling modules with `.js`
 * specifiers (NodeNext), so it can only be executed from built
 * output — not via type-stripping of `src/`. Each worker compiles to
 * its own temporary ESM package and reuses only a completed build.
 */
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { isAbsolute, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll } from "vitest";

const repoRoot = fileURLToPath(new URL("../..", import.meta.url));
const require = createRequire(import.meta.url);
const typescriptCli = require.resolve("typescript/bin/tsc");

const completedCli = (() => {
  const buildRoot = mkdtempSync(join(tmpdir(), "sureflow-test-cli-"));
  const cleanup = (): void => {
    rmSync(buildRoot, { recursive: true, force: true });
  };
  try {
    const relativeToRepo = relative(repoRoot, buildRoot);
    const outputIsInsideRepo =
      relativeToRepo === "" ||
      (!isAbsolute(relativeToRepo) && relativeToRepo !== ".." && !relativeToRepo.startsWith(`..${sep}`));
    if (outputIsInsideRepo) throw new Error("The isolated test CLI build must stay outside the repository");

    writeFileSync(join(buildRoot, "package.json"), '{"type":"module"}\n');
    execFileSync(
      process.execPath,
      [typescriptCli, "-p", join(repoRoot, "tsconfig.package.json"), "--outDir", buildRoot],
      { cwd: repoRoot, stdio: "pipe" },
    );

    const cli = join(buildRoot, "src", "cli.js");
    const stateWriter = join(buildRoot, "src", "stateWriter.js");
    if (!existsSync(cli) || !existsSync(stateWriter)) {
      throw new Error("The isolated TypeScript build did not emit the CLI and required sibling module");
    }

    afterAll(cleanup);
    return cli;
  } catch (error) {
    cleanup();
    throw error;
  }
})();

export function cliExecutable(): string {
  return completedCli;
}
