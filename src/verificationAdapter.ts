/**
 * M2-T3 closed verification profile resolution and dispatch.
 *
 * This adapter owns only the fixed npm command shapes, canonical ordering, and
 * process-result observations. Repository npm scripts remain trusted project
 * code; shell:false constrains Sureflow's direct spawn only.
 */
import { spawn as nodeSpawn } from "node:child_process";
import { isAbsolute, resolve } from "node:path";
import {
  M2_ADAPTER_ID,
  M2_VERIFICATION_PROFILES,
} from "./taskContract.js";
import type {
  M2VerificationProfile,
  ValidatedExecutionPlan,
} from "./taskContract.js";
import type { DetectedNodeTypeScriptProject } from "./projectDetection.js";
import {
  adapterStepArgv,
  isResolvedAdapterContract,
  resolveAdapterContract,
  resolveAdapterContractForIds,
  type ResolvedAdapterContract,
} from "./projectAdapter.js";

export type VerificationArgv =
  | readonly ["run", "typecheck"]
  | readonly ["test"]
  | readonly ["run", "lint"]
  | readonly ["run", "build"];

export interface VerificationStep {
  readonly check: M2VerificationProfile;
  readonly executable: "npm";
  readonly argv: VerificationArgv;
  readonly shell: false;
}

export interface VerificationPlan {
  readonly profile: typeof M2_ADAPTER_ID;
  readonly steps: readonly VerificationStep[];
}

export type VerificationResolutionOutcome =
  | { readonly kind: "resolved"; readonly plan: VerificationPlan }
  | { readonly kind: "unsupported"; readonly missingChecks: readonly M2VerificationProfile[] };

export type VerificationStepResult =
  | { readonly check: M2VerificationProfile; readonly kind: "passed"; readonly exitCode: 0 }
  | { readonly check: M2VerificationProfile; readonly kind: "failed"; readonly exitCode: number }
  | { readonly check: M2VerificationProfile; readonly kind: "spawn-error" }
  | { readonly check: M2VerificationProfile; readonly kind: "terminated"; readonly signal: string };

export interface VerificationSpawnOptions {
  readonly cwd: string;
  readonly shell: false;
  readonly stdio: "ignore";
}

export interface VerificationSpawnedProcess {
  on(event: "error", listener: (error: Error) => void): this;
  on(
    event: "close",
    listener: (exitCode: number | null, signal: NodeJS.Signals | null) => void,
  ): this;
}

export type VerificationSpawn = (
  executable: "npm",
  argv: VerificationArgv,
  options: VerificationSpawnOptions,
) => VerificationSpawnedProcess;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isProfile(value: unknown): value is M2VerificationProfile {
  return (
    typeof value === "string" &&
    M2_VERIFICATION_PROFILES.includes(value as M2VerificationProfile)
  );
}

function readUniqueProfiles(value: unknown): readonly M2VerificationProfile[] | null {
  if (!Array.isArray(value) || value.length === 0 || !value.every(isProfile)) return null;
  const profiles = value;
  if (new Set(profiles).size !== profiles.length) return null;
  return profiles;
}

function unsupported(missingChecks: readonly M2VerificationProfile[]): VerificationResolutionOutcome {
  return Object.freeze({
    kind: "unsupported" as const,
    missingChecks: Object.freeze([...missingChecks]),
  });
}

function isKnownArgv(argv: readonly string[]): argv is VerificationArgv {
  if (argv.length === 1) return argv[0] === "test";
  if (argv.length === 2 && argv[0] === "run") {
    return argv[1] === "typecheck" || argv[1] === "lint" || argv[1] === "build";
  }
  return false;
}

/**
 * Build one verification step from an already-resolved adapter contract.
 * No package-manager branching is permitted here: dispatch comes only from
 * the contract produced by the single resolution seam.
 */
function stepForContract(
  contract: ResolvedAdapterContract,
  check: M2VerificationProfile,
): VerificationStep | null {
  // The contract is trusted here: kernel entry points validate explicit
  // contracts through isResolvedAdapterContract, and internal resolution
  // only produces the closed npm contract. Only the argv shape is
  // re-checked, fail-closed, before spawning.
  const argv = adapterStepArgv(contract, check);
  if (!isKnownArgv(argv)) return null;
  return Object.freeze({ check, executable: "npm", argv, shell: false });
}

function validProject(value: unknown): value is DetectedNodeTypeScriptProject {
  if (!isRecord(value)) return false;
  if (value.adapter !== M2_ADAPTER_ID || typeof value.root !== "string") return false;
  if (!isAbsolute(value.root) || resolve(value.root) !== value.root) return false;
  return readUniqueProfiles(value.supportedChecks) !== null;
}

function validPlan(value: unknown): value is ValidatedExecutionPlan {
  if (!isRecord(value) || value.adapter !== M2_ADAPTER_ID) return false;
  return readUniqueProfiles(value.requiredVerification) !== null;
}

