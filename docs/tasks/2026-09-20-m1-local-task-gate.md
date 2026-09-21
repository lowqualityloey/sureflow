# Task Record: M1 deterministic local task gate

<a id="TASK-2026-09-20-m1-local-task-gate"></a>

## 1. Identity and Authority

- **Record Type**: `Task Record`
- **Task ID**: `TASK-2026-09-20-m1-local-task-gate`
- **PromptKit Adaptation Profile**: `none`
- **Work Type**: `Code Work`
- **Specification**: `docs/specs/2026-09-20-m1-local-task-gate.md`
- **External Reference (Optional)**: `N/A`
- **Owner / Actor**: `Human authority; implementation history through T5; Codex T8 implementation`
- **Execution Scope**: `Sureflow repo: M1 control-plane slice only (init/run/status/verify, static policy, single worker, JSONL evidence, fixtures/t0-basic/). No other subsystems.`
- **Approval Boundary**: `T1–T5 and the T6 preflight contracts are committed repository history. T8 implementation was explicitly authorized, accepted, locally verified, and authorized for this commit. T6, T7, and T9–T11 remain gated and NOT authorized. Human authorization remains required before further implementation, push/tag, or scope expansion beyond the 4 commands. Protected operations terminally halt at REQUIRE_APPROVAL in M1; no approval-delivery mechanism exists.`
- **Created**: `2026-09-20 UTC`
- **Decisions**: `docs/adrs/2026-09-20-stack-and-m1-boundary.md` (M-D1..M-D5) and `docs/adrs/2026-09-21-m1-t6-preflight-contracts.md` (M-D6..M-D9)
- **Scope Change**: `docs/tasks/2026-09-20-m1-local-task-gate.scope-1.md`
## 2. Objective and Boundaries (M1 task record)

- **Objective**: Implement exactly the approved M1 slice in TS/Node,
  preserving its deterministic policy, evidence, and verification
  boundaries.
- **In Scope**: M1 T1–T11 as defined in
  `docs/tasks/2026-09-20-m1-task-breakdown.md`. T1–T5 are
  complete and committed; T8 is implemented, accepted, and included in
  this commit; T6, T7, and T9–T11 remain gated.
- **Explicit Non-Goals**: No multi-agent execution, MCP, skills,
  providers, scheduler, telemetry platform, cloud infrastructure,
  remote tracking, generalized approval machinery, or other
  deferred-subsystem design.
- **Dependencies**: `ADR-2026-09-20 (M-D1..M-D5)`,
  `ADR-2026-09-21 (M-D6..M-D9)`, Scope Change 1, and M0
  discovery spec.
- **Risk**: `Medium — implementation must remain inside the approved
  M1 boundary and preserve fail-safe authorization and verification
  semantics`.
- **Mitigation**: `Binding non-goals + approval boundary; any
  expansion needs a scope-change record`.
## 3. Execution Policy (M1 task record)

- **Execution Mode**: `Gated Mode`
- **Checkpoint Policy**: `T8 implementation was separately authorized,
  accepted, and committed. Stop before T6; T6 remains gated until it is
  separately authorized.`
- **Stop Conditions**: `Stop before T6 or any later task without separate
  explicit authorization; terminally halt on DENY or REQUIRE_APPROVAL
  with zero execution and zero retry; stop on scope expansion without a
  scope-change record; maximum one automatic retry for eligible FAIL only.`
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
- [x] T8 minimal fixture contract — complete / accepted / committed in this changeset
- [ ] T6 run + worker — depends on T8 / gated / NOT authorized
- [ ] T7 and T9–T11 planned / gated / not started

## 4A. Locked Implementation Invariants

- M1 public surface remains `init` / `run` /
  `status` / `verify`.
- `.sureflow/state/` is authoritative runtime state.
  `docs/STATE.md` is PromptKit/process documentation only
  and is never Sureflow runtime input.
- `PolicyDecision` and `VerificationVerdict` are
  separate domains.
- Default-deny remains in force.
- `REQUIRE_APPROVAL` is a terminal M1 policy-layer halt: zero
  execution, zero retry, and no mapping to
  `VerificationVerdict.BLOCKED`. M1 has no approval-delivery
  mechanism.
- `repo.test` accepts only `testProfile: "npm-test"` and
  uses fixed npm/`["test"]` dispatch with `shell: false`.
  No caller-controlled executable or argv is accepted.
- cwd containment is not an OS sandbox; hard subprocess isolation is not
  claimed or authorized for M1.
- `UNKNOWN` never becomes `PASS`.
- Retry and intermediate observations belong in events.
- Exactly one terminal verification-applicable evidence record is
  permitted per `(taskId, capability, target)`.
- `expectedResult` originates from the approved
  acceptance/fixture contract, never from evidence itself.
- The T0 fixture is the approved source of `target` and
  `expectedResult` for the M1 acceptance path. T4 supplies neither;
  it consumes both through `VerificationRequest`. Runtime evidence
  must never become the source of `expectedResult`.
- Maximum one automatic retry.

## 5. State and Ownership (M1 task record)

- **Execution State**: `checkpoint_due`
- **Mapped pk:tasks Status**: `T8 complete and committed — T6 and T7 gated`
- **Active Task Pointer**: `TASK-2026-09-20-m1-local-task-gate`
- **Blockers and Resume Condition**: `T6 requires separate explicit implementation authorization. T6 and T7 remain gated.`
- **Verification Status**: `T8 focused suite: 16 passing tests. Full suite: 50 passing tests across 7 files. Typecheck, lint, build, git diff check, and scope/secret/debug/runtime-artifact guards pass.`
- **CI Evidence**: `N/A`
- **Commit Evidence**: `4942ca4 design baseline; d7a5d24 T1; 6ad617f T2; a4f16af T3; 7c70622 T4; e035cde T5; d5e7bcb history reconciliation; ad5adc3 T6 preflight contracts; T8 committed in this changeset (hash reported after creation)`
- **Changed-File Summary**: `T8 adds fixtures/t0-basic/task.json, a fixture-specific strict parser/loader, focused tests, and TypeScript test inclusion; this Task Record and the task breakdown record the authorized uncommitted state. No T6/T7 implementation or runtime artifacts.`
- **Next Action**: `STOP. T6 and T7 remain gated; await separate explicit T6 authorization.`
- **Completion State**: `checkpoint_due`
- **Acceptance Results**: `Spec acceptance complete; M1 AC-1..AC-8 remain pending final implementation and verification.`
- **Completion Exception**: `None`
- **Completion Decision and Timestamp**: `T8 accepted and authorized for commit 2026-09-21; committed in this changeset`
