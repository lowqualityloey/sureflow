# Task Record: M1 deterministic local task gate

<a id="TASK-2026-09-20-m1-local-task-gate"></a>

## 1. Identity and Authority

- **Record Type**: `Task Record`
- **Task ID**: `TASK-2026-09-20-m1-local-task-gate`
- **PromptKit Adaptation Profile**: `none`
- **Work Type**: `Code Work`
- **Specification**: `docs/specs/2026-09-20-m1-local-task-gate.md`
- **External Reference (Optional)**: `N/A`
- **Owner / Actor**: `Human authority; implementation and closeout history through T11; Codex authorized T11 documentation/acceptance closeout`
- **Execution Scope**: `Sureflow repo: M1 control-plane slice only (init/run/status/verify, static policy, single worker, JSONL evidence, fixtures/t0-basic/). No other subsystems.`
- **Approval Boundary**: `T1–T11, including T5 status observability, T6 integration acceptance, T7 verification, T9 negative acceptance, T10 determinism/surface audit, and T11 documentation/acceptance closeout, are committed repository history. Future milestones, push, and tag operations are not authorized. Protected operations terminally halt at REQUIRE_APPROVAL in M1; no approval-delivery mechanism exists.`
- **Created**: `2026-09-20 UTC`
- **Decisions**: `docs/adrs/2026-09-20-stack-and-m1-boundary.md` (M-D1..M-D5) and `docs/adrs/2026-09-21-m1-t6-preflight-contracts.md` (M-D6..M-D13)
- **Scope Change**: `docs/tasks/2026-09-20-m1-local-task-gate.scope-1.md`
## 2. Objective and Boundaries (M1 task record)

- **Objective**: Implement exactly the approved M1 slice in TS/Node,
  preserving its deterministic policy, evidence, and verification
  boundaries.
- **In Scope**: M1 T1–T11 as defined in
  `docs/tasks/2026-09-20-m1-task-breakdown.md`. T1–T5 are
  complete and committed; T8 is committed at `a66fccc`; the second T6
  preflight contract correction is committed at `ee3b66d`; T6 implementation and integration acceptance are complete from the runnable T0 path; T7 verification, T9 negative acceptance, T10 determinism/surface audit, and T11 documentation/acceptance closeout are complete.
- **Explicit Non-Goals**: No multi-agent execution, MCP, skills,
  providers, scheduler, telemetry platform, cloud infrastructure,
  remote tracking, generalized approval machinery, or other
  deferred-subsystem design.
- **Dependencies**: `ADR-2026-09-20 (M-D1..M-D5)`,
  `ADR-2026-09-21 (M-D6..M-D13)`, Scope Change 1, and M0
  discovery spec.
- **Risk**: `Medium — implementation must remain inside the approved
  M1 boundary and preserve fail-safe authorization and verification
  semantics`.
- **Mitigation**: `Binding non-goals + approval boundary; any
  expansion needs a scope-change record`.
## 3. Execution Policy (M1 task record)

- **Execution Mode**: `Gated Mode`
- **Checkpoint Policy**: `T11 documentation and acceptance closeout complete. Stop; do not begin future milestones.`
- **Stop Conditions**: `Stop before any future milestone without separate
  explicit authorization; terminally halt on DENY or REQUIRE_APPROVAL
  with zero execution and zero retry; stop on scope expansion without a
  scope-change record; retry only an initial started-process nonzero numeric
  exit, at most once, and never run verification before retry resolution.`
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
- [x] T8 minimal fixture contract — complete / accepted / committed `a66fccc`
- [x] T6 run + worker — implementation and integration acceptance complete from the runnable T0 path
- [x] T7 verify CLI and stale-ACCEPT reconciliation — complete and accepted
- [x] T9 negative acceptance coverage — complete and accepted
- [x] T10 determinism and public-surface audit — complete and accepted
- [x] T11 documentation and acceptance closeout — complete and accepted

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
- The `npm-test` profile maps process outcomes independently:
  exit `0` -> `"ok"`; nonzero numeric exit -> `"test-failed"`;
  spawn failure -> `"spawn-error"`; signal termination ->
  `"test-terminated"`.
- cwd containment is not an OS sandbox; hard subprocess isolation is not
  claimed or authorized for M1.
- `UNKNOWN` never becomes `PASS`.
- Only an initial started-process nonzero numeric exit is retryable. Its
  observation belongs in events; every other failure category has zero retry.
  A retry is the second and final attempt.
- Exactly one terminal verification-applicable evidence record is
  permitted per `(taskId, capability, target)`.
- T4 verification runs once, only after retry resolution and the terminal
  evidence write. It never runs after the initial retryable nonzero exit.
- `expectedResult` originates from the approved
  acceptance/fixture contract, never from evidence itself.
