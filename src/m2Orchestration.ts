/**
 * M2-T7 integration over the accepted T1-T6 modules.
 *
 * This is the one real-project orchestration path. T0 remains available as a
 * compatibility adapter in runTask.ts and verifyTask.ts; it does not get a
 * second lock, state, evidence, policy, or verifier implementation here.
 */
import { createHash } from "node:crypto";
import { existsSync, lstatSync, readFileSync, realpathSync } from "node:fs";
import { isAbsolute, join, relative, resolve, sep } from "node:path";
import {
  applyBoundedReplacement,
  validateBoundedReplacement,
  type BoundedReplacementOutcome,
  type ReplacementPreflight,
} from "./boundedReplacement.js";
import {
  appendEvidence,
  appendEvidenceV2,
  readEvidence,
  type EvidenceReadEntry,
} from "./evidenceStore.js";
import { defaultEvidencePath } from "./evidencePaths.js";
import { appendExecutionEvent } from "./eventStore.js";
import {
  acquireMutationLock,
  MutationLockBusyError,
  MutationLockReleaseError,
  releaseMutationLock,
} from "./mutationLock.js";
import { decidePolicy, type PolicyDecision } from "./policy.js";
import { loadPolicy } from "./policyStore.js";
import { detectProject, type DetectedNodeTypeScriptProject } from "./projectDetection.js";
import type { ResolvedAdapterContract } from "./projectAdapter.js";
import { verifyProjectChange } from "./projectChangeVerifier.js";
import {
  inspectPostWriteScope,
  inspectProjectBaseline,
  type ProjectBaselineResult,
  type ScopeComplianceResult,
} from "./projectScope.js";
import { readRuntimeState } from "./stateReader.js";
import type { TaskStatus } from "./state.js";
import {
  beginTask,
  taskStateExists,
  transitionTask,
} from "./taskStateStore.js";
import {
  loadValidatedExecutionPlan,
  M2_TASK_CONTRACT_RELATIVE_PATH,
  type ValidatedExecutionPlan,
} from "./taskContract.js";
import { resolveSureflowPath } from "./sureflowPaths.js";
import {
  resolveVerificationPlan,
  runVerificationPlan,
  type VerificationPlan,
  type VerificationSpawn,
  type VerificationStepResult,
} from "./verificationAdapter.js";
import type { VerificationVerdict } from "./verdicts.js";
import {
  runBoundedVerificationPlan,
  terminalCauseForResult,
  verificationResultText,
  type InterruptionSource,
  type VerificationClock,
} from "./verificationExecution.js";
import {
  VERIFICATION_INPUT_BINDING_PROVENANCE,
  VERIFICATION_INPUT_BINDING_TARGET,
  createExecutionContextV2,
  digestInputBindingV1,
  digestResolvedPlanV1,
  encodeExecutionProvenanceV2,
  encodeInputBindingV1,
  type M3TerminalCause,
  type VerificationInputFingerprints,
} from "./evidenceV2.js";
import {
  adapterStepArgv,
  M3_ADAPTER_CONTRACT_VERSION,
  resolveAdapterContract,
} from "./projectAdapter.js";
import { toPersistedRecordV2 } from "./redaction.js";

const ACTOR = "worker:m2" as const;
const CONTRACT_PROVENANCE = "control-plane-task-input" as const;
const REPLACEMENT_PROVENANCE = "bounded existing-file replacement" as const;
const SCOPE_PROVENANCE = "git-visible project scope" as const;

type M2VerificationVerdict = Exclude<VerificationVerdict, "BLOCKED">;

export type M2RunPhase =
  | "plan-loaded"
  | "project-detected"
  | "verification-resolved"
  | "baseline-captured"
  | "replacement-preflighted"
  | "task-running"
  | "replacement-applied"
  | "verification-complete"
  | "contract-rechecked"
  | "scope-captured"
  | "evidence-appended"
  | "verdict-computed";

export interface M2RunTaskRequest {
  readonly rootDir: string;
  readonly requestedTaskId: string;
}

