import { renameSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { runM2Task } from "../src/m2Orchestration.js";
import type { DetectedNodeTypeScriptProject } from "../src/projectDetection.js";
import type { VerificationPlan, VerificationStepResult } from "../src/verificationAdapter.js";
import { cleanupM4T5Project, prepareM4T5Project, readM4T5File, type M4T5Project } from "./helpers/m4T5Project.js";

const projects: M4T5Project[] = [];

function passed(_project: DetectedNodeTypeScriptProject, plan: VerificationPlan): readonly VerificationStepResult[] {
  return plan.steps.map(({ check }) => ({ check, kind: "passed" as const, exitCode: 0 as const }));
}

function addProject(count = 2): M4T5Project {
  const project = prepareM4T5Project(count);
  projects.push(project);
  return project;
}

afterEach(() => {
  for (const project of projects.splice(0)) cleanupM4T5Project(project);
});

describe("M4-T5 fail-closed run paths", () => {
  it("halts on a first-target stale preimage without writing its suffix or verifying", async () => {
    const project = addProject(3);
    let verificationRan = false;
    const first = project.paths[0];
    if (first === undefined) throw new Error("fixture target missing");
    const result = await runM2Task({ rootDir: project.root, requestedTaskId: project.taskId }, {
      onPhase: (phase) => {
        if (phase === "task-running") writeFileSync(join(project.root, first), "external drift\n");
      },
      runVerification: (_detected, plan) => { verificationRan = true; return Promise.resolve(passed(_detected, plan)); },
    });
    expect(result.kind).toBe("halted");
    expect(result.verdict).toBe("FAIL");
    expect(readM4T5File(project, first)).toBe("external drift\n");
    for (const path of project.paths.slice(1)) expect(readM4T5File(project, path)).toBe(project.before.get(path));
    expect(verificationRan).toBe(false);
  });

  it("preserves the completed prefix on later write failure without rollback or verification", async () => {
    const project = addProject(3);
    const failedPath = join(project.root, project.paths[1] ?? "missing");
    let verificationRan = false;
    const result = await runM2Task({ rootDir: project.root, requestedTaskId: project.taskId }, {
      atomicRename: (temporary, target) => {
        if (target === failedPath) throw new Error("injected rename refusal");
        renameSync(temporary, target);
      },
      runVerification: (_detected, plan) => { verificationRan = true; return Promise.resolve(passed(_detected, plan)); },
    });
    expect(result.kind).toBe("halted");
    expect(result.verdict).toBe("FAIL");
    expect(readM4T5File(project, project.paths[0] ?? "")).toBe(project.replacements.get(project.paths[0] ?? ""));
    for (const path of project.paths.slice(1)) expect(readM4T5File(project, path)).toBe(project.before.get(path));
    expect(verificationRan).toBe(false);
  });

  it("halts after readback failure before the next target", async () => {
    const project = addProject();
    let verificationRan = false;
    const result = await runM2Task({ rootDir: project.root, requestedTaskId: project.taskId }, {
      postWriteEvidence: { readTargetBytes: () => { throw new Error("injected readback failure"); } },
      runVerification: (_detected, plan) => { verificationRan = true; return Promise.resolve(passed(_detected, plan)); },
    });
    expect(result.kind).toBe("halted");
    expect(result.verdict).toBe("UNKNOWN");
    expect(readM4T5File(project, project.paths[0] ?? "")).toBe(project.replacements.get(project.paths[0] ?? ""));
    expect(readM4T5File(project, project.paths[1] ?? "")).toBe(project.before.get(project.paths[1] ?? ""));
    expect(verificationRan).toBe(false);
  });

  it("halts after evidence persistence failure without fabricating proof", async () => {
    const project = addProject();
    let verificationRan = false;
    const result = await runM2Task({ rootDir: project.root, requestedTaskId: project.taskId }, {
      postWriteEvidence: { persist: () => { throw new Error("injected persistence failure"); } },
      runVerification: (_detected, plan) => { verificationRan = true; return Promise.resolve(passed(_detected, plan)); },
    });
    expect(result.kind).toBe("halted");
    expect(result.verdict).toBe("UNKNOWN");
    expect(readM4T5File(project, project.paths[0] ?? "")).toBe(project.replacements.get(project.paths[0] ?? ""));
    expect(readM4T5File(project, project.paths[1] ?? "")).toBe(project.before.get(project.paths[1] ?? ""));
    expect(verificationRan).toBe(false);
  });

  it("stops before the next target when a synchronous outcome observer fails", async () => {
    const project = addProject();
    let verificationRan = false;
    const result = await runM2Task({ rootDir: project.root, requestedTaskId: project.taskId }, {
      onTargetOutcome: () => { throw new Error("injected observer failure"); },
      runVerification: (_detected, plan) => { verificationRan = true; return Promise.resolve(passed(_detected, plan)); },
    });
    expect(result.kind).toBe("halted");
    expect(result.verdict).toBe("UNKNOWN");
    expect(readM4T5File(project, project.paths[0] ?? "")).toBe(project.replacements.get(project.paths[0] ?? ""));
    expect(readM4T5File(project, project.paths[1] ?? "")).toBe(project.before.get(project.paths[1] ?? ""));
    expect(verificationRan).toBe(false);
  });

  it("does not accept a changed set with an unauthorized Git-visible path", async () => {
    const project = addProject();
    const result = await runM2Task({ rootDir: project.root, requestedTaskId: project.taskId }, {
      runVerification: (detected, plan) => {
        writeFileSync(join(project.root, "src/unapproved.ts"), "outside target set\n");
        return Promise.resolve(passed(detected, plan));
      },
    });
    expect(result.kind).toBe("halted");
    expect(result.verdict).toBe("FAIL");
  });

  it("keeps Git-scope uncertainty as UNKNOWN", async () => {
    const project = addProject();
    const result = await runM2Task({ rootDir: project.root, requestedTaskId: project.taskId }, {
      projectScope: {
        gitStatusRunner: () => ({ status: null, signal: null, stdout: Buffer.alloc(0), error: new Error("unavailable") }),
      },
      runVerification: (detected, plan) => Promise.resolve(passed(detected, plan)),
    });
    expect(result.kind).toBe("halted");
    expect(result.verdict).toBe("UNKNOWN");
  });

  it("certifies a failed project check as non-accepted", async () => {
    const project = addProject();
    const result = await runM2Task({ rootDir: project.root, requestedTaskId: project.taskId }, {
      runVerification: (detected, plan) => Promise.resolve(passed(detected, plan).map((entry) =>
        entry.check === "test" ? { check: entry.check, kind: "failed" as const, exitCode: 1 } : entry,
      )),
    });
    expect(result.kind).toBe("halted");
    expect(result.verdict).toBe("FAIL");
  });
});
