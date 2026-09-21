/**
 * Bounded M1 worker primitives.
 *
 * `repo.read` and `repo.write` use the path jail below. `repo.test` has one
 * closed dispatch profile. cwd containment and closed dispatch are not an OS
 * sandbox and do not constrain code launched by npm itself.
 */
import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  writeFileSync,
} from "node:fs";
import {
  dirname,
  isAbsolute,
  relative,
  resolve,
  sep,
} from "node:path";

export const NPM_TEST_DISPATCH = {
  executable: "npm",
  argv: ["test"],
  shell: false,
} as const;

export type NpmTestEvidenceResult =
  | "ok"
  | "test-failed"
  | "spawn-error"
  | "test-terminated";

export type NpmTestProcessOutcome =
  | { readonly kind: "exited"; readonly exitCode: number }
  | { readonly kind: "spawn-error" }
  | { readonly kind: "signaled"; readonly signal: string };

export interface FixedSpawnOptions {
  readonly cwd: string;
  readonly shell: false;
  readonly stdio: "ignore";
}

export interface FixedSpawnResult {
  readonly status: number | null;
  readonly signal: NodeJS.Signals | null;
  readonly error?: Error;
}

export type FixedSpawn = (
  executable: "npm",
  argv: readonly ["test"],
  options: FixedSpawnOptions,
) => FixedSpawnResult;

function nodeSpawn(
  executable: "npm",
  argv: readonly ["test"],
  options: FixedSpawnOptions,
): FixedSpawnResult {
  return spawnSync(executable, [...argv], options);
}

/** Dispatch exactly `npm test` with shell disabled and cwd fixed by T6. */
export function dispatchNpmTest(
  workerRoot: string,
  spawn: FixedSpawn = nodeSpawn,
): NpmTestProcessOutcome {
  let result: FixedSpawnResult;
  try {
    result = spawn(NPM_TEST_DISPATCH.executable, NPM_TEST_DISPATCH.argv, {
      cwd: workerRoot,
      shell: NPM_TEST_DISPATCH.shell,
      stdio: "ignore",
    });
  } catch {
    return { kind: "spawn-error" };
  }
  if (result.error !== undefined) return { kind: "spawn-error" };
  if (result.signal !== null) return { kind: "signaled", signal: result.signal };
  if (typeof result.status === "number") return { kind: "exited", exitCode: result.status };
  return { kind: "spawn-error" };
}

/** Fixed profile mapping; never consults fixture `expectedResult`. */
export function npmTestEvidenceResult(outcome: NpmTestProcessOutcome): NpmTestEvidenceResult {
  if (outcome.kind === "spawn-error") return "spawn-error";
  if (outcome.kind === "signaled") return "test-terminated";
  return outcome.exitCode === 0 ? "ok" : "test-failed";
}

function isInside(root: string, candidate: string): boolean {
  const fromRoot = relative(root, candidate);
  return (
    fromRoot === "" ||
    (!fromRoot.startsWith(`..${sep}`) && fromRoot !== ".." && !isAbsolute(fromRoot))
  );
}

function existingAncestor(candidate: string): string {
  let current = candidate;
  while (!existsSync(current)) {
    const parent = dirname(current);
    if (parent === current) break;
    current = parent;
  }
  return current;
}

/**
 * Resolve a repository-relative target and prove it remains in workerRoot.
 * Existing symlink ancestors and targets are resolved before acceptance.
 */
export function resolveWorkerPath(
  projectRoot: string,
  workerRoot: string,
  target: string,
): string {
  const normalized = target.replace(/\\/g, "/");
  if (
    normalized.length === 0 ||
    normalized.startsWith("/") ||
    normalized.startsWith("//") ||
    /^[A-Za-z]:\//.test(normalized)
  ) {
    throw new Error(`worker jail refused absolute target: ${target}`);
  }
  const segments = normalized.split("/");
  if (segments.includes("..")) {
    throw new Error(`worker jail refused traversal target: ${target}`);
  }

  const rootLexical = resolve(workerRoot);
  const candidate = resolve(projectRoot, normalized);
  if (!isInside(rootLexical, candidate)) {
    throw new Error(`worker jail refused normalized escape: ${target}`);
  }

  const rootReal = realpathSync(rootLexical);
  const ancestorReal = realpathSync(existingAncestor(candidate));
  if (!isInside(rootReal, ancestorReal)) {
    throw new Error(`worker jail refused symlink escape: ${target}`);
  }
  if (existsSync(candidate) && !isInside(rootReal, realpathSync(candidate))) {
    throw new Error(`worker jail refused symlink target escape: ${target}`);
  }
  return candidate;
}

export function repoRead(projectRoot: string, workerRoot: string, target: string): string {
  return readFileSync(resolveWorkerPath(projectRoot, workerRoot, target), "utf8");
}

export function repoWrite(
  projectRoot: string,
  workerRoot: string,
  target: string,
  content: string,
): void {
  const absolute = resolveWorkerPath(projectRoot, workerRoot, target);
  mkdirSync(dirname(absolute), { recursive: true });
  writeFileSync(absolute, content, "utf8");
}
