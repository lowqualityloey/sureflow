/**
 * Pure `sureflow status` renderer (T5).
 *
 * Renders the approved M1 four-part view — what happened, what was
 * verified, what is uncertain, what needs the human — from the
 * authoritative state outcome only. Runtime status is NEVER derived
 * from `docs/STATE.md`, PromptKit task records, or checkpoint
 * records (AC-6).
 */
import type { StateReadOutcome } from "./stateReader.js";

/** Exit codes from the approved §9 CLI contract (no new classes). */
export const EXIT_ACCEPTED = 0 as const;
export const EXIT_CONTROLLED_HALT = 2 as const;

export function statusExitCode(outcome: StateReadOutcome): number {
  return outcome.kind === "ok" ? EXIT_ACCEPTED : EXIT_CONTROLLED_HALT;
}

export function formatStatusLines(outcome: StateReadOutcome): readonly string[] {
  if (outcome.kind === "ok") {
    const active = outcome.active.activeTaskId ?? "none";
    return [
      "Sureflow status (read-only)",
      `Happened: project "${outcome.project.projectName}" initialized ${outcome.project.initializedAt}`,
      ...outcome.tasks.map((task) => `Happened: ${task.taskId}: ${task.status}`),
      `Verified: state contract valid (schemaVersion ${String(outcome.project.schemaVersion)}); verification verdicts: none recorded`,
      `Uncertain: none recorded; active task: ${active}`,
      "Human: no action required",
    ];
  }
  if (outcome.kind === "not-initialized") {
    return [
      "Sureflow status (read-only)",
      `Happened: ${outcome.detail}`,
      "Verified: nothing (no runtime state to verify)",
      "Uncertain: whether this project has been initialized",
      "Human: run `sureflow init`",
    ];
  }
  return [
    "Sureflow status (read-only)",
    "Happened: runtime state present but not interpretable",
    "Verified: nothing (state failed T2 contract validation); no automatic repair exists",
    ...outcome.problems.map((problem) => `Uncertain: ${problem}`),
    "Human: inspect .sureflow/state/ manually, then re-run `sureflow init --force` if it should be reset",
  ];
}

export function formatMutationInProgressLines(): readonly string[] {
  return [
    "Sureflow status (read-only)",
    "Happened: mutation in progress; stable snapshot unavailable",
    "Verified: nothing (authoritative state was not read while execution.lock exists)",
    "Uncertain: the current mutation outcome is not yet available",
    "Human: wait for the mutation to finish or confirm manual stale-lock recovery",
  ];
}
