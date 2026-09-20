# Task Record: M1 deterministic local task gate

<a id="TASK-2026-09-20-m1-local-task-gate"></a>

## 1. Identity and Authority

- **Record Type**: `Task Record`
- **Task ID**: `TASK-2026-09-20-m1-local-task-gate`
- **PromptKit Adaptation Profile**: `none`
- **Work Type**: `Code Work`
- **Specification**: `docs/specs/2026-09-20-m1-local-task-gate.md`
- **External Reference (Optional)**: `N/A`
- **Owner / Actor**: `Human authority; implementation history through T5; Codex record reconciliation`
- **Execution Scope**: `Sureflow repo: M1 control-plane slice only (init/run/status/verify, static policy, single worker, JSONL evidence, fixtures/t0-basic/). No other subsystems.`
- **Approval Boundary**: `T1–T5 are committed repository history. T6 is planned, gated, and NOT authorized. T7–T11 are planned and not started. Human authorization remains required before T6, any protected operation according to policy, any commit/push/tag, or scope expansion beyond the 4 commands.`
- **Created**: `2026-09-20 UTC`
- **Decisions**: `docs/adrs/2026-09-20-stack-and-m1-boundary.md` (M-D1..M-D5, human, 2026-09-20)
## 2. Objective and Boundaries (M1 task record)

- **Objective**: Implement exactly the approved M1 slice in TS/Node,
  preserving its deterministic policy, evidence, and verification
  boundaries.
- **In Scope**: M1 T1–T11 as defined in
  `docs/tasks/2026-09-20-m1-task-breakdown.md`. T1–T5 are
  complete and committed; T6–T11 remain planned.
- **Explicit Non-Goals**: No multi-agent execution, MCP, skills,
  providers, scheduler, telemetry platform, cloud infrastructure,
  remote tracking, generalized approval machinery, or other
  deferred-subsystem design.
- **Dependencies**: `ADR-2026-09-20 (M-D1..M-D5)`; M0 discovery spec.
- **Risk**: `Medium — implementation must remain inside the approved
  M1 boundary and preserve fail-safe authorization and verification
  semantics`.
- **Mitigation**: `Binding non-goals + approval boundary; any
  expansion needs a scope-change record`.
## 3. Execution Policy (M1 task record)

- **Execution Mode**: `Gated Mode`
- **Checkpoint Policy**: `Current state checkpoint_due. The
  authorized documentation commit does not authorize implementation;
  T6 requires separate explicit authorization.`
- **Stop Conditions**: `Stop before T6 without explicit human
  authorization; stop on protected operations without policy-required
  human approval evidence; stop on scope expansion without a
  scope-change record; maximum one automatic retry.`
- **TDD Enforcement Mode**: `disabled`
- **TDD Intent Register**: `N/A - TDD Enforcement Mode disabled`
- **TDD Execution Evidence**: `N/A - TDD Enforcement Mode disabled`
- **TDD Exception Verification**: `N/A - Code Work`
## 4. Acceptance Criteria (spec step)

- [x] AC-S1: M1 spec §§1–9 complete, bounded, and human-reviewable.
- [x] AC-S2: All five M-D decisions cited to the ADR, not inferred.
- [x] AC-S3: AC-1..AC-8 stated with observable pass conditions.
- [x] AC-S4: §9 decisions recorded in the approved spec addendum.
- [x] AC-S5: Design baseline committed as `4942ca4`.

### Implementation Progress

- [x] T1 complete and committed — `d7a5d241137070c3e1046d3df34b97e04ab6eb0e`
- [x] T2 complete and committed — `6ad617fbe9e1c1d9a6f016818738f2fdb1cc33c3`
- [x] T3 complete and committed — `a4f16aff1a83a13041c5c442a3010b4455c1f25e`
- [x] T4 complete and committed — `7c70622e4a568e78953891ca5bd9ed45dace5253`
- [x] T5 complete and committed — `e035cdeb0bbf60973e8dd842154d9dcf4d7ce0fd`
- [ ] T6 planned / gated / NOT authorized
- [ ] T7–T11 planned / not started

## 4A. Locked Implementation Invariants

- M1 public surface remains `init` / `run` /
  `status` / `verify`.
- `.sureflow/state/` is authoritative runtime state.
  `docs/STATE.md` is PromptKit/process documentation only
  and is never Sureflow runtime input.
- `PolicyDecision` and `VerificationVerdict` are
  separate domains.
- Default-deny remains in force.
- Protected operations require explicit human approval according to
  policy. No runtime approval-delivery mechanism is claimed as
  implemented.
- `UNKNOWN` never becomes `PASS`.
- Retry and intermediate observations belong in events.
- Exactly one terminal verification-applicable evidence record is
  permitted per `(taskId, capability, target)`.
- `expectedResult` originates from the approved
  acceptance/fixture contract, never from evidence itself.
- Maximum one automatic retry.

## 5. State and Ownership (M1 task record)

- **Execution State**: `checkpoint_due`
- **Mapped pk:tasks Status**: `Checkpoint due — T6 authorization pending`
- **Active Task Pointer**: `TASK-2026-09-20-m1-local-task-gate`
- **Blockers and Resume Condition**: `Canonical records reconciled to T1–T5 history. T6 is NOT authorized. This documentation commit does not authorize implementation; resume only after separate explicit T6 authorization.`
- **Verification Status**: `T1–T5 commit history verified at HEAD e035cdeb0bbf60973e8dd842154d9dcf4d7ce0fd; checkpoint evidence records 34 passing tests plus clean typecheck and lint.`
- **CI Evidence**: `N/A`
- **Commit Evidence**: `4942ca4 design baseline; d7a5d24 T1; 6ad617f T2; a4f16af T3; 7c70622 T4; e035cde T5/HEAD`
- **Changed-File Summary**: `T1–T5 implementation committed; current working changes are canonical reconciliation documentation only.`
- **Next Action**: `STOP after the authorized reconciliation commit. Await separate explicit T6 authorization.`
- **Completion State**: `in_progress_checkpoint_due`
- **Acceptance Results**: `Spec acceptance complete; M1 AC-1..AC-8 remain pending final implementation and verification.`
- **Completion Exception**: `None`
- **Completion Decision and Timestamp**: `Pending — records reconciled 2026-09-21`
