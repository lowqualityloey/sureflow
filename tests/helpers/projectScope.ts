import {
  mkdtempSync,
  mkdirSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  createHash,
} from "node:crypto";
import {
  createExecutionContextV2,
  digestInputBindingV1,
  encodeExecutionProvenanceV2,
  encodeInputBindingV1,
  VERIFICATION_INPUT_BINDING_PROVENANCE,
} from "../../src/evidenceV2.js";
import type { EvidenceReadEntry } from "../../src/evidenceStore.js";
import type { M4PostimageProof } from "../../src/projectEvidenceEvaluation.js";
import { digestM4ResolvedPlan } from "../../src/m4OrderedEvidence.js";
import { adapterStepArgv, resolveAdapterContractForIds } from "../../src/projectAdapter.js";
import type { M4ScopeComplianceResult } from "../../src/projectScope.js";
import {
  M2_ADAPTER_ID,
  M3_PNPM_ADAPTER_ID,
  M2_REPLACEMENT_OPERATION,
  M2_TASK_CONTRACT_SCHEMA_VERSION,
  type M4ValidatedExecutionPlan,
} from "../../src/taskContract.js";
import type {
  DetectedNodeTypeScriptProject,
} from "../../src/projectDetection.js";
import type { ValidatedExecutionPlan } from "../../src/taskContract.js";
import type {
  GitStatusObservation,
  GitStatusRunner,
  ProjectScopeDependencies,
} from "../../src/projectScope.js";

const temporaryRoots: string[] = [];

export function trackTemporaryRepository(path: string): void {
  temporaryRoots.push(path);
}

