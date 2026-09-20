# Handoff 1: M1 deterministic local task gate

## Receiver Validation

- **Task ID**: `TASK-2026-09-20-m1-local-task-gate`
- **Task Record**: `docs/tasks/2026-09-20-m1-local-task-gate.md`
- **Specification**: `docs/specs/2026-09-20-m1-local-task-gate.md`
- **Branch / Revision**: `main` at baseline `d5e7bcb`
- **Execution State**: `checkpoint_due`
- **Acceptance Boundary**: M1 AC-1 through AC-8; T1–T5 are committed; T8 is the gated prerequisite to gated T6; T7 and T9–T11 remain gated.

## Current State

The repository contains committed M1 implementation through T5. T6
preflight stopped before implementation and produced the human-approved
M-D6..M-D9 correction. T8 now precedes T6; both remain gated. T7 and
T9–T11 remain gated/not started.

## Key Files

- `docs/tasks/2026-09-20-m1-local-task-gate.md`: canonical task record reconciled to T1–T5 history.
- `docs/tasks/2026-09-20-m1-task-breakdown.md`: reconciled T1–T11 status and authorization boundary.
- `docs/tasks/2026-09-20-m1-local-task-gate.scope-1.md`:
  T6/T8 dependency and contract correction handoff.
- `docs/adrs/2026-09-21-m1-t6-preflight-contracts.md`:
  accepted M-D6..M-D9 decisions.
- `docs/tasks/2026-09-20-t4-t6-evidence-seam.md`: binding T4/T6 evidence cardinality handoff.
- `src/cli.ts`: T5 CLI surface; future T6/T7 integration point.
- `src/state.ts`, `src/policy.ts`, `src/evidenceStore.ts`, `src/verifier.ts`: implemented T2–T4 contracts.
- `tests/`: 34 passing tests covering T1–T5 seams.

## Locked Invariants

- Keep M1 bounded to `init`, `run`, `status`, and `verify`; no deferred subsystem code paths.
- `.sureflow/state/` is authoritative and `docs/STATE.md` is never runtime input.
- Policy is default-deny; `REQUIRE_APPROVAL` terminally halts
  with zero execution and zero retry.
- `UNKNOWN` never becomes `PASS`; missing, stale, corrupt, or ambiguous evidence must halt safely.
- Retry attempts are events; exactly one terminal evidence record may exist per `(taskId, capability, target)`.
- `PolicyDecision` and `VerificationVerdict` are
  separate domains.
- `REQUIRE_APPROVAL` does not map to
  `VerificationVerdict.BLOCKED`, and M1 has no runtime
  approval-delivery mechanism.
- `repo.test` accepts only `testProfile: "npm-test"`
  and maps to executable `npm`, fixed `["test"]` argv,
  `shell: false`, and bounded-worker-root cwd.
- cwd containment is not an OS sandbox; hard subprocess isolation is not
  claimed for M1.
- `expectedResult` comes from the approved
  acceptance/fixture contract, never from evidence.
- Maximum one automatic retry.

## Blocker and Resume Condition

The contract correction is reconciled. T8 is NOT authorized; T6 depends on
T8 and remains gated; T7 remains gated. The task remains
`checkpoint_due`.

## Prioritized Next Action

STOP. Await separate explicit T8 authorization; T6 and T7 remain gated.
