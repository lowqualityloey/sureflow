import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { lstatSync, readFileSync, realpathSync, statSync } from "node:fs";
import { isAbsolute, join, relative, resolve, sep } from "node:path";
import { TextDecoder } from "node:util";
import type { M4TaskTarget } from "./taskContract.js";
import type { M4TargetObservation, M4TargetSetDependencies } from "./completeTargetSet.js";

export interface M4TargetFileIdentity {
  readonly device: bigint;
  readonly inode: bigint;
}

type InspectedFile = {
  readonly absolutePath: string;
  readonly canonicalPath: string;
  readonly bytes: Buffer;
  readonly identity: M4TargetFileIdentity;
  readonly mode: number;
};

type InspectionFailure = {
  readonly kind: "inspection-failed";
  readonly code: "target-invalid" | "identity-changed";
  readonly reason: string;
};

export type M4ApplyTimeTargetInspection =
  | {
      readonly kind: "eligible";
      readonly absolutePath: string;
      readonly mode: number;
      readonly beforeSha256: string;
    }
  | {
      readonly kind: "refused";
      readonly code: "stale-preimage" | "target-invalid" | "identity-changed" | "trackedness-lost";
      readonly reason: string;
    };

function inspectionFailure(
  code: InspectionFailure["code"],
  reason: string,
): InspectionFailure {
  return { kind: "inspection-failed", code, reason };
}

function refusedAtApply(
  code: Exclude<M4ApplyTimeTargetInspection, { readonly kind: "eligible" }>["code"],
  reason: string,
): M4ApplyTimeTargetInspection {
  return Object.freeze({ kind: "refused" as const, code, reason });
}

function isWithin(root: string, candidate: string): boolean {
  const fromRoot = relative(root, candidate);
  return fromRoot === "" ||
    (!fromRoot.startsWith(`..${sep}`) && fromRoot !== ".." && !fromRoot.startsWith(sep));
}

function validTargetPath(path: string): boolean {
  const segments = path.split("/");
  return path.length > 0 &&
    !path.includes("\\") &&
    !path.includes("\u0000") &&
    !isAbsolute(path) &&
    !/^[A-Za-z]:($|\/)/u.test(path) &&
    segments.every((segment) => segment.length > 0 && segment !== "." && segment !== "..") &&
    !segments.includes(".git") &&
    !segments.includes(".sureflow");
}

export function readIdentity(path: string): M4TargetFileIdentity | null {
  try {
    const file = statSync(path, { bigint: true });
    if (!file.isFile() || file.dev < 0n || file.ino <= 0n) return null;
    return Object.freeze({ device: file.dev, inode: file.ino });
  } catch {
    return null;
  }
}

export function inspectContainedFile(
  root: string,
  path: string,
  readFileIdentity: (path: string) => M4TargetFileIdentity | null,
): InspectedFile | InspectionFailure {
  if (!validTargetPath(path)) {
    return inspectionFailure("target-invalid", `target ${path} is not a normalized allowed path`);
  }
  const lexicalPath = resolve(root, path);
  if (!isWithin(root, lexicalPath)) {
    return inspectionFailure("target-invalid", `target ${path} escapes the project root`);
  }

  const segments = path.split("/");
  for (let index = 0; index < segments.length; index += 1) {
    const ancestor = join(root, ...segments.slice(0, index + 1));
    try {
      lstatSync(ancestor);
    } catch {
      return inspectionFailure("target-invalid", `target ${path} is missing or cannot be inspected`);
    }
    try {
      if (!isWithin(root, realpathSync(ancestor))) {
        return inspectionFailure("target-invalid", `target ${path} escapes the project root through a symlink`);
      }
    } catch {
      return inspectionFailure("target-invalid", `target ${path} cannot be physically resolved`);
    }
  }

  let mode: number;
  try {
    const targetStat = lstatSync(lexicalPath);
    if (!targetStat.isFile()) {
      return inspectionFailure("target-invalid", `target ${path} must be a regular file`);
    }
    mode = targetStat.mode & 0o7777;
  } catch {
    return inspectionFailure("target-invalid", `target ${path} is missing or cannot be inspected`);
  }

  let canonicalPath: string;
  try {
    canonicalPath = realpathSync(lexicalPath);
  } catch {
    return inspectionFailure("target-invalid", `target ${path} cannot be physically resolved`);
  }
  if (!isWithin(root, canonicalPath)) {
    return inspectionFailure("target-invalid", `target ${path} escapes the project root`);
  }

  let identity: M4TargetFileIdentity | null;
  try {
    identity = readFileIdentity(canonicalPath);
  } catch {
    return inspectionFailure("identity-changed", `target ${path} has no usable filesystem identity`);
  }
  if (identity === null || identity.device < 0n || identity.inode <= 0n) {
    return inspectionFailure("identity-changed", `target ${path} has no usable filesystem identity`);
  }
  try {
    return { absolutePath: lexicalPath, canonicalPath, bytes: readFileSync(lexicalPath), identity, mode };
  } catch {
    return inspectionFailure("target-invalid", `target ${path} cannot be read`);
  }
}

