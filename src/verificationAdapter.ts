/**
 * M2-T3 closed verification profile resolution and dispatch.
 *
 * This adapter owns only the fixed command shapes, canonical ordering, and
 * process-result observations. Repository scripts remain trusted project
 * code; shell:false constrains Sureflow's direct spawn only. The executable
 * always comes from the resolved closed adapter contract, never from
 * caller-supplied dispatch.
 */
import { spawn as nodeSpawn } from "node:child_process";
import { isAbsolute, resolve } from "node:path";
import {
  M2_VERIFICATION_PROFILES,
  M3_ADAPTER_IDS,
} from "./taskContract.js";
import type {
  M2VerificationProfile,
  M3AdapterId,
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
  readonly executable: "npm" | "pnpm";
  readonly argv: VerificationArgv;
  readonly shell: false;
}

export interface VerificationPlan {
  readonly profile: M3AdapterId;
  readonly steps: readonly VerificationStep[];
}

export type VerificationResolutionOutcome =
  | { readonly kind: "resolved"; readonly plan: VerificationPlan }
  | { readonly kind: "unsupported"; readonly missingChecks: readonly M2VerificationProfile[] };

export type VerificationStepResult =
  | { readonly check: M2VerificationProfile; readonly kind: "passed"; readonly exitCode: 0 }
  | { readonly check: M2VerificationProfile; readonly kind: "failed"; readonly exitCode: number }
  | { readonly check: M2VerificationProfile; readonly kind: "spawn-error" }
  | { readonly check: M2VerificationProfile; readonly kind: "terminated"; readonly signal: string }
  | { readonly check: M2VerificationProfile; readonly kind: "timed-out" }
  | {
      readonly check: M2VerificationProfile;
      readonly kind: "interrupted";
      readonly signal: "SIGINT" | "SIGTERM";
  };

export function isValidFailureExitCode(exitCode: number): boolean {
  return Number.isInteger(exitCode) && exitCode >= 1 && exitCode <= 255;
}

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
  /**
   * Terminate the owned direct child, if the spawner owns a live handle.
   * Optional so existing deterministic fakes without a live process keep
   * working; the bounded controller degrades to wait-for-close when absent.
   */
  kill?(signal: NodeJS.Signals): boolean;
}

export type VerificationSpawn = (
  executable: "npm" | "pnpm",
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
 * the contract produced by the single resolution seam. Exported for the
 * bounded execution controller, which reuses the same fail-closed mapping.
 */
export function stepForContract(
  contract: ResolvedAdapterContract,
  check: M2VerificationProfile,
): VerificationStep | null {
  // The contract is trusted here: kernel entry points validate explicit
  // contracts through isResolvedAdapterContract, and internal resolution
  // only produces the closed npm/pnpm contracts. Only the argv shape is
  // re-checked, fail-closed, before spawning.
  const argv = adapterStepArgv(contract, check);
  if (!isKnownArgv(argv)) return null;
  return Object.freeze({ check, executable: contract.executable, argv, shell: false });
}

function isAdapterId(value: unknown): value is M3AdapterId {
  return typeof value === "string" && (M3_ADAPTER_IDS as readonly string[]).includes(value);
}

function validProject(value: unknown): value is DetectedNodeTypeScriptProject {
  if (!isRecord(value)) return false;
  if (!isAdapterId(value.adapter) || typeof value.root !== "string") return false;
  if (!isAbsolute(value.root) || resolve(value.root) !== value.root) return false;
  return readUniqueProfiles(value.supportedChecks) !== null;
}

function validPlan(value: unknown): value is ValidatedExecutionPlan {
  if (!isRecord(value) || !isAdapterId(value.adapter)) return false;
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
      profile: contract.adapterId,
      steps: Object.freeze(steps),
    }),
  });
}

/** Direct child_process spawn behind the VerificationSpawn seam. */
export function defaultSpawn(
  executable: "npm" | "pnpm",
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
      } else if (typeof exitCode === "number" && isValidFailureExitCode(exitCode)) {
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
  const executable = resolveExecutableChecks(project, plan);
  if (executable === null) return Object.freeze([]);

  const results: VerificationStepResult[] = [];
  for (const check of executable.checks) {
    const step = stepForContract(executable.contract, check);
    if (step === null) return Object.freeze([]);
    const result = await executeStep(step, project.root, spawn);
    results.push(result);
  }
  return Object.freeze(results);
}

/**
 * Shared fail-closed validation for executing an already-resolved plan:
 * project shape, plan shape, known/unique/non-empty checks in canonical
 * order, plan support, and closed adapter resolution. Returns the contract
 * plus canonical checks, or null. Used by both the legacy unbounded runner
 * and the bounded execution controller so validation never diverges.
 */
export function resolveExecutableChecks(
  project: DetectedNodeTypeScriptProject,
  plan: VerificationPlan,
): { readonly contract: ResolvedAdapterContract; readonly checks: readonly M2VerificationProfile[] } | null {
  if (!validProject(project)) return null;
  const candidate: unknown = plan;
  if (!isRecord(candidate) || !isAdapterId(candidate.profile) || !Array.isArray(candidate.steps)) {
    return null;
  }
  const requestedChecks = candidate.steps.map((step) =>
    isRecord(step) && isProfile(step.check) ? step.check : null,
  );
  if (requestedChecks.some((check) => check === null)) return null;
  const checks = requestedChecks as M2VerificationProfile[];
  if (new Set(checks).size !== checks.length || checks.length === 0) {
    return null;
  }
  const canonicalChecks = M2_VERIFICATION_PROFILES.filter((check) => checks.includes(check));
  if (canonicalChecks.some((check, index) => checks[index] !== check)) {
    return null;
  }
  const supportedChecks = readUniqueProfiles(project.supportedChecks);
  if (supportedChecks === null || canonicalChecks.some((check) => !supportedChecks.includes(check))) {
    return null;
  }

  const resolved = resolveAdapterContractForIds(project.adapter, candidate.profile);
  if (resolved.kind !== "resolved") return null;
  return { contract: resolved.contract, checks: Object.freeze([...canonicalChecks]) };
}
