import {
  mkdirSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { afterEach, describe, expect, it } from "vitest";
import {
  inspectM4PostWriteScope,
  inspectPostWriteScope,
  inspectProjectBaseline,
} from "../src/projectScope.js";
import {
  M2_ADAPTER_ID,
  M4_REPLACEMENT_OPERATION,
  M4_TASK_CONTRACT_RELATIVE_PATH,
  M4_TASK_CONTRACT_SCHEMA_VERSION,
} from "../src/taskContract.js";
import type { M4ValidatedExecutionPlan } from "../src/taskContract.js";
import {
  cleanupTemporaryRepositories,
  detectedProject,
  injectedRunner,
  runGit,
  statusOutput,
  temporaryGitRepository,
  validatedPlan,
} from "./helpers/projectScope.js";

afterEach(cleanupTemporaryRepositories);

function m4Plan(paths = ["src/target.ts", "src/other.ts"]): M4ValidatedExecutionPlan {
  return Object.freeze({
    schemaVersion: M4_TASK_CONTRACT_SCHEMA_VERSION,
    taskId: "task-m4-scope",
    adapter: M2_ADAPTER_ID,
    operation: M4_REPLACEMENT_OPERATION,
    targets: Object.freeze(paths.map((path) => Object.freeze({
      path,
      expectedBeforeSha256: "0".repeat(64),
      replacementContent: `replacement ${path}\n`,
    }))),
    requiredVerification: Object.freeze(["typecheck"] as const),
    contractSha256: "c".repeat(64),
    source: Object.freeze({ path: M4_TASK_CONTRACT_RELATIVE_PATH, sha256: "c".repeat(64) }),
  });
}

describe("M2-T5 project scope inspection", () => {
  it("reports a clean repository baseline", () => {
    const root = temporaryGitRepository();

    expect(inspectProjectBaseline(detectedProject(root))).toEqual({
      kind: "clean",
      snapshot: { changedPaths: [] },
    });
  });

  it("excludes .sureflow changes from the project baseline", () => {
    const root = temporaryGitRepository();
    mkdirSync(`${root}/.sureflow`);
    writeFileSync(`${root}/.sureflow/state.json`, "runtime\n");

    expect(inspectProjectBaseline(detectedProject(root))).toEqual({
      kind: "clean",
      snapshot: { changedPaths: [] },
    });
  });

  it("reports an unstaged tracked modification as a dirty baseline", () => {
    const root = temporaryGitRepository();
    writeFileSync(`${root}/src/target.ts`, "changed\n");

    expect(inspectProjectBaseline(detectedProject(root))).toEqual({
      kind: "dirty",
      snapshot: { changedPaths: ["src/target.ts"] },
    });
  });

  it("reports a tracked deletion as a dirty baseline", () => {
    const root = temporaryGitRepository();
    unlinkSync(`${root}/src/other.ts`);

    expect(inspectProjectBaseline(detectedProject(root))).toEqual({
      kind: "dirty",
      snapshot: { changedPaths: ["src/other.ts"] },
    });
  });

  it("reports a staged addition as a dirty baseline", () => {
    const root = temporaryGitRepository();
    writeFileSync(`${root}/src/staged.ts`, "staged\n");
    runGit(root, ["add", "src/staged.ts"]);

    expect(inspectProjectBaseline(detectedProject(root))).toEqual({
      kind: "dirty",
      snapshot: { changedPaths: ["src/staged.ts"] },
    });
  });

  it("reports a non-ignored untracked path as a dirty baseline", () => {
    const root = temporaryGitRepository();
    writeFileSync(`${root}/untracked.txt`, "untracked\n");

    expect(inspectProjectBaseline(detectedProject(root))).toEqual({
      kind: "dirty",
      snapshot: { changedPaths: ["untracked.txt"] },
    });
  });

  it("does not claim ignored-file enforcement", () => {
    const root = temporaryGitRepository();
    writeFileSync(`${root}/.gitignore`, "ignored.txt\n");
    runGit(root, ["add", ".gitignore"]);
    runGit(root, ["commit", "-m", "ignore test file"]);
    writeFileSync(`${root}/ignored.txt`, "ignored\n");

    expect(inspectProjectBaseline(detectedProject(root))).toEqual({
      kind: "clean",
      snapshot: { changedPaths: [] },
    });
  });

  it("reports exactly the authorized target as compliant post-write scope", () => {
    const root = temporaryGitRepository();
    writeFileSync(`${root}/src/target.ts`, "replacement\n");

    expect(inspectPostWriteScope(detectedProject(root), validatedPlan())).toEqual({
      kind: "compliant",
      compliant: true,
      changedPaths: ["src/target.ts"],
      unauthorizedPaths: [],
    });
  });

  it("reports an unrelated tracked modification as a scope violation", () => {
    const root = temporaryGitRepository();
    writeFileSync(`${root}/src/target.ts`, "replacement\n");
    writeFileSync(`${root}/src/other.ts`, "unrelated\n");

    expect(inspectPostWriteScope(detectedProject(root), validatedPlan())).toMatchObject({
      kind: "violation",
      compliant: false,
      changedPaths: ["src/other.ts", "src/target.ts"],
      unauthorizedPaths: ["src/other.ts"],
    });
  });

  it("reports an unrelated non-ignored untracked path as a scope violation", () => {
    const root = temporaryGitRepository();
    writeFileSync(`${root}/src/target.ts`, "replacement\n");
    writeFileSync(`${root}/unrelated.txt`, "unrelated\n");

    expect(inspectPostWriteScope(detectedProject(root), validatedPlan())).toMatchObject({
      kind: "violation",
      compliant: false,
      unauthorizedPaths: ["unrelated.txt"],
    });
  });

  it("reports only an unrelated project change as a violation", () => {
    const root = temporaryGitRepository();
    writeFileSync(`${root}/src/other.ts`, "unrelated\n");

    expect(inspectPostWriteScope(detectedProject(root), validatedPlan())).toMatchObject({
      kind: "violation",
      compliant: false,
      changedPaths: ["src/other.ts"],
      unauthorizedPaths: ["src/other.ts"],
      reason: "authorized target change was not observed",
    });
  });

  it("does not treat a rename record as an approved replacement", () => {
    const root = temporaryGitRepository();
    const dependencies = injectedRunner(statusOutput("R  src/renamed.ts", "src/target.ts"));

    expect(inspectPostWriteScope(detectedProject(root), validatedPlan(), dependencies)).toMatchObject({
      kind: "violation",
      compliant: false,
      changedPaths: ["src/renamed.ts", "src/target.ts"],
      unauthorizedPaths: ["src/renamed.ts"],
      reason: "rename or copy structure is not an approved replacement",
    });
  });

  it("excludes .sureflow from post-write scope while retaining project changes", () => {
    const root = temporaryGitRepository();
    mkdirSync(`${root}/.sureflow`);
    writeFileSync(`${root}/.sureflow/state.json`, "runtime\n");
    writeFileSync(`${root}/src/target.ts`, "replacement\n");

    expect(inspectPostWriteScope(detectedProject(root), validatedPlan())).toEqual({
      kind: "compliant",
      compliant: true,
      changedPaths: ["src/target.ts"],
      unauthorizedPaths: [],
    });
  });

  it("rejects a target path that is not a normalized project-relative path", () => {
    const root = temporaryGitRepository();

    expect(inspectPostWriteScope(
      detectedProject(root, "../outside.ts"),
      validatedPlan("../outside.ts"),
    )).toMatchObject({ kind: "invalid", compliant: false });
  });

  it("does not claim compliance when the authorized target is absent", () => {
    const root = temporaryGitRepository();
    const dependencies = injectedRunner(statusOutput(" M src/other.ts"));

    expect(inspectPostWriteScope(detectedProject(root), validatedPlan(), dependencies)).toMatchObject({
      kind: "violation",
      compliant: false,
      unauthorizedPaths: ["src/other.ts"],
    });
  });
});

describe("M4 exact target-set project scope", () => {
  it("accepts only the complete authorized changed set", () => {
    const root = temporaryGitRepository();
    writeFileSync(`${root}/src/target.ts`, "target changed\n");
    writeFileSync(`${root}/src/other.ts`, "other changed\n");

    expect(inspectM4PostWriteScope(detectedProject(root), m4Plan())).toMatchObject({
      kind: "compliant",
      compliant: true,
      changedPaths: ["src/other.ts", "src/target.ts"],
      missingPaths: [],
      unauthorizedPaths: [],
    });
  });

  it("fails closed when an authorized target is missing from Git status", () => {
    const root = temporaryGitRepository();
    writeFileSync(`${root}/src/target.ts`, "target changed\n");

    expect(inspectM4PostWriteScope(detectedProject(root), m4Plan())).toMatchObject({
      kind: "violation",
      missingPaths: ["src/other.ts"],
    });
  });

  it("reports an extra project path without authorizing it", () => {
    const root = temporaryGitRepository();
    writeFileSync(`${root}/src/target.ts`, "target changed\n");
    writeFileSync(`${root}/src/other.ts`, "other changed\n");
    writeFileSync(`${root}/extra.ts`, "extra\n");

    expect(inspectM4PostWriteScope(detectedProject(root), m4Plan())).toMatchObject({
      kind: "violation",
      unauthorizedPaths: ["extra.ts"],
    });
  });

  it("rejects rename or copy observations", () => {
    const root = temporaryGitRepository();
    const result = inspectM4PostWriteScope(
      detectedProject(root),
      m4Plan(),
      injectedRunner(statusOutput("R  src/target.ts", "src/renamed.ts", " M src/other.ts")),
    );

    expect(result).toMatchObject({
      kind: "violation",
      reason: "rename or copy structure is not an approved bounded replacement",
    });
  });

  it("reports unavailable Git observation without claiming compliance", () => {
    const root = temporaryGitRepository();
    const result = inspectM4PostWriteScope(
      detectedProject(root),
      m4Plan(),
      injectedRunner(Buffer.alloc(0), { error: new Error("spawn failed"), status: null }),
    );

    expect(result).toMatchObject({ kind: "unavailable", compliant: false });
  });

  it("rejects duplicate targets and project context outside the target set", () => {
    const root = temporaryGitRepository();

    expect(inspectM4PostWriteScope(detectedProject(root), m4Plan(["src/target.ts", "src/target.ts"])))
      .toMatchObject({ kind: "invalid" });
    expect(inspectM4PostWriteScope(detectedProject(root, "outside.ts"), m4Plan()))
      .toMatchObject({ kind: "invalid" });
  });
});
