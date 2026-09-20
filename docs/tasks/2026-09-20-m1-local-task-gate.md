# Task Record: M1 deterministic local task gate

<a id="TASK-2026-09-20-m1-local-task-gate"></a>

## 1. Identity and Authority

- **Record Type**: `Task Record`
- **Task ID**: `TASK-2026-09-20-m1-local-task-gate`
- **PromptKit Adaptation Profile**: `none`
- **Work Type**: `Code Work`
- **Specification**: `docs/specs/2026-09-20-m1-local-task-gate.md`
- **External Reference (Optional)**: `N/A`
- **Owner / Actor**: `Cline + human (authority)`
- **Execution Scope**: `Sureflow repo: M1 control-plane slice only (init/run/status/verify, static policy, single worker, JSONL evidence, fixtures/t0-basic/). No other subsystems.`
- **Approval Boundary**: `Human approval required before: implementation start, package-manager/test-runner choice, any commit/push/tag, any scope expansion beyond the 4 commands`
- **Created**: `2026-09-20 UTC`
- **Decisions**: `docs/adrs/2026-09-20-stack-and-m1-boundary.md` (M-D1..M-D5, human, 2026-09-20)
## 2. Objective and Boundaries (M1 task record)

- **Objective**: Specify (not implement) the M1 slice above so a
  human can approve it, then implement exactly that in TS/Node.
- **In Scope**: M1 spec §§1–9; acceptance criteria; open questions
  (§9); verification plan. No code in this step.
- **Explicit Non-Goals**: No implementation, scaffolding, installs,
  commits, or deferred-subsystem design.
- **Dependencies**: `ADR-2026-09-20 (M-D1..M-D5)`; M0 discovery spec.
- **Risk**: `Medium — spec must prevent scope creep into the full
  12-subsystem core`.
- **Mitigation**: `Binding non-goals + approval boundary; any
  expansion needs a scope-change record`.
## 3. Execution Policy (M1 task record)

- **Execution Mode**: `Gated Mode`
- **Checkpoint Policy**: `Soft checkpoint when spec is ready for
  review; hard at ~30 turns`
- **Stop Conditions**: `Stop if implementation requested before
  approval, or scope expansion requested without scope-change record`
- **TDD Enforcement Mode**: `disabled`
- **TDD Intent Register**: `N/A - TDD Enforcement Mode disabled`
- **TDD Execution Evidence**: `N/A - TDD Enforcement Mode disabled`
- **TDD Exception Verification**: `N/A - Code Work`
## 4. Acceptance Criteria (spec step)

- [ ] AC-S1: M1 spec §§1–9 complete, bounded, and human-reviewable.
- [ ] AC-S2: All five M-D decisions cited to the ADR, not inferred.
- [ ] AC-S3: AC-1..AC-8 stated with observable pass conditions.
- [ ] AC-S4: Open questions (§9) listed with owners; no package
  manager / Node pin / test runner assumed.
- [ ] AC-S5: STATE.md + M0 record updated; zero implementation code.
## 5. State and Ownership (M1 task record)

- **Execution State**: `in_progress`
- **Mapped pk:tasks Status**: `In Progress`
- **Active Task Pointer**: `TASK-2026-09-20-m1-local-task-gate`
- **Blockers and Resume Condition**: `T1 authorized; T2..T11 gated until T1 accepted + explicit per-task authorization`
- **Verification Status**: `Spec review only; no suite exists yet`
- **CI Evidence**: `N/A`
- **Commit Evidence (design baseline — pre-existing field was absent, appended post-commit per pk:commit gate)**: `4942ca4acd8c75c580cbfe98b16888948cb669f7 — docs(baseline) 2026-09-20; T1..T11 not started`
- **Changed-File Summary**: `ADR + M1 spec + M1 Task Record (new);
  M0 record + STATE.md + PROMPTKIT.md §§1–2 (updated)`
- **Next Action**: `Human reviews final M1 spec + AC for approval`
- **Completion State**: `awaiting_review`
- **Acceptance Results**: `AC-S1..AC-S5 pending human review`
- **Completion Exception**: `None`
- **Completion Decision and Timestamp**: `Pending — 2026-09-20`