export function validUtf8(bytes: Uint8Array): boolean {
  try {
    new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    return true;
  } catch {
    return false;
  }
}

export function sha256(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

export function hasExactGitTrackedPath(root: string, path: string): boolean {
  try {
    const result = spawnSync(
      "git",
      ["--literal-pathspecs", "ls-files", "-z", "--error-unmatch", "--", path],
      { cwd: root, shell: false, stdio: ["ignore", "pipe", "ignore"] },
    );
    return result.error === undefined &&
      result.status === 0 &&
      result.signal === null &&
      Buffer.isBuffer(result.stdout) &&
      result.stdout.equals(Buffer.from(`${path}\u0000`, "utf8"));
  } catch {
    return false;
  }
}

export function revalidateM4TargetForApply(
  projectRoot: string,
  target: M4TaskTarget,
  frozenObservation: M4TargetObservation,
  dependencies: M4TargetSetDependencies = {},
): M4ApplyTimeTargetInspection {
  if (target.path !== frozenObservation.path) {
    return refusedAtApply("target-invalid", "target path is not bound to its eligible observation");
  }
  if (target.expectedBeforeSha256 !== frozenObservation.beforeSha256) {
    return refusedAtApply("stale-preimage", "plan preimage differs from its eligible observation");
  }

  let root: string;
  try {
    root = realpathSync(projectRoot);
    if (!statSync(root).isDirectory()) {
      return refusedAtApply("target-invalid", "project root is not a directory");
    }
  } catch {
    return refusedAtApply("target-invalid", "project root cannot be physically resolved");
  }

  const file = inspectContainedFile(root, target.path, dependencies.readFileIdentity ?? readIdentity);
  if ("kind" in file) return refusedAtApply(file.code, file.reason);
  if (
    file.canonicalPath !== frozenObservation.canonicalPath ||
    file.identity.device !== frozenObservation.identity.device ||
    file.identity.inode !== frozenObservation.identity.inode
  ) {
    return refusedAtApply("identity-changed", `target ${target.path} no longer matches its frozen identity`);
  }
  if (!validUtf8(file.bytes)) {
    return refusedAtApply("target-invalid", `target ${target.path} is not valid UTF-8`);
  }

  const beforeSha256 = sha256(file.bytes);
  if (beforeSha256 !== target.expectedBeforeSha256 || beforeSha256 !== frozenObservation.beforeSha256) {
    return refusedAtApply("stale-preimage", `target ${target.path} no longer matches its frozen preimage`);
  }
  if (sha256(Buffer.from(target.replacementContent, "utf8")) === beforeSha256) {
    return refusedAtApply("target-invalid", `target ${target.path} declares a no-op replacement`);
  }

  let tracked: boolean;
  try {
    tracked = (dependencies.hasExactGitTrackedPath ?? hasExactGitTrackedPath)(root, target.path);
  } catch {
    tracked = false;
  }
  if (!tracked) {
    return refusedAtApply("trackedness-lost", `target ${target.path} is no longer an exact Git-tracked file`);
  }

  return Object.freeze({
    kind: "eligible" as const,
    absolutePath: file.absolutePath,
    mode: file.mode,
    beforeSha256,
  });
}