- The T0 fixture is the approved source of `target` and
  `expectedResult` for the M1 acceptance path. T4 supplies neither;
  it consumes both through `VerificationRequest`. Runtime evidence
  must never become the source of `expectedResult`.
- The T0 `expectedResult: "ok"` and profile exit-0 result `"ok"` are
  independently defined approved values; neither is derived from the other.

## 5. State and Ownership (M1 task record)

- **Execution State**: `completed`
- **Mapped pk:tasks Status**: `Done — T1–T11 implementation, acceptance, and documentation closeout complete`
- **Active Task Pointer**: `None (M1 closeout complete)`
- **Blockers and Resume Condition**: `No M1 implementation or closeout blocker. Future milestones remain separately gated.`
- **Verification Status**: `T11 closeout maps AC-1..AC-8 to executed T6–T10 evidence. Full suite: 90 passing tests across 11 files. Typecheck, build, git diff check, fixed-scope harness, changed-file scope, secret-pattern, debug-probe, credential filename, and runtime-artifact guards pass. Clean-checkout and final-working-tree canonical npm run lint pass; an earlier ignored .kilo/worktrees/ auxiliary path was local-only and required no tooling change. No runtime artifacts exist in the repository.`
- **CI Evidence**: `N/A`
- **Commit Evidence**: `4942ca4 design baseline; d7a5d24 T1; 6ad617f T2; a4f16af T3; 7c70622 T4; e035cde T5; d5e7bcb history reconciliation; ad5adc3 first T6 preflight contracts; a66fccc T8 fixture contract; ee3b66d T6 result/retry contracts; T5 status amendment, T6 integration acceptance, and T7 verification committed; T9 negative acceptance committed; T10 determinism/surface audit committed; T11 documentation/acceptance closeout is the current changeset before pk:commit.`
- **Changed-File Summary**: `T11 documentation-only closeout updates README.md, ARCHITECTURE.md, SECURITY.md, CHANGELOG.md, the M1 spec, canonical Task Record/breakdown, ADR/seam/scope records, and STATE.md. No source, tests, fixtures, package files, runtime behavior, or .sureflow artifacts changed.`
- **Next Action**: `M1 closeout complete; request pk:commit, then stop. Do not begin future milestones.`
- **Completion State**: `completed`
- **Acceptance Results**: `Spec acceptance, T1–T10 implementation/verification, and T11 documentation/acceptance closeout are complete; AC-1..AC-8 are mapped in §6.`
- **Completion Exception**: `None`
- **Completion Decision and Timestamp**: `T5 status observability amendment, T6 integration acceptance, T7 verification, T9 negative acceptance, T10 determinism/surface audit, and T11 documentation/acceptance closeout accepted 2026-09-21; future milestones remain gated`

## 6. M1 Closeout Acceptance Evidence (T11)

This section records executed acceptance evidence only; it does not add runtime
behavior or replace the individual task records.

| Criterion | Executed evidence | Result |
| --- | --- | --- |
| AC-1 | T6/T8 real T0 path: ALLOW -> fixed `npm test` exit 0 -> terminal evidence `ok` -> T4 PASS -> `accepted`; status surfaces the persisted state. | PASS |
| AC-2 | T9 unknown capability is DENY, executes zero capabilities, exits 2, and writes no terminal execution evidence. | PASS |
| AC-3 | T9 protected operations return terminal `REQUIRE_APPROVAL`, execute zero capabilities, retry zero times, and use no approval-delivery mechanism. | PASS |
| AC-4 | T7/T9 missing, corrupt, schema-invalid, unreadable, or duplicate applicable evidence is UNKNOWN; stale accepted state becomes `halted`; evidence is not repaired or rewritten. | PASS |
| AC-5 | T6/T9 retry only an initial successfully-started nonzero process once; spawn, signal, policy, and jail failures do not retry; no third attempt; one terminal evidence record per tuple. | PASS |
| AC-6 | T5/T9/T10 keep `.sureflow/state/` authoritative; docs/STATE and PromptKit records do not affect runtime; status and verify preserve read-only evidence boundaries. | PASS |
| AC-7 | T7/T10 equivalent clean roots and repeated status/verify calls produce the same semantic outcomes without timestamps, latest-wins, or ordering authority. | PASS |
| AC-8 | T10 confirms the public surface is exactly `init`, `run`, `status`, and `verify`, with no unauthorized shell, network, approval, scheduler, multi-agent, provider, MCP, skill, or generalized execution machinery. | PASS |

Known M1 limitations remain explicit: the bounded worker path is not an OS
sandbox, so test code may access host filesystem or network resources; no
approval-delivery mechanism exists; verification verdicts are not persisted and
status does not reconstruct them; evidence is not repaired; secret redaction is
the established boundary, not a claim of perfect secret detection; and all
future subsystems remain outside M1.
