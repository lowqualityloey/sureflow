import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { readEvidence } from "../src/evidenceStore.js";
import { VERIFICATION_INPUT_BINDING_TARGET } from "../src/evidenceV2.js";
import { M4_PREWRITE_TARGET, M4_SCOPE_PROVENANCE, M4_TERMINAL_TARGET, M4_WRITE_PROVENANCE } from "../src/m4VerificationBinding.js";
import { readRuntimeState } from "../src/stateReader.js";
import { DEFAULT_CHECKS, invokeM4T6Cli, prepareM4T6Project, type M4T6Project } from "./helpers/m4T6AcceptanceProject.js";
import { cleanupM4T6Project, m4T6GitPaths, m4T6Snapshot, readM4T6TaskRecords, readM4T6VerificationRuns } from "./helpers/m4T6ProjectInspection.js";

const projects: M4T6Project[] = [];

function digest(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

function recordForTarget(records: ReturnType<typeof readM4T6TaskRecords>, target: string) {
  const entry = records.find((candidate) => candidate.record.target === target);
  if (entry === undefined) throw new Error(`missing persisted T6 evidence for ${target}`);
  return entry;
}

function runSuccessfulAcceptance(
  manager: "npm" | "pnpm",
  targetCount: number,
  declaredChecks: readonly string[] = DEFAULT_CHECKS,
): void {
  const project = prepareM4T6Project({ manager, targetCount, checks: declaredChecks });
  projects.push(project);
  expect(project.checks).toEqual(declaredChecks);
  const initial = m4T6Snapshot(project);
  const preflight = invokeM4T6Cli(project, ["preflight", project.taskId]);
  expect(preflight.code).toBe(0);
  expect(preflight.stdout).toContain("ELIGIBLE");
  expect(preflight.stdout).toContain("structural eligibility only, not authorization");
  expect(m4T6Snapshot(project)).toBe(initial);
  expect(readM4T6VerificationRuns(project)).toEqual([]);

  const run = invokeM4T6Cli(project, ["run", project.taskId]);
  if (manager === "pnpm" && run.code !== 0) projects.splice(projects.indexOf(project), 1);
  expect(run.code, `project=${project.root} ${run.stdout}${run.stderr} verification=${JSON.stringify(readM4T6VerificationRuns(project))}`).toBe(0);
  expect(run.stdout).toContain(`Sureflow run: ACCEPT — ${project.taskId} (PASS)`);

  const targets = [...project.targets].sort((left, right) => Buffer.compare(Buffer.from(left.path), Buffer.from(right.path)));
  for (const target of targets) {
    expect(readFileSync(join(project.root, target.path), "utf8")).toBe(target.replacement);
  }
  expect(m4T6GitPaths(project)).toEqual(targets.map((target) => target.path));

  const evidence = readM4T6TaskRecords(project);
  const writes = evidence.filter((entry) => targets.some((target) => target.path === entry.record.target));
  expect(writes.map((entry) => entry.record.target)).toEqual(targets.map((target) => target.path));
  for (const [index, target] of targets.entries()) {
    const write = writes[index];
    if (write === undefined) throw new Error(`missing write evidence for ${target.path}`);
    const observedDigest = digest(readFileSync(join(project.root, target.path)));
    expect(write.record.capability).toBe("repo.write");
    expect(write.record.provenance).toBe(M4_WRITE_PROVENANCE);
    expect(write.record.result).toBe(`sha256:${digest(target.before)}->${observedDigest}`);
    expect(observedDigest).toBe(digest(target.replacement));
  }

  const prewrite = recordForTarget(evidence, M4_PREWRITE_TARGET);
  const inputBinding = recordForTarget(evidence, VERIFICATION_INPUT_BINDING_TARGET);
  const scope = recordForTarget(evidence, "project-scope");
  const terminal = recordForTarget(evidence, M4_TERMINAL_TARGET);
  const verification = evidence.filter((entry) => entry.record.capability === "repo.verify");
  expect(prewrite.line).toBeLessThan(writes[0]?.line ?? Number.MAX_SAFE_INTEGER);
  expect(writes.at(-1)?.line).toBeLessThan(inputBinding.line);
  expect(inputBinding.line).toBeLessThan(verification[0]?.line ?? Number.MAX_SAFE_INTEGER);
  expect(verification.map((entry) => entry.record.target.split(":").at(-1))).toEqual(DEFAULT_CHECKS);
  expect(verification.every((entry) => entry.record.schemaVersion === 2 && entry.record.result === "passed")).toBe(true);
  expect(scope.record.result).toBe("compliant");
  expect(scope.record.provenance).toBe(M4_SCOPE_PROVENANCE);
  expect(verification.at(-1)?.line).toBeLessThan(scope.line);
  expect(scope.line).toBeLessThan(terminal.line);
  expect(readEvidence(project.root).every((entry) => entry.kind === "record")).toBe(true);

  const runtime = readRuntimeState(project.root);
  expect(runtime.kind).toBe("ok");
  if (runtime.kind !== "ok") throw new Error("accepted T6 run has invalid runtime state");
  expect(runtime.tasks.find((task) => task.taskId === project.taskId)?.status).toBe("accepted");

  const beforeStatus = m4T6Snapshot(project);
  const status = invokeM4T6Cli(project, ["status"]);
  expect(status.code).toBe(0);
  expect(status.stdout).toContain(`${project.taskId}: accepted`);
  expect(m4T6Snapshot(project)).toBe(beforeStatus);

  const beforeVerify = m4T6Snapshot(project);
  const beforeGit = m4T6GitPaths(project);
  const beforeRuns = readM4T6VerificationRuns(project);
  const verify = invokeM4T6Cli(project, ["verify", project.taskId]);
  expect(verify.code).toBe(0);
  expect(verify.stdout).toContain(`Sureflow verify: PASS — ${project.taskId}`);
  expect(m4T6Snapshot(project)).toBe(beforeVerify);
  expect(m4T6GitPaths(project)).toEqual(beforeGit);
  expect(readM4T6VerificationRuns(project)).toEqual(beforeRuns);
  expect(readRuntimeState(project.root)).toMatchObject({ kind: "ok", tasks: [{ taskId: project.taskId, status: "accepted" }] });
}

afterEach(() => {
  for (const project of projects.splice(0)) cleanupM4T6Project(project);
});

describe("M4-T6 independent public CLI acceptance", () => {
  it("accepts an independent npm project with two targets", () => {
    runSuccessfulAcceptance("npm", 2);
  });

  it("accepts all five targets in an independent npm project", () => {
    runSuccessfulAcceptance("npm", 5);
  });

  it("accepts the same checks in a different valid declaration order", () => {
    runSuccessfulAcceptance("npm", 2, ["build", "lint", "test", "typecheck"]);
  });

  it("accepts an independent real pnpm project with two targets", () => {
    runSuccessfulAcceptance("pnpm", 2);
  }, 15_000);
});
