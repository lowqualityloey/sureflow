import { spawnSync } from "node:child_process";
import { realpathSync, statSync } from "node:fs";
import { isAbsolute, resolve } from "node:path";
import type { DetectedNodeTypeScriptProject } from "./projectDetection.js";

export const GIT_STATUS_ARGV = Object.freeze([
  "status",
  "--porcelain=v1",
  "-z",
  "--untracked-files=all",
]);

const STATUS_CODES = new Set([" ", "M", "T", "A", "D", "R", "C", "U", "?", "!"]);

export interface GitStatusSpawnOptions {
  readonly cwd: string;
  readonly shell: false;
}

export interface GitStatusObservation {
  readonly status: number | null;
  readonly signal: NodeJS.Signals | null;
  readonly stdout: Buffer;
  readonly error?: Error;
}

export type GitStatusRunner = (
  executable: "git",
  argv: readonly string[],
  options: GitStatusSpawnOptions,
) => GitStatusObservation;

export interface ProjectScopeDependencies {
  readonly gitStatusRunner?: GitStatusRunner;
}

export interface PorcelainStatusEntry {
  readonly paths: readonly string[];
  readonly renameOrCopy: boolean;
}

export type PorcelainParseResult =
  | { readonly kind: "parsed"; readonly entries: readonly PorcelainStatusEntry[] }
  | { readonly kind: "invalid"; readonly reason: string };

export type GitVisibleScopeResult =
  | {
      readonly kind: "ok";
      readonly changedPaths: readonly string[];
      readonly hasProjectRenameOrCopy: boolean;
      readonly hasDuplicateProjectPaths: boolean;
    }
  | { readonly kind: "unavailable" | "invalid"; readonly reason: string };

export function normalizeStatusPath(path: string): string | null {
  if (path.length === 0 || path.startsWith("/") || /^[A-Za-z]:($|\/)/u.test(path)) return null;
  const segments = path.split("/");
  if (segments.some((segment) => segment.length === 0 || segment === "." || segment === "..")) {
    return null;
  }
  return path;
}

function decodePath(bytes: Uint8Array): string | null {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return null;
  }
}

function parseEntryPath(bytes: Uint8Array): string | null {
  const decoded = decodePath(bytes);
  return decoded === null ? null : normalizeStatusPath(decoded);
}

export function parsePorcelainV1Z(output: Uint8Array): PorcelainParseResult {
  const entries: PorcelainStatusEntry[] = [];
  let offset = 0;

  while (offset < output.byteLength) {
    const recordEnd = output.indexOf(0, offset);
    if (recordEnd < 0) {
      return Object.freeze({ kind: "invalid" as const, reason: "Git status output is not NUL-terminated" });
    }

    const record = output.slice(offset, recordEnd);
    if (record.byteLength < 4 || record[2] !== 0x20) {
      return Object.freeze({ kind: "invalid" as const, reason: "Git status record has invalid porcelain structure" });
    }

    const indexStatus = String.fromCharCode(record[0] ?? 0);
    const worktreeStatus = String.fromCharCode(record[1] ?? 0);
    if (!STATUS_CODES.has(indexStatus) || !STATUS_CODES.has(worktreeStatus)) {
      return Object.freeze({ kind: "invalid" as const, reason: "Git status record has an unknown status code" });
    }

    const firstPath = parseEntryPath(record.slice(3));
    if (firstPath === null) {
      return Object.freeze({ kind: "invalid" as const, reason: "Git status record has an invalid path" });
    }

    const renameOrCopy = indexStatus === "R" || indexStatus === "C" || worktreeStatus === "R" || worktreeStatus === "C";
    const paths = [firstPath];
    offset = recordEnd + 1;

    if (renameOrCopy) {
      const secondEnd = output.indexOf(0, offset);
      if (secondEnd < 0) {
        return Object.freeze({ kind: "invalid" as const, reason: "Git rename/copy record is missing its second path" });
      }
      const secondPath = parseEntryPath(output.slice(offset, secondEnd));
      if (secondPath === null) {
        return Object.freeze({ kind: "invalid" as const, reason: "Git rename/copy record has an invalid second path" });
      }
      paths.push(secondPath);
      offset = secondEnd + 1;
    }

    entries.push(Object.freeze({ paths: Object.freeze(paths), renameOrCopy }));
  }

  return Object.freeze({ kind: "parsed" as const, entries: Object.freeze(entries) });
}

function defaultGitStatusRunner(
  executable: "git",
  argv: readonly string[],
  options: GitStatusSpawnOptions,
): GitStatusObservation {
  try {
    const result = spawnSync(executable, [...argv], {
      cwd: options.cwd,
      shell: options.shell,
      stdio: ["ignore", "pipe", "ignore"],
    });
    return {
      status: result.status,
      signal: result.signal,
      stdout: result.stdout,
      ...(result.error === undefined ? {} : { error: result.error }),
    };
  } catch (error: unknown) {
    return {
      status: null,
      signal: null,
      stdout: Buffer.alloc(0),
      error: error instanceof Error ? error : new Error("Git status inspection failed"),
    };
  }
}

function canonicalProjectRoot(project: DetectedNodeTypeScriptProject): string | GitVisibleScopeResult {
  if (typeof project.root !== "string" || !isAbsolute(project.root)) {
    return { kind: "invalid", reason: "detected project root must be absolute" };
  }
  try {
    const lexicalRoot = resolve(project.root);
    if (!statSync(lexicalRoot).isDirectory()) {
      return { kind: "invalid", reason: "detected project root is not a directory" };
    }
    return realpathSync(lexicalRoot);
  } catch {
    return { kind: "unavailable", reason: "detected project root cannot be canonicalized" };
  }
}

function isControlPlanePath(path: string): boolean {
  return path === ".sureflow" || path.startsWith(".sureflow/");
}

function sortedPaths(paths: readonly string[]): readonly string[] {
  return Object.freeze([...new Set(paths)].sort((left, right) => (left < right ? -1 : left > right ? 1 : 0)));
}

export function inspectGitVisibleScope(
  project: DetectedNodeTypeScriptProject,
  dependencies: ProjectScopeDependencies,
): GitVisibleScopeResult {
  const root = canonicalProjectRoot(project);
  if (typeof root !== "string") return root;

  const runner = dependencies.gitStatusRunner ?? defaultGitStatusRunner;
  let observation: GitStatusObservation;
  try {
    observation = runner("git", GIT_STATUS_ARGV, { cwd: root, shell: false });
  } catch {
    return { kind: "unavailable", reason: "Git status inspection failed to start" };
  }
  if (observation.error !== undefined || observation.signal !== null || observation.status !== 0) {
    return { kind: "unavailable", reason: "Git status inspection did not complete successfully" };
  }

  const parsed = parsePorcelainV1Z(observation.stdout);
  if (parsed.kind !== "parsed") return parsed;

  const projectEntries = parsed.entries.filter((entry) =>
    entry.paths.some((path) => !isControlPlanePath(path)),
  );
  const projectPaths = projectEntries.flatMap((entry) =>
    entry.paths.filter((path) => !isControlPlanePath(path)),
  );
  return {
    kind: "ok",
    changedPaths: sortedPaths(projectPaths),
    hasProjectRenameOrCopy: projectEntries.some((entry) => entry.renameOrCopy),
    hasDuplicateProjectPaths: new Set(projectPaths).size !== projectPaths.length,
  };
}
