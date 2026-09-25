import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { appendM4Evidence } from "../src/m4VerificationBinding.js";
import { runM2Task } from "../src/m2Orchestration.js";
import type { DetectedNodeTypeScriptProject } from "../src/projectDetection.js";
import type { VerificationPlan, VerificationStepResult } from "../src/verificationAdapter.js";
import { cleanupM4T5Project, prepareM4T5Project, readM4T5File, type M4T5Project } from "./helpers/m4T5Project.js";

const projects: M4T5Project[] = [];

function passed(_project: DetectedNodeTypeScriptProject, plan: VerificationPlan): readonly VerificationStepResult[] {
  return plan.steps.map(({ check }) => ({ check, kind: "passed" as const, exitCode: 0 as const }));
}

afterEach(() => {
  for (const project of projects.splice(0)) cleanupM4T5Project(project);
});

describe("M4-T5 locked run orchestration", () => {
  it("persists fresh readback for each canonical write before verification", async () => {
    const project = prepareM4T5Project(2);
    projects.push(project);
    const events: string[] = [];
    const result = await runM2Task({ rootDir: project.root, requestedTaskId: project.taskId }, {
      postWriteEvidence: {
        readTargetBytes: (root, path) => {
          events.push(`read:${path}`);
          return readFileSync(join(root, path));
        },
        persist: (root, draft) => {
          events.push(`persist:${draft.target}`);
          return appendM4Evidence(root, draft);
        },
      },
      onTargetOutcome: (outcome) => events.push(`outcome:${outcome.path}`),
      runVerification: (detected, plan) => {
        events.push("verification");
        expect(project.paths.every((path) => readM4T5File(project, path) === project.replacements.get(path))).toBe(true);
        return Promise.resolve(passed(detected, plan));
      },
    });
    expect(result).toMatchObject({ kind: "accepted", verdict: "PASS", transitions: ["pending", "running", "accepted"] });
    expect(events).toEqual([
      "read:src/target-0.ts", "persist:src/target-0.ts", "outcome:src/target-0.ts",
      "read:src/target-1.ts", "persist:src/target-1.ts", "outcome:src/target-1.ts",
      "verification",
    ]);
  });

  it("writes the maximum five-target set in canonical path order", async () => {
    const project = prepareM4T5Project(5);
    projects.push(project);
    const outcomes: string[] = [];
    const result = await runM2Task({ rootDir: project.root, requestedTaskId: project.taskId }, {
      onTargetOutcome: (outcome) => outcomes.push(outcome.path),
      runVerification: (detected, plan) => Promise.resolve(passed(detected, plan)),
    });
    expect(result.kind).toBe("accepted");
    expect(outcomes).toEqual(project.paths.slice().sort());
    for (const path of project.paths) expect(readM4T5File(project, path)).toBe(project.replacements.get(path));
  });
});
