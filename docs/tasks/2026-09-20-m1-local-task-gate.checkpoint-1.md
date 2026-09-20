# Checkpoint 1: M1 deterministic local task gate

## Identity and State

- **Task ID**: `TASK-2026-09-20-m1-local-task-gate`
- **Task Record**: `docs/tasks/2026-09-20-m1-local-task-gate.md`
- **Specification**: `docs/specs/2026-09-20-m1-local-task-gate.md`
- **Checkpoint Date**: `2026-09-21`
- **Execution State**: `checkpoint_due`
- **Branch / Revision**: `main` at `e035cde`

## Objective

Deliver the bounded M1 control-plane slice with four CLI commands (`init`, `run`, `status`, `verify`), static policy, one fixture-jailed worker, append-only evidence, and deterministic verification.

## Completed Work

- T1 toolchain + scaffold — `d7a5d24`
- T2 state authority + policy decisions — `6ad617f`
- T3 append-only evidence + redaction — `a4f16af`
- T4 deterministic verifier — `7c70622`
- T5 CLI `init` + read-only `status` — `e035cde`
- Pre-checkpoint worktree was clean.
- Canonical M1 Task Record and task breakdown reconciled to T1–T5
  commit history in the checkpoint working tree.

## Remaining Work

- T6 CLI `run` + worker jail
- T7 CLI `verify`
- T8 deterministic fixture
- T9 negative tests
- T10 determinism + surface audit
- T11 documentation closeout

## Changed Files

Committed T1–T5 work spans `package.json`, `package-lock.json`, TypeScript/ESLint/Vitest configuration, `src/`, `tests/`, and the T4/T6 seam record. Current reconciliation changes are documentation-only: `docs/STATE.md`, the canonical M1 Task Record, task breakdown, this checkpoint record, and the paired handoff record.

## Decisions and Invariants

- Preserve the human-approved M-D1..M-D5 decisions in `docs/adrs/2026-09-20-stack-and-m1-boundary.md`.
- `.sureflow/state/` is authoritative runtime state; `docs/STATE.md` is never runtime input.
- Verifier verdicts remain exactly `PASS | FAIL | UNKNOWN | BLOCKED`; `UNKNOWN` never becomes `PASS`.
- The T4/T6 seam permits exactly one terminal evidence record per `(taskId, capability, target)`; retry observations belong in events.
- `PolicyDecision` and `VerificationVerdict` remain
  separate domains; default-deny remains in force.
- Protected operations require explicit human approval according to
  policy; no runtime approval-delivery mechanism is claimed as
  implemented.
- `expectedResult` comes from the approved
  acceptance/fixture contract, never from evidence.
- Maximum one automatic retry.
- No scope change was introduced by this checkpoint.

## Verification and CI Evidence

- `npm test` → 34 passed, 0 failed across 6 files.
- `npm run typecheck` → exit 0.
- `npm run lint` → exit 0.
- `node dist/src/cli.js status` → controlled exit 2 because no `.sureflow/state/` files exist; output requested `sureflow init`.
- CI: not run / no host-project CI evidence recorded.
- Hygiene: no secret-like tracked/untracked paths or `[DEBUG-*]` probes found; `.env` is ignored.
- Non-blocking warning: npm reports deprecated user config `ignore-workspace-root-check`.

## Blocker and Resume Condition

The canonical records are reconciled and T6 is NOT authorized. The task remains `checkpoint_due`; this documentation commit does not authorize any T6 implementation edit.

## Prioritized Next Action

STOP after the authorized reconciliation commit. T6 remains gated and requires separate explicit authorization.
