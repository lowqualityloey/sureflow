import { createHash } from "node:crypto";
import { lstatSync, readFileSync, realpathSync } from "node:fs";
import { isAbsolute, join, relative, resolve, sep } from "node:path";
import type { EvidenceDraft } from "./evidence.js";
import type { M4TargetWriteEvent } from "./m4WriteCoordinator.js";
import type { M4PostimageProof } from "./projectEvidenceEvaluation.js";
import type { M4ValidatedExecutionPlan } from "./taskContract.js";
import type { M4EvidenceRecordEntry } from "./m4OrderedEvidence.js";
import {
  appendM4Evidence,
  M4_ACTOR,
  M4_WRITE_PROVENANCE,
} from "./m4VerificationBinding.js";

export interface M4PostWriteEvidenceDependencies {
  readonly readTargetBytes?: (projectRoot: string, relativePath: string) => Uint8Array;
  readonly persist?: (rootDir: string, draft: EvidenceDraft) => M4EvidenceRecordEntry;
}

export type M4PostWriteObservation =
  | { readonly kind: "applied"; readonly entry: M4EvidenceRecordEntry; readonly proof: M4PostimageProof }
  | { readonly kind: "refused"; readonly entry: M4EvidenceRecordEntry };

function isWithin(root: string, candidate: string): boolean {
  const fromRoot = relative(root, candidate);
  return fromRoot === "" ||
    (!fromRoot.startsWith(`..${sep}`) && fromRoot !== ".." && !fromRoot.startsWith(sep));
}

function readContainedTargetBytes(projectRoot: string, relativePath: string): Uint8Array {
  const root = realpathSync(resolve(projectRoot));
  const segments = relativePath.split("/");
  if (segments.length === 0 || segments.some((part) => !part || part === "." || part === "..") || relativePath.includes("\\")) {
    throw new Error("M4 post-write target path is not normalized");
  }
  const target = resolve(root, relativePath);
  if (!isWithin(root, target) || isAbsolute(relative(root, target))) {
    throw new Error("M4 post-write target escapes the project root");
  }
  for (let index = 0; index < segments.length; index += 1) {
    const ancestor = join(root, ...segments.slice(0, index + 1));
    if (!isWithin(root, realpathSync(ancestor))) {
      throw new Error("M4 post-write target resolves outside the project root");
    }
  }
  if (!lstatSync(target).isFile() || !isWithin(root, realpathSync(target))) {
    throw new Error("M4 post-write target is not a contained regular file");
  }
  return new Uint8Array(readFileSync(target));
}

function sha256(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

export function recordM4TargetOutcome(
  rootDir: string,
  projectRoot: string,
  plan: M4ValidatedExecutionPlan,
  outcome: M4TargetWriteEvent,
  recordedAt: string,
  dependencies: M4PostWriteEvidenceDependencies = {},
): M4PostWriteObservation {
  const target = plan.targets.find((candidate) => candidate.path === outcome.path);
  if (target === undefined) throw new Error("M4 write outcome is outside the frozen target set");
  const persist = dependencies.persist ?? appendM4Evidence;
  if (outcome.kind === "refused") {
    const entry = persist(rootDir, {
      actor: M4_ACTOR,
      recordedAt,
      taskId: plan.taskId,
      capability: "repo.write",
      policyDecision: "ALLOW",
      target: outcome.path,
      result: `refused:${outcome.code}`,
      provenance: M4_WRITE_PROVENANCE,
    });
    return Object.freeze({ kind: "refused" as const, entry });
  }
  if (outcome.beforeSha256 !== target.expectedBeforeSha256) {
    throw new Error("M4 write outcome preimage differs from the frozen target plan");
  }
  const bytes = (dependencies.readTargetBytes ?? readContainedTargetBytes)(projectRoot, outcome.path);
  const observedSha256 = sha256(bytes);
  const entry = persist(rootDir, {
    actor: M4_ACTOR,
    recordedAt,
    taskId: plan.taskId,
    capability: "repo.write",
    policyDecision: "ALLOW",
    target: outcome.path,
    result: `sha256:${outcome.beforeSha256}->${observedSha256}`,
    provenance: M4_WRITE_PROVENANCE,
  });
  const proof: M4PostimageProof = Object.freeze({
    kind: "observed-postimage",
    taskId: plan.taskId,
    path: outcome.path,
    writeLine: entry.line,
    sha256: observedSha256,
  });
  return Object.freeze({ kind: "applied" as const, entry, proof });
}