/**
 * Resolve only snapshot-owned profiles into the fixed canonical plan.
 * Steps are derived from the resolved adapter contract, never from
 * caller-supplied dispatch. An explicit contract may be passed by kernel
 * callers that already resolved one; otherwise it is resolved here at the
 * same closed seam with identical observable behavior.
 */
export function resolveVerificationPlan(
  project: DetectedNodeTypeScriptProject,
  plan: ValidatedExecutionPlan,
  adapter?: ResolvedAdapterContract,
): VerificationResolutionOutcome {
  if (!validProject(project) || !validPlan(plan)) return unsupported([]);

  let contract: ResolvedAdapterContract | null = null;
  if (adapter !== undefined) {
    if (isResolvedAdapterContract(adapter)) contract = adapter;
  } else {
    const resolved = resolveAdapterContract(project, plan);
    if (resolved.kind === "resolved") contract = resolved.contract;
  }
  if (contract === null) return unsupported([]);

  const requiredVerification = readUniqueProfiles(plan.requiredVerification);
  const supportedChecks = readUniqueProfiles(project.supportedChecks);
  if (requiredVerification === null || supportedChecks === null) return unsupported([]);

  const missingChecks = requiredVerification.filter((check) => !supportedChecks.includes(check));
  if (missingChecks.length > 0) return unsupported(missingChecks);

  const steps: VerificationStep[] = [];
  for (const check of M2_VERIFICATION_PROFILES) {
    if (!requiredVerification.includes(check)) continue;
    const step = stepForContract(contract, check);
    if (step === null) return unsupported([]);
    steps.push(step);
  }
  return Object.freeze({
    kind: "resolved" as const,
    plan: Object.freeze({
      profile: M2_ADAPTER_ID,
      steps: Object.freeze(steps),
    }),
  });
}

function defaultSpawn(
  executable: "npm",
  argv: VerificationArgv,
  options: VerificationSpawnOptions,
): VerificationSpawnedProcess {
  return nodeSpawn(executable, [...argv], options);
}

function executeStep(
  step: VerificationStep,
  cwd: string,
  spawn: VerificationSpawn,
): Promise<VerificationStepResult> {
  return new Promise((resolveResult) => {
    let settled = false;
    const settle = (result: VerificationStepResult): void => {
      if (settled) return;
      settled = true;
      resolveResult(Object.freeze(result));
    };

    let process: VerificationSpawnedProcess;
    try {
      process = spawn(step.executable, step.argv, {
        cwd,
        shell: step.shell,
        stdio: "ignore",
      });
    } catch {
      settle({ check: step.check, kind: "spawn-error" });
      return;
    }

    process.on("error", () => {
      settle({ check: step.check, kind: "spawn-error" });
    });
    process.on("close", (exitCode, signal) => {
      if (signal !== null) {
        settle({ check: step.check, kind: "terminated", signal });
      } else if (exitCode === 0) {
        settle({ check: step.check, kind: "passed", exitCode: 0 });
      } else if (typeof exitCode === "number") {
        settle({ check: step.check, kind: "failed", exitCode });
      } else {
        settle({ check: step.check, kind: "spawn-error" });
      }
    });
  });
}

/** Execute every resolved step once, in the plan's already-canonical order. */
export async function runVerificationPlan(
  project: DetectedNodeTypeScriptProject,
  plan: VerificationPlan,
  spawn: VerificationSpawn = defaultSpawn,
): Promise<readonly VerificationStepResult[]> {
  if (!validProject(project)) return Object.freeze([]);
  const candidate: unknown = plan;
  if (!isRecord(candidate) || candidate.profile !== M2_ADAPTER_ID || !Array.isArray(candidate.steps)) {
    return Object.freeze([]);
  }
  const requestedChecks = candidate.steps.map((step) =>
    isRecord(step) && isProfile(step.check) ? step.check : null,
  );
  if (requestedChecks.some((check) => check === null)) return Object.freeze([]);
  const checks = requestedChecks as M2VerificationProfile[];
  if (new Set(checks).size !== checks.length || checks.length === 0) {
    return Object.freeze([]);
  }
  const canonicalChecks = M2_VERIFICATION_PROFILES.filter((check) => checks.includes(check));
  if (canonicalChecks.some((check, index) => checks[index] !== check)) {
    return Object.freeze([]);
  }
  const supportedChecks = readUniqueProfiles(project.supportedChecks);
  if (supportedChecks === null || canonicalChecks.some((check) => !supportedChecks.includes(check))) {
    return Object.freeze([]);
  }

  const resolved = resolveAdapterContractForIds(project.adapter, candidate.profile);
  if (resolved.kind !== "resolved") return Object.freeze([]);

  const results: VerificationStepResult[] = [];
  for (const check of canonicalChecks) {
    const step = stepForContract(resolved.contract, check);
    if (step === null) return Object.freeze([]);
    const result = await executeStep(step, project.root, spawn);
    results.push(result);
  }
  return Object.freeze(results);
}
