import { execFileSync, spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { readEvidence } from "../src/evidenceStore.js";
import { mutationLockExists } from "../src/mutationLock.js";
import { runM2Task, verifyM2Task } from "../src/m2Orchestration.js";
import type { VerificationPlan, VerificationStepResult } from "../src/verificationAdapter.js";
import { cliExecutable } from "./helpers/cliArtifact.js";
import { cleanupM4T5Project, prepareM4T5Project, type M4T5Project } from "./helpers/m4T5Project.js";

const projects: M4T5Project[] = [];

function passed(_project: unknown, plan: VerificationPlan): readonly VerificationStepResult[] {
  return plan.steps.map(({ check }) => ({ check, kind: "passed" as const, exitCode: 0 as const }));
}

afterEach(() => {
  for (const project of projects.splice(0)) cleanupM4T5Project(project);
});

describe("M4-T5 shared public run/verify routing", () => {
  it("runs and verifies a schema-v2 task through the built CLI", () => {
    const project = prepareM4T5Project();
    projects.push(project);
    const cli = cliExecutable();
    const runOutput = execFileSync("node", [cli, "run", project.taskId], {
      cwd: project.root,
      shell: false,
      encoding: "utf8",
      stdio: "pipe",
    });
    expect(runOutput).toContain(`Sureflow run: ACCEPT — ${project.taskId} (PASS)`);
    const projectBeforeVerify = project.paths.map((path) => readFileSync(join(project.root, path)));
    const evidenceBeforeVerify = readFileSync(join(project.root, ".sureflow", "evidence", "evidence.jsonl"));
    const verifyOutput = execFileSync("node", [cli, "verify", project.taskId], {
      cwd: project.root,
      shell: false,
      encoding: "utf8",
      stdio: "pipe",
    });
    expect(verifyOutput).toContain(`Sureflow verify: PASS — ${project.taskId}`);
    expect(project.paths.map((path) => readFileSync(join(project.root, path)))).toEqual(projectBeforeVerify);
    expect(readFileSync(join(project.root, ".sureflow", "evidence", "evidence.jsonl"))).toEqual(evidenceBeforeVerify);
  });

  it("routes schema-v2 verify under the shared lock without changing project or evidence", async () => {
    const project = prepareM4T5Project();
    projects.push(project);
    const run = await runM2Task({ rootDir: project.root, requestedTaskId: project.taskId }, {
      runVerification: (detected, plan) => Promise.resolve(passed(detected, plan)),
    });
    expect(run.kind).toBe("accepted");
    const projectBefore = project.paths.map((path) => readFileSync(join(project.root, path)));
    const evidenceBefore = readFileSync(join(project.root, ".sureflow", "evidence", "evidence.jsonl"));
    let lockObserved = false;
    const verification = verifyM2Task({ rootDir: project.root, requestedTaskId: project.taskId }, {
      projectScope: {
        gitStatusRunner: (executable, argv, options) => {
          lockObserved = mutationLockExists(project.root);
          const result = spawnSync(executable, [...argv], { cwd: options.cwd, shell: false, stdio: ["ignore", "pipe", "ignore"] });
          return {
            status: result.status,
            signal: result.signal,
            stdout: result.stdout,
            ...(result.error === undefined ? {} : { error: result.error }),
          };
        },
      },
    });
    expect(verification).toMatchObject({ kind: "verified", verdict: "PASS", stateStatus: "accepted" });
    expect(lockObserved).toBe(true);
    expect(project.paths.map((path) => readFileSync(join(project.root, path)))).toEqual(projectBefore);
    expect(readFileSync(join(project.root, ".sureflow", "evidence", "evidence.jsonl"))).toEqual(evidenceBefore);
    expect(readEvidence(project.root).filter((entry) => entry.kind === "record").length).toBeGreaterThan(0);
    expect(execFileSync("git", ["status", "--porcelain=v1", "-z"], { cwd: project.root })).not.toEqual(Buffer.alloc(0));
  });
});
