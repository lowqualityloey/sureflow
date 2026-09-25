import { isAbsolute, join, relative, resolve, sep } from "node:path";
import { lstatSync, readFileSync, realpathSync } from "node:fs";
import type { ResolvedAdapterContract } from "./projectAdapter.js";
import { adapterStepArgv, M3_ADAPTER_CONTRACT_VERSION } from "./projectAdapter.js";
import type { DetectedNodeTypeScriptProject } from "./projectDetection.js";
import { digestResolvedPlanV1, type VerificationInputFingerprints } from "./evidenceV2.js";
import { decidePolicy, type PolicyDecision } from "./policy.js";
import type { ValidatedExecutionPlan } from "./taskContract.js";
import { sha256 } from "./m2RunSupport.js";

export function readBoundInputFile(root: string, relativePath: string, label: string): Uint8Array {
  const normalized = relativePath.replace(/\\/g, "/");
  if (
    normalized.length === 0 ||
    normalized !== relativePath ||
    normalized.startsWith("/") ||
    normalized.includes("..") ||
    normalized.split("/").some((segment) => segment.length === 0 || segment === ".")
  ) {
    throw new Error(`refused: ${label} is not an approved project input path`);
  }
  const lexicalRoot = resolve(root);
  const absolute = join(lexicalRoot, normalized);
  const resolvedAbsolute = resolve(absolute);
  const fromRoot = relative(lexicalRoot, resolvedAbsolute);
  if (fromRoot === ".." || fromRoot.startsWith(`..${sep}`) || isAbsolute(fromRoot)) {
    throw new Error(`refused: ${label} escapes the project root`);
  }

  const canonicalRoot = realpathSync(lexicalRoot);
  const segments = normalized.split("/");
  for (let index = 0; index < segments.length; index += 1) {
    const ancestor = join(lexicalRoot, ...segments.slice(0, index + 1));
    const physicalAncestor = realpathSync(ancestor);
    const physicalRelative = relative(canonicalRoot, physicalAncestor);
    if (
      physicalRelative === ".." ||
      physicalRelative.startsWith(`..${sep}`) ||
      isAbsolute(physicalRelative)
    ) {
      throw new Error(`refused: ${label} escapes the physical project root`);
    }
  }
  if (!lstatSync(absolute).isFile()) {
    throw new Error(`refused: ${label} is not a regular file`);
  }
  const physicalFile = realpathSync(absolute);
  const physicalFileRelative = relative(canonicalRoot, physicalFile);
  if (
    physicalFileRelative === ".." ||
    physicalFileRelative.startsWith(`..${sep}`) ||
    isAbsolute(physicalFileRelative)
  ) {
    throw new Error(`refused: ${label} escapes the physical project root`);
  }
  return new Uint8Array(readFileSync(resolvedAbsolute));
}

export function verificationPlanSteps(
  plan: ValidatedExecutionPlan,
  contract: ResolvedAdapterContract,
): readonly {
  readonly check: ValidatedExecutionPlan["requiredVerification"][number];
  readonly argv: readonly string[];
}[] {
  return plan.requiredVerification.map((check) => ({
    check,
    argv: adapterStepArgv(contract, check),
  }));
}

export function computeVerificationInputBinding(
  project: DetectedNodeTypeScriptProject,
  adapterContract: ResolvedAdapterContract,
  plan: ValidatedExecutionPlan,
): VerificationInputFingerprints {
  const manifestBytes = readBoundInputFile(project.root, "package.json", "package.json");
  const lockfileBytes = readBoundInputFile(project.root, project.lockfilePath, project.lockfilePath);
  const tsconfigBytes = readBoundInputFile(project.root, "tsconfig.json", "tsconfig.json");
  const planDigest = digestResolvedPlanV1({
    adapterId: adapterContract.adapterId,
    adapterContractVersion: M3_ADAPTER_CONTRACT_VERSION,
    executable: adapterContract.executable,
    cwdRole: adapterContract.cwdRole,
    steps: verificationPlanSteps(plan, adapterContract).map((step) => ({
      check: step.check,
      argv: step.argv,
    })),
  });
  return Object.freeze({
    manifestPath: "package.json" as const,
    manifestSha256: sha256(manifestBytes),
    lockfilePath: project.lockfilePath,
    lockfileSha256: sha256(lockfileBytes),
    tsconfigPath: "tsconfig.json" as const,
    tsconfigSha256: sha256(tsconfigBytes),
    planDigest,
  });
}

export function allPolicyDecisions(
  policy: Parameters<typeof decidePolicy>[0],
): Readonly<Record<string, PolicyDecision>> {
  return Object.freeze({
    "repo.read": decidePolicy(policy, "repo.read"),
    "repo.write": decidePolicy(policy, "repo.write"),
    "repo.verify": decidePolicy(policy, "repo.verify"),
  });
}

export function blockedCapability(decisions: Readonly<Record<string, PolicyDecision>>): string | null {
  return (["repo.read", "repo.write", "repo.verify"] as const).find(
    (capability) => decisions[capability] !== "ALLOW",
  ) ?? null;
}
