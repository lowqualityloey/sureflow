/**
 * M2-T5 read-only Git-visible project-scope inspection.
 *
 * This module observes only the approved porcelain-v1 status shape. It does
 * not mutate the repository, inspect ignored files, detect external changes,
 * execute project commands, or derive a Sureflow verification verdict.
 */
import {
  inspectGitVisibleScope,
  normalizeStatusPath,
  type ProjectScopeDependencies,
} from "./projectScopeGitStatus.js";
export {
  GIT_STATUS_ARGV,
  parsePorcelainV1Z,
} from "./projectScopeGitStatus.js";
export type {
  GitStatusObservation,
  GitStatusRunner,
  GitStatusSpawnOptions,
  PorcelainParseResult,
  PorcelainStatusEntry,
  ProjectScopeDependencies,
} from "./projectScopeGitStatus.js";
import type { DetectedNodeTypeScriptProject } from "./projectDetection.js";
import type { M4ValidatedExecutionPlan, ValidatedExecutionPlan } from "./taskContract.js";

export interface ProjectScopeSnapshot {
  readonly changedPaths: readonly string[];
}

export type ProjectBaselineResult =
  | { readonly kind: "clean"; readonly snapshot: ProjectScopeSnapshot }
  | { readonly kind: "dirty"; readonly snapshot: ProjectScopeSnapshot }
  | { readonly kind: "unavailable"; readonly reason: string }
  | { readonly kind: "invalid"; readonly reason: string };

export type ScopeComplianceResult =
  | {
      readonly kind: "compliant";
      readonly compliant: true;
      readonly changedPaths: readonly string[];
      readonly unauthorizedPaths: readonly string[];
    }
  | {
      readonly kind: "violation";
      readonly compliant: false;
      readonly changedPaths: readonly string[];
      readonly unauthorizedPaths: readonly string[];
      readonly reason: string;
    }
  | {
      readonly kind: "unavailable" | "invalid";
      readonly compliant: false;
      readonly changedPaths: readonly string[];
      readonly unauthorizedPaths: readonly string[];
      readonly reason: string;
    };

export type M4ScopeComplianceResult = ScopeComplianceResult & {
  readonly missingPaths: readonly string[];
};

interface ScopeInspection {
  readonly kind: "ok";
  readonly snapshot: ProjectScopeSnapshot;
  readonly hasProjectRenameOrCopy: boolean;
  readonly hasDuplicateProjectPaths: boolean;
}

type ScopeInspectionResult =
  | ScopeInspection
  | { readonly kind: "unavailable" | "invalid"; readonly reason: string };

function frozenPaths(paths: readonly string[]): readonly string[] {
  return Object.freeze(
    [...new Set(paths)].sort((left, right) => (left < right ? -1 : left > right ? 1 : 0)),
  );
}

function frozenSnapshot(changedPaths: readonly string[]): ProjectScopeSnapshot {
  return Object.freeze({ changedPaths: frozenPaths(changedPaths) });
}

function isControlPlanePath(path: string): boolean {
  return path === ".sureflow" || path.startsWith(".sureflow/");
}

function inspectScope(
  project: DetectedNodeTypeScriptProject,
  dependencies: ProjectScopeDependencies,
): ScopeInspectionResult {
  const observation = inspectGitVisibleScope(project, dependencies);
  if (observation.kind !== "ok") return observation;
  return {
    kind: "ok",
    snapshot: frozenSnapshot(observation.changedPaths),
    hasProjectRenameOrCopy: observation.hasProjectRenameOrCopy,
    hasDuplicateProjectPaths: observation.hasDuplicateProjectPaths,
  };
}

/** Establish a read-only project-visible baseline before mutation. */
export function inspectProjectBaseline(
  project: DetectedNodeTypeScriptProject,
  dependencies: ProjectScopeDependencies = {},
): ProjectBaselineResult {
  const inspection = inspectScope(project, dependencies);
  if (inspection.kind !== "ok") return Object.freeze(inspection);
  return Object.freeze({
    kind: inspection.snapshot.changedPaths.length === 0 ? "clean" as const : "dirty" as const,
    snapshot: inspection.snapshot,
  });
}

function validTargetPath(path: unknown): path is string {
  return (
    typeof path === "string" &&
    !path.includes("\\") &&
    normalizeStatusPath(path) !== null &&
    !isControlPlanePath(path)
  );
}

function validM4TargetPath(path: unknown): path is string {
  if (!validTargetPath(path) || path.includes("\u0000")) return false;
  return !path.split("/").some((segment) => segment === ".git");
}