export interface M2RunTaskDependencies {
  readonly nowIso?: () => string;
  readonly onPhase?: (phase: M2RunPhase) => void | Promise<void>;
  readonly verificationSpawn?: VerificationSpawn;
  readonly verificationClock?: VerificationClock;
  readonly verificationInterruption?: InterruptionSource;
  readonly runVerification?: typeof runVerificationPlan;
}

export interface M2RunTaskOutcome {
  readonly kind: "accepted" | "halted";
  readonly taskId: string | null;
  readonly verdict: M2VerificationVerdict | null;
  readonly policyDecisions: Readonly<Record<string, PolicyDecision>>;
  readonly transitions: readonly TaskStatus[];
  readonly verificationResults: readonly VerificationStepResult[];
  readonly reason: string;
}

export interface M2VerifyTaskRequest {
  readonly rootDir: string;
  readonly requestedTaskId: string;
}

export interface M2VerifyTaskDependencies {
  readonly nowIso?: () => string;
  readonly verify?: typeof verifyProjectChange;
}

export interface M2VerifyTaskOutcome {
  readonly kind: "verified" | "halted";
  readonly taskId: string | null;
  readonly verdict: M2VerificationVerdict | null;
  readonly stateStatus: TaskStatus | null;
  readonly stateTransition: "none" | "halted";
  readonly reason: string;
}

function emptyPolicyDecisions(): Readonly<Record<string, PolicyDecision>> {
  return Object.freeze({});
}

function haltedRun(
  reason: string,
  values: Partial<Omit<M2RunTaskOutcome, "kind" | "reason">> = {},
): M2RunTaskOutcome {
  return {
    kind: "halted",
    taskId: values.taskId ?? null,
    verdict: values.verdict ?? null,
    policyDecisions: values.policyDecisions ?? emptyPolicyDecisions(),
    transitions: values.transitions ?? Object.freeze([]),
    verificationResults: values.verificationResults ?? Object.freeze([]),
    reason,
  };
}

function haltedVerify(
  reason: string,
  values: Partial<Omit<M2VerifyTaskOutcome, "kind" | "reason">> = {},
): M2VerifyTaskOutcome {
  return {
    kind: "halted",
    taskId: values.taskId ?? null,
    verdict: values.verdict ?? null,
    stateStatus: values.stateStatus ?? null,
    stateTransition: values.stateTransition ?? "none",
    reason,
  };
}

