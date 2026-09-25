import {
  chmodSync,
  existsSync,
  readFileSync,
  readdirSync,
  rmSync,
} from "node:fs";
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { readEvidence, type EvidenceReadEntry } from "../../src/evidenceStore.js";
import type { M4T6Project, T6Manager } from "./m4T6AcceptanceProject.js";

export type M4T6RecordEntry = Extract<EvidenceReadEntry, { readonly kind: "record" }>;

export interface M4T6VerificationRun {
  readonly check: string;
  readonly manager: T6Manager;
  readonly userAgent: string;
  readonly lockHeld: boolean;
}

export function readM4T6TaskRecords(project: M4T6Project): readonly M4T6RecordEntry[] {
  return readEvidence(project.root).filter((entry): entry is M4T6RecordEntry =>
    entry.kind === "record" && entry.record.taskId === project.taskId,
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function readM4T6VerificationRuns(project: M4T6Project): readonly M4T6VerificationRun[] {
  const path = join(project.root, ".sureflow/t6-verification.jsonl");
  if (!existsSync(path)) return Object.freeze([]);
  return Object.freeze(readFileSync(path, "utf8").trim().split("\n").filter(Boolean).map((line) => {
    const parsed: unknown = JSON.parse(line);
    if (!isRecord(parsed)) throw new Error("verification log row is malformed");
    const check = parsed["check"];
    const manager = parsed["manager"];
    const userAgent = parsed["userAgent"];
    const lockHeld = parsed["lockHeld"];
    if (typeof check !== "string" || (manager !== "npm" && manager !== "pnpm") || typeof userAgent !== "string" || lockHeld !== true) {
      throw new Error("verification log row is incomplete");
    }
    return Object.freeze({ check, manager, userAgent, lockHeld });
  }));
}

export function m4T6GitPaths(project: M4T6Project): readonly string[] {
  const result = spawnSync("git", ["status", "--porcelain=v1", "-z", "--untracked-files=all"], {
    cwd: project.root,
    encoding: "utf8",
    shell: false,
  });
  if (result.status !== 0) throw new Error("could not read disposable Git status");
  return Object.freeze(result.stdout.split("\0").filter(Boolean).map((entry) => entry.slice(3)).sort());
}

export function m4T6Snapshot(project: M4T6Project): string {
  const rows: string[] = [];
  const visit = (directory: string, prefix: string): void => {
    for (const entry of readdirSync(directory, { withFileTypes: true }).sort((left, right) => left.name.localeCompare(right.name))) {
      if (entry.name === ".git") continue;
      const path = join(directory, entry.name);
      const relativePath = `${prefix}${entry.name}`;
      if (entry.isDirectory()) {
        rows.push(`${relativePath}/`);
        visit(path, `${relativePath}/`);
      } else {
        rows.push(`${relativePath}:${readFileSync(path).toString("base64")}`);
      }
    }
  };
  visit(project.root, "");
  return rows.join("\n");
}

function makeDirectoriesWritable(directory: string): void {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory()) makeDirectoriesWritable(join(directory, entry.name));
  }
  chmodSync(directory, 0o700);
}

export function cleanupM4T6Project(project: M4T6Project): void {
  makeDirectoriesWritable(project.root);
  rmSync(project.root, { recursive: true, force: true });
}
