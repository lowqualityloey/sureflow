import { createHash } from "node:crypto";
import { chmodSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { readRuntimeState } from "../src/stateReader.js";
import { invokeM4T6Cli, prepareM4T6Project, writeM4T6Control, type M4T6Project } from "./helpers/m4T6AcceptanceProject.js";
import { cleanupM4T6Project, m4T6GitPaths, m4T6Snapshot, readM4T6TaskRecords, readM4T6VerificationRuns } from "./helpers/m4T6ProjectInspection.js";

const projects: M4T6Project[] = [];

function makeProject(targetPaths?: readonly string[]): M4T6Project {
  const project = prepareM4T6Project({ manager: "npm", ...(targetPaths === undefined ? {} : { targetPaths }) });
  projects.push(project);
  return project;
}

function digest(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

function taskStatus(project: M4T6Project): string | null {
  const state = readRuntimeState(project.root);
  if (state.kind !== "ok") throw new Error("T6 runtime state is not readable");
  return state.tasks.find((task) => task.taskId === project.taskId)?.status ?? null;
}

function expectHaltedRun(project: M4T6Project): string {
  const run = invokeM4T6Cli(project, ["run", project.taskId]);
  const output = `${run.stdout}${run.stderr}`;
  expect(run.code).toBe(2);
  expect(output).toContain("HALT");
  expect(output).not.toContain("ACCEPT");
  expect(taskStatus(project)).not.toBe("accepted");
  return output;
}

function expectNonSuccessVerify(project: M4T6Project): void {
  const snapshot = m4T6Snapshot(project);
  const gitPaths = m4T6GitPaths(project);
  const evidence = readFileSync(join(project.root, ".sureflow/evidence/evidence.jsonl"));
  const runs = readM4T6VerificationRuns(project);
  const verify = invokeM4T6Cli(project, ["verify", project.taskId]);
  if (verify.code !== 2) projects.splice(projects.indexOf(project), 1);
  expect(verify.code, `project=${project.root}\nstdout=${verify.stdout}\nstderr=${verify.stderr}`).toBe(2);
  expect(`${verify.stdout}${verify.stderr}`).not.toContain("PASS");
  expect(m4T6Snapshot(project)).toBe(snapshot);
  expect(m4T6GitPaths(project)).toEqual(gitPaths);
  expect(readFileSync(join(project.root, ".sureflow/evidence/evidence.jsonl"))).toEqual(evidence);
  expect(readM4T6VerificationRuns(project)).toEqual(runs);
}

afterEach(() => {
  for (const project of projects.splice(0)) cleanupM4T6Project(project);
});

describe("M4-T6 public fail-closed acceptance", () => {
  it("rejects a stale preimage digest before any target write", () => {
    const project = makeProject();
    const target = project.targets[0];
    if (target === undefined) throw new Error("T6 target fixture is empty");
    const contractPath = join(project.root, ".sureflow/task.json");
    const contract = readFileSync(contractPath, "utf8");
    const altered = contract.replace(digest(target.before), "0".repeat(64));
    expect(altered).not.toBe(contract);
    writeFileSync(contractPath, altered);
    expect(invokeM4T6Cli(project, ["preflight", project.taskId]).code).toBe(2);
    expectHaltedRun(project);
    for (const item of project.targets) expect(readFileSync(join(project.root, item.path), "utf8")).toBe(item.before);
    expect(readM4T6TaskRecords(project).filter((entry) => entry.record.capability === "repo.write")).toEqual([]);
  });

  it("does not treat an earlier ELIGIBLE result as authority after target drift", () => {
    const project = makeProject();
    const stale = project.targets[0];
    if (stale === undefined) throw new Error("T6 target fixture is empty");
    const preflight = invokeM4T6Cli(project, ["preflight", project.taskId]);
    expect(preflight.code).toBe(0);
    expect(preflight.stdout).toContain("ELIGIBLE");
    const externalContent = "external edit after preflight\n";
    writeFileSync(join(project.root, stale.path), externalContent);
    expectHaltedRun(project);
    expect(readFileSync(join(project.root, stale.path), "utf8")).toBe(externalContent);
    for (const item of project.targets.filter((item) => item.path !== stale.path)) {
      expect(readFileSync(join(project.root, item.path), "utf8")).toBe(item.before);
    }
    expect(m4T6GitPaths(project)).toEqual([stale.path]);
    expect(readM4T6TaskRecords(project).filter((entry) => entry.record.capability === "repo.write")).toEqual([]);
  });

  it("refuses a dirty Git baseline without changing authorized targets", () => {
    const project = makeProject();
    const extraPath = join(project.root, "untracked-before-run.txt");
    writeFileSync(extraPath, "baseline is dirty\n");
    expect(invokeM4T6Cli(project, ["preflight", project.taskId]).code).toBe(2);
    expectHaltedRun(project);
    for (const target of project.targets) expect(readFileSync(join(project.root, target.path), "utf8")).toBe(target.before);
    expect(readFileSync(extraPath, "utf8")).toBe("baseline is dirty\n");
    expect(readM4T6TaskRecords(project).filter((entry) => entry.record.capability === "repo.write")).toEqual([]);
  });

  it("fails exact-set certification on an extra Git-visible path and verify stays truthful", () => {
    const project = makeProject();
    writeM4T6Control(project, { extraPath: "unexpected/extra.ts" });
    expectHaltedRun(project);
    expect(taskStatus(project)).toBe("halted");
    for (const target of project.targets) expect(readFileSync(join(project.root, target.path), "utf8")).toBe(target.replacement);
    expect(m4T6GitPaths(project)).toEqual([...project.targets.map((target) => target.path), "unexpected/extra.ts"].sort());
    expect(readFileSync(join(project.root, "unexpected/extra.ts"), "utf8")).toBe("unexpected Git-visible path\n");
    expectNonSuccessVerify(project);
  });

  it("fails certification when an authorized path is missing from the changed set", () => {
    const project = makeProject();
    const restored = project.targets[0];
    if (restored === undefined) throw new Error("T6 target fixture is empty");
    writeM4T6Control(project, { restorePath: restored.path, restoreContent: restored.before });
    expectHaltedRun(project);
    expect(taskStatus(project)).toBe("halted");
    expect(readFileSync(join(project.root, restored.path), "utf8")).toBe(restored.before);
    for (const target of project.targets.filter((item) => item.path !== restored.path)) {
      expect(readFileSync(join(project.root, target.path), "utf8")).toBe(target.replacement);
    }
    expect(m4T6GitPaths(project)).toEqual(project.targets.filter((target) => target.path !== restored.path).map((target) => target.path).sort());
    expectNonSuccessVerify(project);
  });

  it("keeps verification failure halted without rolling back successful target writes", () => {
    const project = makeProject();
    writeM4T6Control(project, { failCheck: "test" });
    expectHaltedRun(project);
    expect(taskStatus(project)).toBe("halted");
    for (const target of project.targets) expect(readFileSync(join(project.root, target.path), "utf8")).toBe(target.replacement);
    expect(readM4T6VerificationRuns(project).some((run) => run.check === "test" && run.manager === "npm" && run.lockHeld)).toBe(true);
    expectNonSuccessVerify(project);
  });

  it("stops after a failed bounded write and leaves the unauthorized suffix unchanged", () => {
    const paths = ["a/first.ts", "b/blocked.ts", "c/untouched.ts"];
    const project = makeProject(paths);
    const first = project.targets.find((target) => target.path === paths[0]);
    const blocked = project.targets.find((target) => target.path === paths[1]);
    const suffix = project.targets.find((target) => target.path === paths[2]);
    if (first === undefined || blocked === undefined || suffix === undefined) throw new Error("T6 ordered targets are incomplete");
    chmodSync(join(project.root, "b"), 0o555);
    expect(invokeM4T6Cli(project, ["preflight", project.taskId]).code).toBe(0);
    expectHaltedRun(project);
    expect(readFileSync(join(project.root, first.path), "utf8")).toBe(first.replacement);
    expect(readFileSync(join(project.root, blocked.path), "utf8")).toBe(blocked.before);
    expect(readFileSync(join(project.root, suffix.path), "utf8")).toBe(suffix.before);
    const writes = readM4T6TaskRecords(project).filter((entry) => entry.record.capability === "repo.write");
    expect(writes.map((entry) => entry.record.target)).toEqual([first.path, blocked.path]);
    expect(writes[1]?.record.result).toContain("refused:apply-failed");
    expect(readM4T6VerificationRuns(project)).toEqual([]);
    expect(m4T6GitPaths(project)).toEqual([first.path]);
    expectNonSuccessVerify(project);
  });

  it("does not accept UNKNOWN after observed evidence is removed", () => {
    const project = makeProject();
    const run = invokeM4T6Cli(project, ["run", project.taskId]);
    expect(run.code).toBe(0);
    const target = project.targets[0];
    if (target === undefined) throw new Error("T6 target fixture is empty");
    const evidencePath = join(project.root, ".sureflow/evidence/evidence.jsonl");
    const lines = readFileSync(evidencePath, "utf8").split("\n");
    const removed = lines.find((line) => line.includes('"capability":"repo.write"') && line.includes(`"target":"${target.path}"`));
    if (removed === undefined) throw new Error("T6 write evidence row is missing before corruption");
    const corruptedEvidence = lines.filter((line) => line !== removed).join("\n");
    writeFileSync(evidencePath, corruptedEvidence);
    const beforeVerify = readFileSync(evidencePath);
    const verify = invokeM4T6Cli(project, ["verify", project.taskId]);
    expect(verify.code).toBe(2);
    expect(`${verify.stdout}${verify.stderr}`).toContain("UNKNOWN");
    expect(`${verify.stdout}${verify.stderr}`).not.toContain("PASS");
    expect(taskStatus(project)).toBe("halted");
    for (const item of project.targets) expect(readFileSync(join(project.root, item.path), "utf8")).toBe(item.replacement);
    expect(readFileSync(evidencePath)).toEqual(beforeVerify);
    expect(m4T6GitPaths(project)).toEqual(project.targets.map((item) => item.path).sort());
  });

  it("does not claim acceptance when the final task-state write is blocked", () => {
    const project = makeProject();
    writeM4T6Control(project, { failFinalStateWrite: true });
    const output = expectHaltedRun(project);
    expect(output).toContain("could not persist the final authoritative task state");
    expect(output).not.toContain("PASS");
    expect(taskStatus(project)).toBe("running");
    for (const target of project.targets) expect(readFileSync(join(project.root, target.path), "utf8")).toBe(target.replacement);
    expect(readM4T6VerificationRuns(project).map((run) => run.check)).toEqual(project.checks);
  });
});