export function runGit(root: string, args: readonly string[]): void {
  const result = spawnSync("git", [...args], {
    cwd: root,
    shell: false,
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (result.status !== 0) {
    throw new Error(`git ${args.join(" ")} failed: ${result.stderr.toString("utf8")}`);
  }
}

export function temporaryGitRepository(): string {
  const root = mkdtempSync(join(tmpdir(), "sureflow-m2-t5-"));
  temporaryRoots.push(root);
  runGit(root, ["init"]);
  runGit(root, ["config", "user.email", "sureflow-tests@example.invalid"]);
  runGit(root, ["config", "user.name", "Sureflow Tests"]);
  mkdirSync(join(root, "src"));
  writeFileSync(join(root, "src/target.ts"), "export const target = 1;\n");
  writeFileSync(join(root, "src/other.ts"), "export const other = 1;\n");
  runGit(root, ["add", "src"]);
  runGit(root, ["commit", "-m", "baseline"]);
  return root;
}

export function detectedProject(
  root: string,
  targetPath = "src/target.ts",
): DetectedNodeTypeScriptProject {
  return {
    adapter: M2_ADAPTER_ID,
    root: realpathSync(root),
    manifestPath: "package.json",
    lockfilePath: "package-lock.json",
    tsconfigPath: "tsconfig.json",
    targetPath,
    supportedChecks: Object.freeze(["typecheck", "test", "lint", "build"]),
  };
}

export function validatedPlan(targetPath = "src/target.ts"): ValidatedExecutionPlan {
  return {
    schemaVersion: M2_TASK_CONTRACT_SCHEMA_VERSION,
    taskId: "task-t5-test",
    adapter: M2_ADAPTER_ID,
    requiredVerification: Object.freeze(["typecheck", "test", "lint", "build"]),
    operation: M2_REPLACEMENT_OPERATION,
    targetPath,
    expectedBeforeSha256: "0".repeat(64),
    replacementContent: "export const target = 2;\n",
    contractSha256: "0".repeat(64),
    source: {
      path: ".sureflow/task.json",
      sha256: "0".repeat(64),
    },
  };
}

export function statusOutput(...records: string[]): Buffer {
  return Buffer.from(`${records.join("\0")}\0`, "utf8");
}

export function injectedRunner(
  output: Buffer,
  overrides: Partial<GitStatusObservation> = {},
  calls: Array<{ executable: string; argv: readonly string[]; cwd: string; shell: boolean }> = [],
): ProjectScopeDependencies {
  const runner: GitStatusRunner = (executable, argv, options) => {
    calls.push({ executable, argv, cwd: options.cwd, shell: options.shell });
    return {
      status: 0,
      signal: null,
      stdout: output,
      ...overrides,
    };
  };
  return { gitStatusRunner: runner };
}

export function cleanupTemporaryRepositories(): void {
  for (const root of temporaryRoots.splice(0)) rmSync(root, { recursive: true, force: true });
}

const M4_TEST_CONTRACT = "c".repeat(64), M4_TEST_BEFORE = "b".repeat(64);

function digestUtf8(value: string): string { return createHash("sha256").update(Buffer.from(value, "utf8")).digest("hex"); }

function m4V1Evidence(
  taskId: string, capability: string, target: string, result: string, line: number,
  provenance = "m4-test-evidence",
): EvidenceReadEntry {
  return {
    kind: "record",
    line,
    record: {
      schemaVersion: 1,
      actor: "worker:m4",
      recordedAt: "2026-09-24T00:00:00.000Z",
      taskId,
      capability,
      policyDecision: "ALLOW",
      target,
      result,
      provenance,
    },
  };
}

export type M4CertificateFixture = { readonly entries: EvidenceReadEntry[]; readonly proofs: M4PostimageProof[]; readonly scope: M4ScopeComplianceResult };

function orderedM4Targets(plan: M4ValidatedExecutionPlan): M4ValidatedExecutionPlan["targets"] {
  return [...plan.targets].sort((left, right) => Buffer.compare(
    Buffer.from(left.path, "utf8"), Buffer.from(right.path, "utf8"),
  ));
}

export function m4CompleteCertificate(plan: M4ValidatedExecutionPlan): M4CertificateFixture {
  const targets = orderedM4Targets(plan);
  const entries = [m4V1Evidence(plan.taskId, "repo.read", "task-contract-prewrite-binding", `sha256:${M4_TEST_CONTRACT}`, 1)];
  const proofs: M4PostimageProof[] = [];
  let line = 2;
  for (const target of targets) {
    const after = digestUtf8(target.replacementContent);
    entries.push(m4V1Evidence(plan.taskId, "repo.write", target.path, `sha256:${M4_TEST_BEFORE}->${after}`, line));
    proofs.push({ kind: "observed-postimage", taskId: plan.taskId, path: target.path, writeLine: line, sha256: after });
    line += 1;
  }
  entries.push(m4V1Evidence(plan.taskId, "repo.read", "project-scope", "compliant", line));
  line += 1;
  const fingerprints = {
    manifestPath: "package.json" as const,
    manifestSha256: "1".repeat(64),
    lockfilePath: plan.adapter === M3_PNPM_ADAPTER_ID ? "pnpm-lock.yaml" as const : "package-lock.json" as const,
    lockfileSha256: "2".repeat(64),
    tsconfigPath: "tsconfig.json" as const,
    tsconfigSha256: "3".repeat(64),
    planDigest: digestM4ResolvedPlan(plan) ?? "0".repeat(64),
  };
  const bindingDigest = digestInputBindingV1(encodeInputBindingV1(fingerprints));
  entries.push(m4V1Evidence(
    plan.taskId,
    "repo.read",
    "verification-input-binding",
    encodeInputBindingV1(fingerprints),
    line,
    VERIFICATION_INPUT_BINDING_PROVENANCE,
  ));
  line += 1;
  const resolved = resolveAdapterContractForIds(plan.adapter, plan.adapter);
  if (resolved.kind !== "resolved") throw new Error("test adapter did not resolve");
  for (const check of plan.requiredVerification) {
    const context = createExecutionContextV2(resolved.contract, adapterStepArgv(resolved.contract, check), { kind: "passed" });
    entries.push({
      kind: "record",
      line,
      record: {
        schemaVersion: 2,
        actor: "worker:m4",
        recordedAt: "2026-09-24T00:00:00.000Z",
        taskId: plan.taskId,
        capability: "repo.verify",
        policyDecision: "ALLOW",
        target: `${plan.adapter}:${check}`,
        result: "passed",
        provenance: encodeExecutionProvenanceV2(bindingDigest),
        executionContext: context,
      },
    });
    line += 1;
  }
  entries.push(m4V1Evidence(
    plan.taskId,
    "repo.read",
    ".sureflow/task.json",
    `sha256:${M4_TEST_CONTRACT};provenance=control-plane-task-input`,
    line,
  ));
  return {
    entries,
    proofs,
    scope: { kind: "compliant", compliant: true, changedPaths: targets.map((target) => target.path).sort(), unauthorizedPaths: [], missingPaths: [] },
  };
}

export function m4PartialCertificate(
  plan: M4ValidatedExecutionPlan,
  completedCount: number,
): M4CertificateFixture {
  const targets = orderedM4Targets(plan);
  const entries = [m4V1Evidence(plan.taskId, "repo.read", "task-contract-prewrite-binding", `sha256:${M4_TEST_CONTRACT}`, 1)];
  const proofs: M4PostimageProof[] = [];
  let line = 2;
  for (const target of targets.slice(0, completedCount)) {
    const after = digestUtf8(target.replacementContent);
    entries.push(m4V1Evidence(plan.taskId, "repo.write", target.path, `sha256:${M4_TEST_BEFORE}->${after}`, line));
    proofs.push({ kind: "observed-postimage", taskId: plan.taskId, path: target.path, writeLine: line, sha256: after });
    line += 1;
  }
  const failedTarget = targets[completedCount];
  if (failedTarget !== undefined) {
    entries.push(m4V1Evidence(plan.taskId, "repo.write", failedTarget.path, "refused:stale-preimage", line));
    line += 1;
  }
  entries.push(m4V1Evidence(
    plan.taskId,
    "repo.read",
    ".sureflow/task.json",
    `sha256:${M4_TEST_CONTRACT};provenance=control-plane-task-input`,
    line,
  ));
  return {
    entries,
    proofs,
    scope: { kind: "violation", compliant: false, changedPaths: [], unauthorizedPaths: [], missingPaths: [], reason: "partial diagnostic" },
  };
}
