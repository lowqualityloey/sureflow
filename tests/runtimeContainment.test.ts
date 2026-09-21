import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { defaultEventsPath } from "../src/eventStore.js";
import { appendEvidence, readEvidence } from "../src/evidenceStore.js";
import { resolveEvidencePath } from "../src/evidencePaths.js";
import { resolveStatePath } from "../src/state.js";
import { resolveSureflowPath } from "../src/sureflowPaths.js";
import type { EvidenceDraft } from "../src/evidence.js";

const temporaryRoots: string[] = [];

function tempRoot(): string {
  const root = mkdtempSync(join(tmpdir(), "sureflow-h3-"));
  temporaryRoots.push(root);
  return root;
}

function symlinkSupport(): boolean {
  const root = mkdtempSync(join(tmpdir(), "sureflow-h3-support-"));
  try {
    mkdirSync(join(root, "target"));
    symlinkSync(join(root, "target"), join(root, "link"), "dir");
    return true;
  } catch {
    return false;
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

const canCreateSymlinks = symlinkSupport();

const draft: EvidenceDraft = {
  actor: "worker:test",
  recordedAt: "2026-09-21T00:00:00.000Z",
  taskId: "TASK-H3",
  capability: "repo.test",
  policyDecision: "ALLOW",
  target: "fixtures/t0-basic/output.txt",
  result: "ok",
  provenance: "focused H3 test",
};

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe("H3 lexical runtime containment", () => {
  it("continues to refuse lexical traversal", () => {
    const root = tempRoot();
    expect(() => resolveStatePath(root, ".sureflow/state/../events/events.jsonl")).toThrow();
    expect(() => resolveEvidencePath(root, ".sureflow/evidence/../state/evidence.jsonl")).toThrow();
  });

  it("allows ordinary in-bound runtime paths", () => {
    const root = tempRoot();
    expect(resolveStatePath(root, ".sureflow/state/tasks/task.json")).toBe(
      join(root, ".sureflow/state/tasks/task.json"),
    );
    expect(resolveEvidencePath(root, ".sureflow/evidence/evidence.jsonl")).toBe(
      join(root, ".sureflow/evidence/evidence.jsonl"),
    );
  });
});

describe("H3 physical runtime containment", () => {
  it.skipIf(!canCreateSymlinks)("refuses a state namespace symlink escape", () => {
    const root = tempRoot();
    mkdirSync(join(root, ".sureflow"));
    mkdirSync(join(root, "outside-state"));
    symlinkSync(join(root, "outside-state"), join(root, ".sureflow/state"), "dir");

    expect(() => resolveStatePath(root, ".sureflow/state/tasks/task.json")).toThrow(/symlink|escapes/);
  });

  it.skipIf(!canCreateSymlinks)("refuses an evidence namespace symlink escape", () => {
    const root = tempRoot();
    mkdirSync(join(root, ".sureflow"));
    mkdirSync(join(root, "outside-evidence"));
    symlinkSync(join(root, "outside-evidence"), join(root, ".sureflow/evidence"), "dir");

    expect(() => resolveEvidencePath(root, ".sureflow/evidence/evidence.jsonl")).toThrow(
      /symlink|escapes/,
    );
  });

  it.skipIf(!canCreateSymlinks)("refuses generic runtime escapes used by events and policy", () => {
    const root = tempRoot();
    mkdirSync(join(root, "outside-runtime"));
    symlinkSync(join(root, "outside-runtime"), join(root, ".sureflow"), "dir");

    expect(() => defaultEventsPath(root)).toThrow(/symlink|escapes/);
    expect(() => resolveSureflowPath(root, ".sureflow/policy/default.json")).toThrow(
      /symlink|escapes/,
    );
  });

  it.skipIf(!canCreateSymlinks)("refuses an evidence symlink crossing into state", () => {
    const root = tempRoot();
    mkdirSync(join(root, ".sureflow/state"), { recursive: true });
    symlinkSync(join(root, ".sureflow/state"), join(root, ".sureflow/evidence"), "dir");

    expect(() => resolveEvidencePath(root, ".sureflow/evidence/evidence.jsonl")).toThrow(
      /symlink|escapes/,
    );
  });

  it.skipIf(!canCreateSymlinks)("allows a symlink that remains inside the state boundary", () => {
    const root = tempRoot();
    mkdirSync(join(root, ".sureflow/state/actual"), { recursive: true });
    symlinkSync(join(root, ".sureflow/state/actual"), join(root, ".sureflow/state/alias"), "dir");

    expect(() => resolveStatePath(root, ".sureflow/state/alias/task.json")).not.toThrow();
  });
});

describe("H3 evidence store path override", () => {
  it("refuses an optional evidence path outside the evidence namespace", () => {
    const root = tempRoot();
    mkdirSync(join(root, "outside"));
    const outsidePath = join(root, "outside/evidence.jsonl");

    expect(() => appendEvidence(root, draft, outsidePath)).toThrow(/outside/);
    expect(() => readEvidence(root, outsidePath)).toThrow(/outside/);
    expect(() =>
      appendEvidence(root, draft, `${root}/.sureflow/evidence/../evidence/lexical.jsonl`),
    ).toThrow(
      /escapes/,
    );
  });

  it("preserves safe explicit in-bound evidence paths", () => {
    const root = tempRoot();
    const explicitPath = join(root, ".sureflow/evidence/explicit.jsonl");
    appendEvidence(root, draft, explicitPath);

    expect(readFileSync(explicitPath, "utf8")).toContain('"taskId":"TASK-H3"');
    expect(readEvidence(root, explicitPath)).toHaveLength(1);
  });
});

if (!canCreateSymlinks) {
  it.skip("H3 symlink cases skipped: directory symlink creation is unsupported in this environment");
}
