/**
 * M2-T2 structural detection for the supported Node/TypeScript shapes.
 *
 * Two closed shapes are supported: unambiguous npm (package-lock.json) and
 * the narrow pnpm shape (pManifest non-empty pnpm-lock.yaml, no
 * package-lock.json, no workspace markers, agreeing packageManager claim).
 * Conflicting manager evidence fails closed as unsupported/ineligible.
 *
 * Detection reads project evidence only. It does not execute npm, pnpm,
 * project scripts, TypeScript, Git, or any later M2 orchestration.
 */
import {
  lstatSync,
  readFileSync,
  realpathSync,
  statSync,
} from "node:fs";
import { isAbsolute, join, relative, resolve, sep } from "node:path";
import {
  M2_VERIFICATION_PROFILES,
  M3_ADAPTER_IDS,
  M3_PNPM_ADAPTER_ID,
} from "./taskContract.js";
import type {
  M2VerificationProfile,
  M3AdapterId,
  ValidatedExecutionPlan,
} from "./taskContract.js";

// allow: SIZE_OK — one closed read-only project-shape detector owns npm/pnpm evidence; target-set checks live separately.

export type ProjectDetectionRequest = Pick<
  ValidatedExecutionPlan,
  "adapter" | "requiredVerification" | "targetPath"
>;

export interface DetectedNodeTypeScriptProject {
  readonly adapter: M3AdapterId;
  readonly root: string;
  readonly manifestPath: "package.json";
  readonly lockfilePath: "package-lock.json" | "pnpm-lock.yaml";
  readonly tsconfigPath: "tsconfig.json";
  readonly targetPath: string;
  readonly supportedChecks: readonly M2VerificationProfile[];
}

export type ProjectDetectionOutcome =
  | { readonly kind: "supported"; readonly project: DetectedNodeTypeScriptProject }
  | { readonly kind: "unsupported"; readonly reason: string }
  | { readonly kind: "invalid"; readonly reason: string };

interface ExistingFile {
  readonly path: string;
  readonly bytes: Uint8Array;
}

type ParsedJsonObject =
  | { readonly ok: true; readonly value: Record<string, unknown> }
  | { readonly ok: false; readonly outcome: ProjectDetectionOutcome };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isWithin(root: string, candidate: string): boolean {
  const fromRoot = relative(root, candidate);
  return (
    fromRoot === "" ||
    (!fromRoot.startsWith(`..${sep}`) && fromRoot !== ".." && !fromRoot.startsWith(sep))
  );
}

function isMissing(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT";
}

function unsupported(reason: string): ProjectDetectionOutcome {
  return Object.freeze({ kind: "unsupported" as const, reason });
}

function invalid(reason: string): ProjectDetectionOutcome {
  return Object.freeze({ kind: "invalid" as const, reason });
}

function canonicalProjectRoot(rootDir: string): string | ProjectDetectionOutcome {
  const lexicalRoot = resolve(rootDir);
  try {
    if (!statSync(lexicalRoot).isDirectory()) {
      return unsupported("repository root is not a directory");
    }
    return realpathSync(lexicalRoot);
  } catch (error: unknown) {
    if (isMissing(error)) return unsupported("repository root is missing");
    return unsupported("repository root cannot be resolved");
  }
}

function validateRelativePath(relativePath: string, label: string): string | ProjectDetectionOutcome {
  const normalized = relativePath.replace(/\\/g, "/");
  const segments = normalized.split("/");
  if (
    normalized.length === 0 ||
    normalized !== relativePath ||
    isAbsolute(normalized) ||
    /^[A-Za-z]:($|\/)/u.test(normalized) ||
    segments.some((segment) => segment.length === 0 || segment === "." || segment === "..")
  ) {
    return unsupported(`${label} must be a normalized repository-relative path`);
  }
  if (segments.includes(".git") || segments.includes(".sureflow")) {
    return unsupported(`${label} cannot address control-plane data`);
  }
  return normalized;
}

