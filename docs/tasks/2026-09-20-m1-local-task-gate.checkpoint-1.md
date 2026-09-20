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
- T6 preflight stopped before implementation; the human-approved
  contract correction is recorded in Scope Change 1 and M-D6..M-D9.

## Remaining Work

- T6 CLI `run` + worker jail
- T7 CLI `verify`
- T8 deterministic fixture
- T9 negative tests
- T10 determinism + surface audit
- T11 documentation closeout

## Changed Files

Committed T1–T5 work spans `package.json`, `package-lock.json`, TypeScript/ESLint/Vitest configuration, `src/`, and `tests/`. The current T6 preflight correction changes documentation only: M1 spec, M-D6..M-D9 ADR, Scope Change 1/T6–T8 handoff, canonical Task Record, task breakdown, T4/T6 seam link, STATE, checkpoint, and handoff.

## Decisions and Invariants

- Preserve human-approved M-D1..M-D5 and M-D6..M-D9.
- `.sureflow/state/` is authoritative runtime state; `docs/STATE.md` is never runtime input.
- Verifier verdicts remain exactly `PASS | FAIL | UNKNOWN | BLOCKED`; `UNKNOWN` never becomes `PASS`.
- The T4/T6 seam permits exactly one terminal evidence record per `(taskId, capability, target)`; retry observations belong in events.
- `PolicyDecision` and `VerificationVerdict` remain
  separate domains; default-deny remains in force.
- `REQUIRE_APPROVAL` is a terminal M1 policy halt with zero
  execution, zero retry, and no mapping to a verification verdict. M1 has
  no runtime approval-delivery mechanism.
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

The contract correction is documentation-only. T8 is now the gated
prerequisite to T6; T6 and T7 remain gated. The task remains
`checkpoint_due`.

## Prioritized Next Action

STOP. Await separate explicit T8 authorization; T6 and T7 remain gated.