function sha256(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function m2Verdict(verdict: VerificationVerdict): M2VerificationVerdict {
  if (verdict === "BLOCKED") throw new Error("T6 emitted an unsupported BLOCKED verdict");
  return verdict;
}

/** Route only an existing canonical task contract to M2. */
export function hasM2TaskContract(rootDir: string): boolean {
  try {
    return existsSync(resolveSureflowPath(rootDir, M2_TASK_CONTRACT_RELATIVE_PATH));
  } catch {
    // A present but physically unsafe control-plane path must not fall back to
    // T0. The M2 loader will return the controlled halt reason.
    return existsSync(join(rootDir, M2_TASK_CONTRACT_RELATIVE_PATH));
  }
}

async function phase(
  dependencies: M2RunTaskDependencies,
  value: M2RunPhase,
): Promise<void> {
  await dependencies.onPhase?.(value);
}

function persistEvent(
  rootDir: string,
  taskId: string,
  capability: string,
  policyDecision: PolicyDecision,
  target: string,
  result: string,
  recordedAt: string,
): void {
  try {
    appendExecutionEvent(rootDir, {
      actor: ACTOR,
      recordedAt,
      taskId,
      capability,
      policyDecision,
      target,
      result,
      provenance: "M2 orchestration observation",
    });
  } catch {
    // Events are diagnostic only. A failed event append must not become a
    // fabricated acceptance or replace the authoritative state/evidence path.
  }
}

function readExistingEvidenceForReplay(
  rootDir: string,
  taskId: string,
): { readonly kind: "ok"; readonly entries: readonly EvidenceReadEntry[] } | { readonly kind: "halted"; readonly reason: string } {
  if (!existsSync(defaultEvidencePath(rootDir))) {
    return { kind: "ok", entries: Object.freeze([]) };
  }
  const entries = readEvidence(rootDir);
  if (entries.some((entry) => entry.kind === "corrupt")) {
    return {
      kind: "halted",
      reason: "existing evidence is corrupt or unreadable; replay is refused",
    };
  }
  if (entries.some((entry) => entry.kind === "record" && entry.record.taskId === taskId)) {
    return {
      kind: "halted",
      reason: "terminal evidence already exists for the requested task",
    };
  }
  return { kind: "ok", entries };
}

function contractEvidenceResult(plan: ValidatedExecutionPlan): string {
  return `sha256:${plan.contractSha256};provenance=${CONTRACT_PROVENANCE}`;
}

function scopeEvidenceResult(scope: ScopeComplianceResult): string {
  if (scope.kind === "compliant") return "compliant";
  if (scope.kind === "violation") {
    const paths = scope.unauthorizedPaths.join(",");
    return `violation:${paths.length > 0 ? paths : scope.reason}`;
  }
  return `${scope.kind}:${scope.reason}`;
}

/**
 * Narrow production adapter: map process SIGINT/SIGTERM into the bounded
 * controller's interruption interface. Subscription installs the listeners;
 * unsubscribing removes them, so they exist only for the owned execution
 * window. Test seams inject a synthetic InterruptionSource instead.
 */
export function processInterruptionSource(): InterruptionSource {
  return {
    subscribe: (listener) => {
      const onSigint = (): void => {
        listener("SIGINT");
      };
      const onSigterm = (): void => {
        listener("SIGTERM");
      };
      process.on("SIGINT", onSigint);
      process.on("SIGTERM", onSigterm);
      return () => {
        process.removeListener("SIGINT", onSigint);
        process.removeListener("SIGTERM", onSigterm);
      };
    },
  };
}

function readContractDigest(rootDir: string, plan: ValidatedExecutionPlan): string | null {
  try {
    const bytes = readFileSync(resolveSureflowPath(rootDir, M2_TASK_CONTRACT_RELATIVE_PATH));
    const observed = sha256(bytes);
    return observed === plan.contractSha256
      ? contractEvidenceResult(plan)
      : `integrity-mismatch:${observed}`;
  } catch {
    return null;
  }
}

function transitionHalted(
  rootDir: string,
  taskId: string,
  nowIso: () => string,
  transitions: TaskStatus[],
): string | null {
  try {
    transitionTask(rootDir, taskId, "halted", nowIso());
    transitions.push("halted");
    return null;
  } catch {
    return "could not persist halted authoritative task state";
  }
}

/**
 * Read one already-detected project input file for the T3 input binding.
 * Uses the detected project's canonical root plus strict fixed relative
 * names only — never caller paths — and hard-fails on unreadable bytes so
 * verification never spawns against unbound inputs.
 */
function readBoundInputFile(root: string, relativePath: string, label: string): Uint8Array {
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
  const bytes = readFileSync(resolvedAbsolute);
  return new Uint8Array(bytes);
}

/**
 * Compute the M3-T3 input binding immediately before the first verification
 * spawn: SHA-256 fingerprints of the exact detected manifest, lockfile, and
 * tsconfig bytes, plus the deterministic resolved-plan digest. Fails closed
 * when any input cannot be safely read.
 */
function computeVerificationInputBinding(
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

/**
 * Canonical ordered verification steps for the binding plan digest. Reads
 * fixed argv only from the resolved closed adapter contract in the accepted
 * canonical order — never from caller dispatch.
 */
function verificationPlanSteps(
  plan: ValidatedExecutionPlan,
  contract: ResolvedAdapterContract,
): readonly { readonly check: ValidatedExecutionPlan["requiredVerification"][number]; readonly argv: readonly string[] }[] {
  return plan.requiredVerification.map((check) => ({
    check,
    argv: adapterStepArgv(contract, check),
  }));
}

function allPolicyDecisions(
  policy: Parameters<typeof decidePolicy>[0],
): Readonly<Record<string, PolicyDecision>> {
  return Object.freeze({
    "repo.read": decidePolicy(policy, "repo.read"),
    "repo.write": decidePolicy(policy, "repo.write"),
    "repo.verify": decidePolicy(policy, "repo.verify"),
  });
}

async function runM2TaskUnlocked(
  request: M2RunTaskRequest,
  dependencies: M2RunTaskDependencies,
): Promise<M2RunTaskOutcome> {
  const nowIso = dependencies.nowIso ?? (() => new Date().toISOString());
  const transitions: TaskStatus[] = [];
  let plan: ValidatedExecutionPlan;
  let taskStarted = false;
  let taskRunning = false;
  let taskId: string | null = null;
  let policyDecisions: Readonly<Record<string, PolicyDecision>> = emptyPolicyDecisions();
  let verificationResults: readonly VerificationStepResult[] = Object.freeze([]);

  try {
    plan = loadValidatedExecutionPlan(request.rootDir);
  } catch {
    return haltedRun("invalid M2 task contract");
  }

  try {
    taskId = plan.taskId;
    await phase(dependencies, "plan-loaded");
    if (request.requestedTaskId !== plan.taskId) {
      return haltedRun("requested taskId does not match the M2 task contract", { taskId });
    }

    const runtime = readRuntimeState(request.rootDir);
    if (runtime.kind !== "ok") {
      return haltedRun("authoritative runtime state is not initialized or valid", { taskId });
    }
    if (runtime.tasks.some((task) => task.status === "pending" || task.status === "running")) {
      return haltedRun("another task is already pending or running", { taskId });
    }
    if (taskStateExists(request.rootDir, plan.taskId)) {
      return haltedRun("authoritative task state already exists; replay is refused", { taskId });
    }
    const existingEvidence = readExistingEvidenceForReplay(request.rootDir, plan.taskId);
    if (existingEvidence.kind === "halted") return haltedRun(existingEvidence.reason, { taskId });

    let policy;
    try {
      policy = loadPolicy(request.rootDir);
    } catch {
      return haltedRun("policy authority is missing or invalid", { taskId });
    }

    const detected = detectProject(request.rootDir, plan);
    if (detected.kind !== "supported") {
      return haltedRun(`project detection ${detected.kind}: ${detected.reason}`, { taskId });
    }
    const project: DetectedNodeTypeScriptProject = detected.project;
    await phase(dependencies, "project-detected");

    // Single closed adapter seam: everything below consumes the resolved
    // contract. No package-manager branching is permitted past this point.
    const adapterResolution = resolveAdapterContract(project, plan);
    if (adapterResolution.kind !== "resolved") {
      return haltedRun(`adapter resolution unsupported: ${adapterResolution.reason}`, { taskId });
    }
    const adapterContract: ResolvedAdapterContract = adapterResolution.contract;

    const resolved = resolveVerificationPlan(project, plan, adapterContract);
    if (resolved.kind !== "resolved") {
      return haltedRun(
        `verification profile resolution unsupported: ${resolved.missingChecks.join(", ") || "invalid plan"}`,
        { taskId },
      );
    }
    const verificationPlan: VerificationPlan = resolved.plan;
    await phase(dependencies, "verification-resolved");

    const baseline: ProjectBaselineResult = inspectProjectBaseline(project);
    if (baseline.kind !== "clean") {
      return haltedRun(`project baseline ${baseline.kind}: ${"reason" in baseline ? baseline.reason : "unexpected changes"}`, { taskId });
    }
    await phase(dependencies, "baseline-captured");

    const preflight: ReplacementPreflight | BoundedReplacementOutcome =
      validateBoundedReplacement(project, plan);
    if (preflight.kind !== "ready") {
      return haltedRun(`replacement preflight refused: ${preflight.reason}`, { taskId });
    }
    await phase(dependencies, "replacement-preflighted");

    policyDecisions = allPolicyDecisions(policy);
    const blockedCapability = (["repo.read", "repo.write", "repo.verify"] as const).find(
      (capability) => policyDecisions[capability] !== "ALLOW",
    );
    if (blockedCapability !== undefined) {
      const decision = policyDecisions[blockedCapability];
      if (decision === undefined) {
        return haltedRun("policy decision could not be established", {
          taskId,
          policyDecisions,
        });
      }
      persistEvent(
        request.rootDir,
        plan.taskId,
        blockedCapability,
        decision,
        blockedCapability,
        decision === "DENY" ? "policy-denied" : "approval-required",
        nowIso(),
      );
      return haltedRun(`policy ${decision.toLowerCase()} for ${blockedCapability}`, {
        taskId,
        policyDecisions,
      });
    }

    beginTask(request.rootDir, plan.taskId, nowIso());
    taskStarted = true;
    transitions.push("pending");
    transitionTask(request.rootDir, plan.taskId, "running", nowIso());
    taskRunning = true;
    transitions.push("running");
    await phase(dependencies, "task-running");

    const replacement = applyBoundedReplacement(project, plan, policy);
    if (replacement.kind !== "applied") {
      const persistFailure = transitionHalted(request.rootDir, plan.taskId, nowIso, transitions);
      taskRunning = false;
      return haltedRun(
        persistFailure ?? `replacement refused: ${replacement.reason}`,
        { taskId, policyDecisions, transitions },
      );
    }
    await phase(dependencies, "replacement-applied");

    // T3 input binding happens immediately before the first verification
    // spawn. Unreadable inputs halt before any child is started.
    let fingerprints: VerificationInputFingerprints;
    try {
      fingerprints = computeVerificationInputBinding(project, adapterContract, plan);
    } catch {
      const persistFailure = transitionHalted(request.rootDir, plan.taskId, nowIso, transitions);
      taskRunning = false;
      return haltedRun(
        persistFailure ?? "verification input binding failed; inputs could not be safely read",
        { taskId, policyDecisions, transitions },
      );
    }
    const bindingResult = encodeInputBindingV1(fingerprints);
    const bindingDigest = digestInputBindingV1(bindingResult);
    const bindingProvenance = encodeExecutionProvenanceV2(bindingDigest);

    // T3 bounded execution owns the direct npm/pnpm child only. The legacy
    // injected `runVerification` seam remains honored only when explicitly
    // injected by tests; production always takes the bounded path.
    let boundedCauses: readonly M3TerminalCause[] = Object.freeze([]);
    if (dependencies.runVerification !== undefined && dependencies.verificationSpawn === undefined) {
      verificationResults = await dependencies.runVerification(project, verificationPlan);
      boundedCauses = Object.freeze(
        verificationResults.map((result) => terminalCauseForResult(result)),
      );
    } else {
      const options: {
        readonly spawn?: VerificationSpawn;
        readonly clock?: VerificationClock;
        readonly interruption?: InterruptionSource;
      } = {
        ...(dependencies.verificationSpawn === undefined
          ? {}
          : { spawn: dependencies.verificationSpawn }),
        ...(dependencies.verificationClock === undefined
          ? {}
          : { clock: dependencies.verificationClock }),
        ...(dependencies.verificationInterruption === undefined
          ? {}
          : { interruption: dependencies.verificationInterruption }),
      };
      const bounded = await runBoundedVerificationPlan(project, verificationPlan, options);
      verificationResults = bounded.results;
      boundedCauses = bounded.causes;
    }
    await phase(dependencies, "verification-complete");

    const contractResult = readContractDigest(request.rootDir, plan);
    await phase(dependencies, "contract-rechecked");

    const scope = inspectPostWriteScope(project, plan);
    await phase(dependencies, "scope-captured");

    try {
      if (contractResult !== null) {
        appendEvidence(request.rootDir, {
          actor: ACTOR,
          recordedAt: nowIso(),
          taskId: plan.taskId,
          capability: "repo.read",
          policyDecision: policyDecisions["repo.read"] ?? "ALLOW",
          target: M2_TASK_CONTRACT_RELATIVE_PATH,
          result: contractResult,
          provenance: CONTRACT_PROVENANCE,
        });
      }
      appendEvidence(request.rootDir, {
        actor: ACTOR,
        recordedAt: nowIso(),
        taskId: plan.taskId,
        capability: "repo.write",
        policyDecision: policyDecisions["repo.write"] ?? "ALLOW",
        target: plan.targetPath,
        result: `sha256:${replacement.beforeSha256}->${replacement.afterSha256}`,
        provenance: REPLACEMENT_PROVENANCE,
      });
      appendEvidence(request.rootDir, {
        actor: ACTOR,
        recordedAt: nowIso(),
        taskId: plan.taskId,
        capability: "repo.read",
        policyDecision: policyDecisions["repo.read"] ?? "ALLOW",
        target: "project-scope",
        result: scopeEvidenceResult(scope),
        provenance: SCOPE_PROVENANCE,
      });
      // Exactly one machine-readable binding record per run. It uses the
      // existing v1/common evidence shape because it records an observed
      // read/binding, not a process execution.
      appendEvidence(request.rootDir, {
        actor: ACTOR,
        recordedAt: nowIso(),
        taskId: plan.taskId,
        capability: "repo.read",
        policyDecision: policyDecisions["repo.read"] ?? "ALLOW",
        target: VERIFICATION_INPUT_BINDING_TARGET,
        result: bindingResult,
        provenance: VERIFICATION_INPUT_BINDING_PROVENANCE,
      });
      verificationResults.forEach((result, index) => {
        const terminalCause = boundedCauses[index] ?? terminalCauseForResult(result);
        appendEvidenceV2(request.rootDir, toPersistedRecordV2({
          actor: ACTOR,
          recordedAt: nowIso(),
          taskId: plan.taskId,
          capability: "repo.verify",
          policyDecision: policyDecisions["repo.verify"] ?? "ALLOW",
          target: `${plan.adapter}:${result.check}`,
          result: verificationResultText(result),
          provenance: bindingProvenance,
          executionContext: createExecutionContextV2(
            adapterContract,
            adapterStepArgv(adapterContract, result.check),
            terminalCause,
          ),
        }));
      });
    } catch {
      const persistFailure = transitionHalted(request.rootDir, plan.taskId, nowIso, transitions);
      taskRunning = false;
      return haltedRun(
        persistFailure ?? "evidence persistence failed after the bounded replacement",
        { taskId, policyDecisions, transitions, verificationResults },
      );
    }
    await phase(dependencies, "evidence-appended");

    const verification = verifyProjectChange(plan, readEvidence(request.rootDir));
    const verdict = m2Verdict(verification.verdict);
    await phase(dependencies, "verdict-computed");
    const nextStatus = verdict === "PASS" ? "accepted" : "halted";
    try {
      transitionTask(request.rootDir, plan.taskId, nextStatus, nowIso());
      taskRunning = false;
      transitions.push(nextStatus);
    } catch {
      taskRunning = false;
      return haltedRun("could not persist the final authoritative task state", {
        taskId,
        policyDecisions,
        verdict,
        transitions,
        verificationResults,
      });
    }

    if (verdict !== "PASS") {
      return haltedRun(`verification ${verdict}`, {
        taskId,
        policyDecisions,
        verdict,
        transitions,
        verificationResults,
      });
    }
    return {
      kind: "accepted",
      taskId,
      verdict: "PASS",
      policyDecisions,
      transitions,
      verificationResults,
      reason: "complete project-change evidence passed deterministic verification",
    };
  } catch {
    if (taskStarted && taskRunning) {
      const persistFailure = transitionHalted(request.rootDir, plan.taskId, nowIso, transitions);
      taskRunning = false;
      return haltedRun(
        persistFailure ?? "run halted after an unexpected mutation failure",
        { taskId, policyDecisions, transitions, verificationResults },
      );
    }
    return haltedRun("run halted before the bounded project change completed", {
      taskId,
      policyDecisions,
      transitions,
      verificationResults,
    });
  }
}

export async function runM2Task(
  request: M2RunTaskRequest,
  dependencies: M2RunTaskDependencies = {},
): Promise<M2RunTaskOutcome> {
  let lock;
  try {
    lock = acquireMutationLock(request.rootDir, "run");
  } catch (error: unknown) {
    if (error instanceof MutationLockBusyError) {
      return haltedRun("mutation already in progress; execution.lock is held");
    }
    return haltedRun("could not acquire execution.lock for run");
  }

  let outcome: M2RunTaskOutcome;
  try {
    outcome = await runM2TaskUnlocked(request, dependencies);
  } catch {
    outcome = haltedRun("run halted after an unexpected mutation failure");
  }

  try {
    releaseMutationLock(lock);
  } catch (error: unknown) {
    if (error instanceof MutationLockReleaseError) {
      return haltedRun(error.message, {
        taskId: outcome.taskId,
        verdict: outcome.verdict,
        policyDecisions: outcome.policyDecisions,
        transitions: outcome.transitions,
        verificationResults: outcome.verificationResults,
      });
    }
    return haltedRun("execution.lock release integrity failure", {
      taskId: outcome.taskId,
      verdict: outcome.verdict,
      policyDecisions: outcome.policyDecisions,
      transitions: outcome.transitions,
      verificationResults: outcome.verificationResults,
    });
  }
  return outcome;
}

function verifyM2TaskUnlocked(
  request: M2VerifyTaskRequest,
  dependencies: M2VerifyTaskDependencies,
): M2VerifyTaskOutcome {
  let plan: ValidatedExecutionPlan;
  try {
    plan = loadValidatedExecutionPlan(request.rootDir);
  } catch {
    return haltedVerify("invalid M2 task contract");
  }
  if (request.requestedTaskId !== plan.taskId) {
    return haltedVerify("requested taskId does not match the current M2 task contract", {
      taskId: plan.taskId,
    });
  }

  const runtime = readRuntimeState(request.rootDir);
  if (runtime.kind !== "ok") {
    return haltedVerify("authoritative runtime state is not initialized or valid", {
      taskId: plan.taskId,
    });
  }
  const matching = runtime.tasks.filter((task) => task.taskId === plan.taskId);
  if (matching.length === 0) {
    return haltedVerify("authoritative task state is missing", { taskId: plan.taskId });
  }
  if (matching.length > 1 || matching[0] === undefined) {
    return haltedVerify("authoritative task state is ambiguous", { taskId: plan.taskId });
  }
  const task = matching[0];
  const verify = dependencies.verify ?? verifyProjectChange;
  const verification = verify(plan, readEvidence(request.rootDir));
  const verdict = m2Verdict(verification.verdict);

  if (verdict === "PASS") {
    return {
      kind: "verified",
      taskId: plan.taskId,
      verdict: "PASS",
      stateStatus: task.status,
      stateTransition: "none",
      reason: "persisted project-change evidence passed deterministic verification",
    };
  }

  if (task.status === "accepted") {
    try {
      transitionTask(
        request.rootDir,
        plan.taskId,
        "halted",
        (dependencies.nowIso ?? (() => new Date().toISOString()))(),
      );
    } catch {
      return haltedVerify("could not reconcile stale accepted task state", {
        taskId: plan.taskId,
        verdict,
        stateStatus: task.status,
      });
    }
    return haltedVerify(
      `verification ${verdict}; stale accepted task halted`,
      {
        taskId: plan.taskId,
        verdict,
        stateStatus: "halted",
        stateTransition: "halted",
      },
    );
  }
  return haltedVerify(`verification ${verdict}`, {
    taskId: plan.taskId,
    verdict,
    stateStatus: task.status,
  });
}

export function verifyM2Task(
  request: M2VerifyTaskRequest,
  dependencies: M2VerifyTaskDependencies = {},
): M2VerifyTaskOutcome {
  let lock;
  try {
    lock = acquireMutationLock(request.rootDir, "verify");
  } catch (error: unknown) {
    if (error instanceof MutationLockBusyError) {
      return haltedVerify("mutation already in progress; execution.lock is held");
    }
    return haltedVerify("could not acquire execution.lock for verify");
  }

  let outcome: M2VerifyTaskOutcome;
  try {
    outcome = verifyM2TaskUnlocked(request, dependencies);
  } catch {
    outcome = haltedVerify("verify halted after an unexpected state/evidence failure");
  }
  try {
    releaseMutationLock(lock);
  } catch (error: unknown) {
    if (error instanceof MutationLockReleaseError) {
      return haltedVerify(error.message, {
        taskId: outcome.taskId,
        verdict: outcome.verdict,
        stateStatus: outcome.stateStatus,
        stateTransition: outcome.stateTransition,
      });
    }
    return haltedVerify("execution.lock release integrity failure", {
      taskId: outcome.taskId,
      verdict: outcome.verdict,
      stateStatus: outcome.stateStatus,
      stateTransition: outcome.stateTransition,
    });
  }
  return outcome;
}
