import { realpathSync, statSync } from "node:fs";
import { inspectContainedFile, readIdentity, sha256, validUtf8, hasExactGitTrackedPath } from "./m4TargetInspection.js";
import type { M4TargetFileIdentity } from "./m4TargetInspection.js";
import type { M4TaskTarget } from "./taskContract.js";

export type { M4ApplyTimeTargetInspection, M4TargetFileIdentity } from "./m4TargetInspection.js";
export { revalidateM4TargetForApply } from "./m4TargetInspection.js";

export interface M4TargetObservation {
  readonly path: string;
  readonly canonicalPath: string;
  readonly identity: M4TargetFileIdentity;
  readonly beforeSha256: string;
}

export type M4TargetSetOutcome =
  | { readonly kind: "validated"; readonly targets: readonly M4TargetObservation[] }
  | { readonly kind: "refused"; readonly reason: string };

export interface M4TargetSetDependencies {
  readonly readFileIdentity?: (path: string) => M4TargetFileIdentity | null;
  readonly hasExactGitTrackedPath?: (root: string, path: string) => boolean;
}

function refused(reason: string): M4TargetSetOutcome {
  return Object.freeze({ kind: "refused" as const, reason });
}

export function validateM4CompleteTargetSet(
  projectRoot: string,
  targets: readonly M4TaskTarget[],
  dependencies: M4TargetSetDependencies = {},
): M4TargetSetOutcome {
  if (targets.length < 2 || targets.length > 5) {
    return refused("target set must contain 2–5 targets");
  }

  let root: string;
  try {
    root = realpathSync(projectRoot);
    if (!statSync(root).isDirectory()) return refused("project root is not a directory");
  } catch {
    return refused("project root cannot be physically resolved");
  }

  const normalizedPaths = new Set<string>();
  for (const target of targets) {
    if (normalizedPaths.has(target.path)) return refused(`duplicate target path ${target.path}`);
    normalizedPaths.add(target.path);
  }

  const canonicalPaths = new Set<string>();
  const identities = new Set<string>();
  const observations: M4TargetObservation[] = [];
  const identityReader = dependencies.readFileIdentity ?? readIdentity;
  const trackedPathProbe = dependencies.hasExactGitTrackedPath ?? hasExactGitTrackedPath;
  for (const target of targets) {
    const file = inspectContainedFile(root, target.path, identityReader);
    if ("kind" in file) return refused(file.reason);
    if (canonicalPaths.has(file.canonicalPath)) {
      return refused(`targets resolve to the same canonical path: ${target.path}`);
    }
    canonicalPaths.add(file.canonicalPath);

    const identityKey = `${String(file.identity.device)}:${String(file.identity.inode)}`;
    if (identities.has(identityKey)) return refused(`targets share a filesystem identity: ${target.path}`);
    identities.add(identityKey);

    if (!validUtf8(file.bytes)) return refused(`target ${target.path} is not valid UTF-8`);
    const beforeSha256 = sha256(file.bytes);
    if (beforeSha256 !== target.expectedBeforeSha256) {
      return refused(`target ${target.path} does not match its expected preimage digest`);
    }
    if (sha256(Buffer.from(target.replacementContent, "utf8")) === beforeSha256) {
      return refused(`target ${target.path} declares a no-op replacement`);
    }
    let tracked: boolean;
    try {
      tracked = trackedPathProbe(root, target.path);
    } catch {
      tracked = false;
    }
    if (!tracked) {
      return refused(`target ${target.path} is not an exact Git-tracked file`);
    }

    observations.push(Object.freeze({
      path: target.path,
      canonicalPath: file.canonicalPath,
      identity: Object.freeze({ device: file.identity.device, inode: file.identity.inode }),
      beforeSha256,
    }));
  }

  return Object.freeze({ kind: "validated" as const, targets: Object.freeze(observations) });
}