function invalidM4Scope(reason: string): M4ScopeComplianceResult {
  return Object.freeze({
    kind: "invalid" as const,
    compliant: false as const,
    changedPaths: Object.freeze([]),
    missingPaths: Object.freeze([]),
    unauthorizedPaths: Object.freeze([]),
    reason,
  });
}

function unavailableCompliance(
  kind: "unavailable" | "invalid",
  reason: string,
): ScopeComplianceResult {
  return Object.freeze({
    kind,
    compliant: false as const,
    changedPaths: Object.freeze([]),
    unauthorizedPaths: Object.freeze([]),
    reason,
  });
}

/** Classify post-write Git-visible project changes against one authorized target. */
export function inspectPostWriteScope(
  project: DetectedNodeTypeScriptProject,
  plan: ValidatedExecutionPlan,
  dependencies: ProjectScopeDependencies = {},
): ScopeComplianceResult {
  if (!validTargetPath(plan.targetPath)) {
    return unavailableCompliance("invalid", "task target path is not a normalized project-relative path");
  }
  if (project.targetPath !== plan.targetPath) {
    return unavailableCompliance("invalid", "task target and detected project target differ");
  }

  const inspection = inspectScope(project, dependencies);
  if (inspection.kind !== "ok") return unavailableCompliance(inspection.kind, inspection.reason);

  const changedPaths = inspection.snapshot.changedPaths;
  const unauthorizedPaths = frozenPaths(
    changedPaths.filter((path) => path !== plan.targetPath),
  );
  const targetObserved = changedPaths.includes(plan.targetPath);
  if (targetObserved && unauthorizedPaths.length === 0 && !inspection.hasProjectRenameOrCopy) {
    return Object.freeze({
      kind: "compliant" as const,
      compliant: true as const,
      changedPaths,
      unauthorizedPaths,
    });
  }

  let reason = "observed project-visible changes do not match the authorized target";
  if (!targetObserved) reason = "authorized target change was not observed";
  else if (inspection.hasProjectRenameOrCopy) reason = "rename or copy structure is not an approved replacement";

  return Object.freeze({
    kind: "violation" as const,
    compliant: false as const,
    changedPaths,
    unauthorizedPaths,
    reason,
  });
}

export function inspectM4PostWriteScope(
  project: DetectedNodeTypeScriptProject,
  plan: M4ValidatedExecutionPlan,
  dependencies: ProjectScopeDependencies = {},
): M4ScopeComplianceResult {
  if (
    plan.targets.length < 2 ||
    plan.targets.length > 5
  ) {
    return invalidM4Scope("task plan is not a supported schema-v2 complete target set");
  }
  const authorizedPaths = plan.targets.map((target) => target.path);
  if (authorizedPaths.some((path) => !validM4TargetPath(path))) {
    return invalidM4Scope("task target set contains a non-normalized or forbidden path");
  }
  if (new Set(authorizedPaths).size !== authorizedPaths.length) {
    return invalidM4Scope("task target set contains duplicate paths");
  }
  if (project.adapter !== plan.adapter || !authorizedPaths.includes(project.targetPath)) {
    return invalidM4Scope("detected project context does not match the complete target set");
  }

  const inspection = inspectScope(project, dependencies);
  if (inspection.kind !== "ok") {
    return Object.freeze({
      kind: inspection.kind,
      compliant: false as const,
      changedPaths: Object.freeze([]),
      missingPaths: Object.freeze([]),
      unauthorizedPaths: Object.freeze([]),
      reason: inspection.reason,
    });
  }

  const changedPaths = inspection.snapshot.changedPaths;
  const authorizedSet = new Set(authorizedPaths);
  const changedSet = new Set(changedPaths);
  const missingPaths = frozenPaths(authorizedPaths.filter((path) => !changedSet.has(path)));
  const unauthorizedPaths = frozenPaths(changedPaths.filter((path) => !authorizedSet.has(path)));
  if (inspection.hasDuplicateProjectPaths) {
    return Object.freeze({
      kind: "invalid" as const,
      compliant: false as const,
      changedPaths,
      missingPaths,
      unauthorizedPaths,
      reason: "Git status contains duplicate project paths",
    });
  }
  if (missingPaths.length === 0 && unauthorizedPaths.length === 0 && !inspection.hasProjectRenameOrCopy) {
    return Object.freeze({
      kind: "compliant" as const,
      compliant: true as const,
      changedPaths,
      missingPaths,
      unauthorizedPaths,
    });
  }

  let reason = "observed project-visible changes do not equal the complete authorized target set";
  if (inspection.hasProjectRenameOrCopy) {
    reason = "rename or copy structure is not an approved bounded replacement";
  }
  return Object.freeze({
    kind: "violation" as const,
    compliant: false as const,
    changedPaths,
    missingPaths,
    unauthorizedPaths,
    reason,
  });
}
