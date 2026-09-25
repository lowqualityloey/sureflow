import type { AppliedReplacement } from "./boundedReplacement.js";
import {
  appendEvidence,
  appendEvidenceV2,
  haltedRun,
  m2Verdict,
  phase,
  readContractDigest,
  readEvidence,
  scopeEvidenceResult,
  transitionHalted,
  ACTOR,
  CONTRACT_PROVENANCE,
  REPLACEMENT_PROVENANCE,
  SCOPE_PROVENANCE,
  type M2RunTaskDependencies,
  type M2RunTaskOutcome,
} from "./m2RunSupport.js";
import { computeVerificationInputBinding } from "./m2VerificationBinding.js";
import { verifyProjectChange } from "./projectChangeVerifier.js";
import { inspectPostWriteScope } from "./projectScope.js";
import { transitionTask } from "./taskStateStore.js";
import { M2_TASK_CONTRACT_RELATIVE_PATH, type ValidatedExecutionPlan } from "./taskContract.js";
import type { DetectedNodeTypeScriptProject } from "./projectDetection.js";
import type { ResolvedAdapterContract } from "./projectAdapter.js";
import { adapterStepArgv } from "./projectAdapter.js";
import type { VerificationPlan, VerificationStepResult } from "./verificationAdapter.js";
import {
  createExecutionContextV2,
  digestInputBindingV1,
  encodeExecutionProvenanceV2,
  encodeInputBindingV1,
  VERIFICATION_INPUT_BINDING_PROVENANCE,
  VERIFICATION_INPUT_BINDING_TARGET,
  type M3TerminalCause,
  type VerificationInputFingerprints,
} from "./evidenceV2.js";
import {
  runBoundedVerificationPlan,
  terminalCauseForResult,
  verificationResultText,
} from "./verificationExecution.js";
import { toPersistedRecordV2 } from "./redaction.js";
import type { PolicyDecision } from "./policy.js";
import type { TaskStatus } from "./state.js";
import type { M2RunTaskRequest } from "./m2RunSupport.js";

export interface M2RunVerificationInput {
  readonly request: M2RunTaskRequest;
  readonly dependencies: M2RunTaskDependencies;
  readonly nowIso: () => string;
  readonly transitions: TaskStatus[];
  readonly taskId: string;
  readonly plan: ValidatedExecutionPlan;
  readonly project: DetectedNodeTypeScriptProject;
  readonly adapterContract: ResolvedAdapterContract;
  readonly verificationPlan: VerificationPlan;
  readonly replacement: AppliedReplacement;
  readonly policyDecisions: Readonly<Record<string, PolicyDecision>>;
}

export async function completeM2RunVerification(
  input: M2RunVerificationInput,
): Promise<M2RunTaskOutcome> {
  const {
    request,
    dependencies,
    nowIso,
    transitions,
    taskId,
    plan,
    project,
    adapterContract,
    verificationPlan,
    replacement,
    policyDecisions,
  } = input;
  let verificationResults: readonly VerificationStepResult[] = Object.freeze([]);

  try {
    await phase(dependencies, "replacement-applied");
    let fingerprints: VerificationInputFingerprints;
    try {
      fingerprints = computeVerificationInputBinding(project, adapterContract, plan);
    } catch {
      const persistFailure = transitionHalted(request.rootDir, plan.taskId, nowIso, transitions);
      return haltedRun(
        persistFailure ?? "verification input binding failed; inputs could not be safely read",
        { taskId, policyDecisions, transitions },
      );
    }
    const bindingResult = encodeInputBindingV1(fingerprints);
    const bindingDigest = digestInputBindingV1(bindingResult);
    const bindingProvenance = encodeExecutionProvenanceV2(bindingDigest);

    let boundedCauses: readonly M3TerminalCause[] = Object.freeze([]);
    if (dependencies.runVerification !== undefined && dependencies.verificationSpawn === undefined) {
      verificationResults = await dependencies.runVerification(project, verificationPlan);
      boundedCauses = Object.freeze(
        verificationResults.map((result) => terminalCauseForResult(result)),
      );
    } else {
      const options = {
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
      transitions.push(nextStatus);
    } catch {
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
    const persistFailure = transitionHalted(request.rootDir, plan.taskId, nowIso, transitions);
    return haltedRun(
      persistFailure ?? "run halted after an unexpected mutation failure",
      { taskId, policyDecisions, transitions, verificationResults },
    );
  }
}