function resolveContainedFile(
  root: string,
  relativePath: string,
  label: string,
): ExistingFile | ProjectDetectionOutcome {
  const validatedPath = validateRelativePath(relativePath, label);
  if (typeof validatedPath !== "string") return validatedPath;

  const lexicalPath = resolve(root, validatedPath);
  if (!isWithin(root, lexicalPath)) {
    return unsupported(`${label} escapes the project root`);
  }

  const segments = validatedPath.split("/");
  for (let index = 0; index < segments.length; index += 1) {
    const ancestor = join(root, ...segments.slice(0, index + 1));
    try {
      lstatSync(ancestor);
    } catch (error: unknown) {
      if (isMissing(error)) return unsupported(`${label} is missing`);
      return unsupported(`${label} cannot be inspected`);
    }

    let physicalAncestor: string;
    try {
      physicalAncestor = realpathSync(ancestor);
    } catch {
      return unsupported(`${label} cannot be resolved`);
    }
    if (!isWithin(root, physicalAncestor)) {
      return unsupported(`${label} escapes the project root through a symlink`);
    }
  }

  let finalStat: ReturnType<typeof lstatSync>;
  try {
    finalStat = lstatSync(lexicalPath);
  } catch (error: unknown) {
    if (isMissing(error)) return unsupported(`${label} is missing`);
    return unsupported(`${label} cannot be inspected`);
  }
  if (!finalStat.isFile()) return unsupported(`${label} must be a regular file`);

  try {
    return { path: lexicalPath, bytes: readFileSync(lexicalPath) };
  } catch {
    return unsupported(`${label} cannot be read`);
  }
}

function decodeUtf8(file: ExistingFile, label: string): string | ProjectDetectionOutcome {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(file.bytes);
  } catch {
    return invalid(`${label} is not valid UTF-8`);
  }
}

function parseJsonObject(text: string, label: string): ParsedJsonObject {
  let value: unknown;
  try {
    value = JSON.parse(text) as unknown;
  } catch {
    return { ok: false, outcome: invalid(`${label} is malformed JSON`) };
  }
  if (!isRecord(value)) {
    return { ok: false, outcome: invalid(`${label} must have an object top level`) };
  }
  return { ok: true, value };
}

function checkPlanAuthority(plan: ProjectDetectionRequest): ProjectDetectionOutcome | null {
  const adapter = isRecord(plan) && typeof plan.adapter === "string" ? plan.adapter : undefined;
  if (adapter === undefined || !(M3_ADAPTER_IDS as readonly string[]).includes(adapter)) {
    return unsupported("task plan selects an unsupported adapter");
  }
  if (
    plan.requiredVerification.length === 0 ||
    plan.requiredVerification.some(
      (check, index, checks) =>
        !M2_VERIFICATION_PROFILES.includes(check) || checks.indexOf(check) !== index,
    )
  ) {
    return invalid("task plan contains an invalid or duplicate verification profile");
  }
  return null;
}

type LockManager = "npm" | "pnpm";

function managerForAdapter(adapter: M3AdapterId): LockManager {
  return adapter === M3_PNPM_ADAPTER_ID ? "pnpm" : "npm";
}

/**
 * Presence probe for one contained lockfile. A contained regular file counts
 * as present; a missing path counts as absent; any other state (escape,
 * unreadable, non-file) fails closed with its outcome.
 */
function probeContainedFile(
  root: string,
  relativePath: string,
  label: string,
): "present" | "absent" | ProjectDetectionOutcome {
  const resolved = resolveContainedFile(root, relativePath, label);
  if ("bytes" in resolved) return "present";
  if (resolved.kind === "unsupported" && resolved.reason.endsWith("is missing")) return "absent";
  return resolved;
}

/**
 * Read the package.json packageManager agreement claim, if present.
 * Returns the claimed manager, null when absent, or a fail-closed outcome
 * for malformed or unsupported values.
 */
function readPackageManagerClaim(
  packageJson: Record<string, unknown>,
): LockManager | null | ProjectDetectionOutcome {
  if (!("packageManager" in packageJson)) return null;
  const claim = packageJson.packageManager;
  if (typeof claim !== "string" || !/^(npm|pnpm)@\S+$/u.test(claim)) {
    return unsupported("package.json packageManager is unsupported");
  }
  return claim.startsWith("pnpm@") ? "pnpm" : "npm";
}

