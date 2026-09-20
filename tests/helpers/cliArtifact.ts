/**
 * Test helper: locate the built CLI artifact.
 *
 * The real CLI entrypoint imports sibling modules with `.js`
 * specifiers (NodeNext), so it can only be executed from built
 * output — not via type-stripping of `src/`. This helper returns the
 * built path and compiles once on demand when the artifact is
 * missing, keeping `npm test` self-contained on a clean checkout.
 */
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

const repoRoot = fileURLToPath(new URL("../..", import.meta.url));

export function cliExecutable(): string {
  const artifact = `${repoRoot}dist/src/cli.js`;
  if (!existsSync(artifact)) {
    execFileSync("npx", ["tsc", "-p", "tsconfig.json"], { cwd: repoRoot, stdio: "pipe" });
  }
  return artifact;
}
