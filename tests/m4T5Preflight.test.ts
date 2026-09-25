import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { mutationLockExists } from "../src/mutationLock.js";
import { readEvidence } from "../src/evidenceStore.js";
import { preflightM4Task } from "../src/preflight.js";
import { runM2Task } from "../src/m2Orchestration.js";
import { M2_ADAPTER_ID } from "../src/taskContract.js";
import type { VerificationPlan, VerificationStepResult } from "../src/verificationAdapter.js";
import { cleanupM4T5Project, prepareM4T5Project, readM4T5File, type M4T5Project } from "./helpers/m4T5Project.js";

const projects: M4T5Project[] = [];

function passed(plan: VerificationPlan): readonly VerificationStepResult[] {
  return plan.steps.map(({ check }) => ({ check, kind: "passed" as const, exitCode: 0 as const }));
}

afterEach(() => {
  for (const project of projects.splice(0)) cleanupM4T5Project(project);
});

describe("M4-T5 fresh execution preflight", () => {
  it("performs eligibility again while the shared execution lock is held", async () => {
    const project = prepareM4T5Project();
    projects.push(project);
    const phases: string[] = [];
    const result = await runM2Task({ rootDir: project.root, requestedTaskId: project.taskId }, {
      onPhase: (phase) => {
        phases.push(phase);
        if (phase === "replacement-preflighted") expect(mutationLockExists(project.root)).toBe(true);
      },
      runVerification: (_detected, plan) => Promise.resolve(passed(plan)),
    });
    const evidenceTargets = readEvidence(project.root)
      .filter((entry) => entry.kind === "record" && entry.record.taskId === project.taskId)
      .map((entry) => entry.kind === "record" ? [entry.record.capability, entry.record.target] : []);
    expect(evidenceTargets).toEqual([
      ["repo.read", "task-contract-prewrite-binding"],
      ["repo.write", "src/target-0.ts"],
      ["repo.write", "src/target-1.ts"],
      ["repo.read", "verification-input-binding"],
      ...["typecheck", "test", "lint", "build"].map((check) => ["repo.verify", `${M2_ADAPTER_ID}:${check}`]),
      ["repo.read", "project-scope"],
      ["repo.read", ".sureflow/task.json"],
    ]);
    expect(result.kind, result.reason).toBe("accepted");
    expect(phases).toContain("replacement-preflighted");
  });

  it("does not treat an earlier public ELIGIBLE result as a write lease", async () => {
    const project = prepareM4T5Project();
    projects.push(project);
    expect(preflightM4Task({ rootDir: project.root, requestedTaskId: project.taskId }).kind).toBe("eligible");
    const stalePath = project.paths[0];
    if (stalePath === undefined) throw new Error("fixture target missing");
    writeFileSync(join(project.root, stalePath), "changed after public preflight\n");
    writeFileSync(join(project.root, ".sureflow", "policy", "default.json"), "invalid policy\n");
    let verificationRan = false;
    const result = await runM2Task({ rootDir: project.root, requestedTaskId: project.taskId }, {
      runVerification: (_detected, plan) => {
        verificationRan = true;
        return Promise.resolve(passed(plan));
      },
    });
    expect(result.kind).toBe("halted");
    expect(result.reason).toContain("does not match its expected preimage digest");
    expect(readM4T5File(project, stalePath)).toBe("changed after public preflight\n");
    for (const path of project.paths.slice(1)) expect(readM4T5File(project, path)).toBe(project.before.get(path));
    expect(verificationRan).toBe(false);
  });

  it("keeps verification inputs ineligible for T5 mutation without changing public preflight", async () => {
    const project = prepareM4T5Project(2, ["package.json", "src/target-1.ts"]);
    projects.push(project);
    expect(preflightM4Task({ rootDir: project.root, requestedTaskId: project.taskId }).kind).toBe("eligible");
    let verificationRan = false;
    const result = await runM2Task({ rootDir: project.root, requestedTaskId: project.taskId }, {
      runVerification: (_detected, plan) => {
        verificationRan = true;
        return Promise.resolve(passed(plan));
      },
    });
    expect(result.kind).toBe("halted");
    expect(result.reason).toContain("cannot replace project verification inputs");
    expect(readM4T5File(project, "package.json")).toBe(project.before.get("package.json"));
    expect(readM4T5File(project, "src/target-1.ts")).toBe(project.before.get("src/target-1.ts"));
    expect(verificationRan).toBe(false);
  });
});