/** Detect one supported project shape without executing any project code. */
export function detectProject(
  rootDir: string,
  plan: ProjectDetectionRequest,
): ProjectDetectionOutcome {
  const authorityFailure = checkPlanAuthority(plan);
  if (authorityFailure !== null) return authorityFailure;

  const root = canonicalProjectRoot(rootDir);
  if (typeof root !== "string") return root;

  const manifest = resolveContainedFile(root, "package.json", "package.json");
  if (!("bytes" in manifest)) return manifest;
  const manifestText = decodeUtf8(manifest, "package.json");
  if (typeof manifestText !== "string") return manifestText;
  const parsedPackage = parseJsonObject(manifestText, "package.json");
  if (!parsedPackage.ok) return parsedPackage.outcome;
  const packageJson = parsedPackage.value;
  if (!("scripts" in packageJson)) return unsupported("package.json has no npm scripts");
  if (!isRecord(packageJson.scripts)) {
    return invalid("package.json scripts must be an object");
  }
  if ("type" in packageJson && packageJson.type !== "module" && packageJson.type !== "commonjs") {
    return unsupported("package.json has an unsupported Node module type");
  }
  if ("workspaces" in packageJson) {
    return unsupported("package.json workspaces are unsupported in M3");
  }
  const selectedManager = managerForAdapter(plan.adapter);

  const npmLock = probeContainedFile(root, "package-lock.json", "package-lock.json");
  if (typeof npmLock !== "string") return npmLock;
  const pnpmLock = probeContainedFile(root, "pnpm-lock.yaml", "pnpm-lock.yaml");
  if (typeof pnpmLock !== "string") return pnpmLock;
  const workspaceMarker = probeContainedFile(root, "pnpm-workspace.yaml", "pnpm-workspace.yaml");
  if (typeof workspaceMarker !== "string") return workspaceMarker;
  if (workspaceMarker === "present") {
    return unsupported("pnpm-workspace.yaml is present: workspaces are unsupported in M3");
  }
  if (npmLock === "present" && pnpmLock === "present") {
    return unsupported(
      "conflicting package-manager evidence: package-lock.json and pnpm-lock.yaml are both present",
    );
  }
  const managerClaim = readPackageManagerClaim(packageJson);
  if (managerClaim !== null && typeof managerClaim === "object") return managerClaim;
  if (managerClaim !== null && managerClaim !== selectedManager) {
    return unsupported(
      `package.json packageManager agrees with ${managerClaim} but the task selects ${selectedManager}`,
    );
  }

  let lockfilePath: "package-lock.json" | "pnpm-lock.yaml";
  if (selectedManager === "pnpm") {
    if (pnpmLock === "absent") return unsupported("pnpm-lock.yaml is missing");
    const lockfile = resolveContainedFile(root, "pnpm-lock.yaml", "pnpm-lock.yaml");
    if (!("bytes" in lockfile)) return lockfile;
    const lockfileText = decodeUtf8(lockfile, "pnpm-lock.yaml");
    if (typeof lockfileText !== "string") return lockfileText;
    if (lockfileText.trim().length === 0) return unsupported("pnpm-lock.yaml is empty");
    lockfilePath = "pnpm-lock.yaml";
  } else {
    const lockfile = resolveContainedFile(root, "package-lock.json", "package-lock.json");
    if (!("bytes" in lockfile)) return lockfile;
    const lockfileText = decodeUtf8(lockfile, "package-lock.json");
    if (typeof lockfileText !== "string") return lockfileText;
    if (lockfileText.trim().length === 0) return unsupported("package-lock.json is empty");
    const parsedLockfile = parseJsonObject(lockfileText, "package-lock.json");
    if (!parsedLockfile.ok) return parsedLockfile.outcome;
    lockfilePath = "package-lock.json";
  }

  const tsconfig = resolveContainedFile(root, "tsconfig.json", "tsconfig.json");
  if (!("bytes" in tsconfig)) return tsconfig;
  const tsconfigText = decodeUtf8(tsconfig, "tsconfig.json");
  if (typeof tsconfigText !== "string") return tsconfigText;
  if (tsconfigText.trim().length === 0) return unsupported("tsconfig.json is empty");

  const target = resolveContainedFile(root, plan.targetPath, "task target");
  if (!("bytes" in target)) return target;
  const targetText = decodeUtf8(target, "task target");
  if (typeof targetText !== "string") return targetText;

  const scripts = packageJson.scripts;
  const missingChecks = plan.requiredVerification.filter(
    (check) => typeof scripts[check] !== "string" || scripts[check].trim().length === 0,
  );
  if (missingChecks.length > 0) {
    return unsupported(
      `package.json is missing required ${selectedManager} scripts: ${missingChecks.join(", ")}`,
    );
  }

  return Object.freeze({
    kind: "supported" as const,
    project: Object.freeze({
      adapter: plan.adapter,
      root,
      manifestPath: "package.json" as const,
      lockfilePath,
      tsconfigPath: "tsconfig.json" as const,
      targetPath: plan.targetPath,
      supportedChecks: Object.freeze([...plan.requiredVerification]),
    }),
  });
}
