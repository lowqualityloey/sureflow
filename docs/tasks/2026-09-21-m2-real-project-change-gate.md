# Task Record: M2 real project change gate

<a id="TASK-2026-09-21-m2-real-project-change-gate"></a>

## 1. Identity and Authority

- **Record Type**: `Task Record`
- **Task ID**: `TASK-2026-09-21-m2-real-project-change-gate`
- **PromptKit Adaptation Profile**: `none`
- **Work Type**: `Planning / Configuration Work`
- **Planning Record Link**: [PLAN-m2-real-project-change-gate](../specs/2026-09-21-m2-real-project-change-gate.md#PLAN-m2-real-project-change-gate)
- **Planning Depth Reference**: `Full`
- **Assumption Record Links**: `None`
- **Specification**: [M2 — Real Project Change Gate](../specs/2026-09-21-m2-real-project-change-gate.md)
- **External Reference**: `N/A - local tracking remains authoritative`
- **Owner / Actor**: Human authority owns approval; Codex may implement only separately authorized M2 tasks
- **Execution Scope**: Sureflow M2 in this repository; one independent Node/TypeScript fixture target; one local worker/project/task
- **Approval Boundary**: M2-T4 implementation and one atomic commit are authorized only within `src/boundedReplacement.ts`, `tests/boundedReplacement.test.ts`, `tsconfig.json`, and the existing M2 Task Record/STATE projection. Push, scope expansion, M2-T5 through M2-T8, pull request, remote action, release, deployment, or rollback require separate explicit human authorization.
- **Created**: 2026-09-21 10:38 UTC

## 2. Objective and Boundaries

- **Objective**: Prove Sureflow can safely control and deterministically verify one useful bounded code change in an independent realistic Node/TypeScript project beyond the fixed T0 gate.
- **In Scope**:
  - `docs/specs/2026-09-21-m2-real-project-change-gate.md` planning specification;
  - `docs/tasks/2026-09-21-m2-real-project-change-gate.md` canonical Task Record;
  - `docs/STATE.md` living planning projection;
  - T1 implementation files `src/taskContract.ts`, `tests/taskContract.test.ts`, and `tsconfig.json`;
  - T1 independent fixture files under `fixtures/m2-node-ts-project/**`;
  - T2 implementation file `src/projectDetection.ts`, focused test `tests/projectDetection.test.ts`, and the required test-project include;
  - T3 implementation file `src/verificationAdapter.ts`, focused test `tests/verificationAdapter.test.ts`, and the required test-project include;
  - human/control-plane-owned `.sureflow/task.json`, immutable run snapshot, and contract digest/provenance;
  - one Node/TypeScript+npm project adapter selected from repository evidence;
  - one existing tracked UTF-8 file replacement whose exact bytes come from the validated task snapshot, with exact path, containment, policy, and preimage checks;
  - fixed `typecheck`, `test`, `lint`, and `build` profile resolution/dispatch;
  - read-only Git-visible tracked/non-ignored-untracked baseline and scope inspection;
  - append-only change/check/scope evidence and deterministic aggregate verification;
  - one generalized run/verify orchestration pipeline with T0 compatibility preserved;
  - independent fixture acceptance and the full negative-test matrix.
- **Explicit Non-Goals**:
  - all items listed in the specification's Non-Goals and Deferred Post-M2 sections;
  - M2-T5 through M2-T8 implementation during this T4;
  - Git mutation-scope inspection, evidence aggregation, or orchestration;
  - commits, pushes, pull requests, releases, or other remote side effects.
- **Dependencies**: Accepted clean baseline `9b94cfa205269bc75766fadde2f657fcad2275a2`; accepted M1/M1.1 contracts and M2-T1/T2/T3; Node 24/npm/Git available locally; approved M2 planning baseline; explicit M2-T4 implementation authorization is active; T5 remains separately gated.
- **Risk**: `High` — M2 expands from fixed verification to real source mutation. Mitigation: exact-path/preimage gates, default-deny policy, one closed adapter, clean Git baseline, post-run scope inspection, deterministic evidence, one-task authorization, and hard stop conditions.
- **Verification Condition**: M2 is complete only when AC-M2.1–AC-M2.9 pass, N1–N16 pass, the independent temporary-repository acceptance reaches PASS/accepted, and the complete Sureflow typecheck/test/lint/build/hygiene gates pass without weakening existing tests.

## 3. Dependency-Ordered Task Breakdown

- [x] **M2-T1 — Contract and acceptance fixture** (`#priority/p1`, `area:backend`, `type:feature`, 3–4 h) — accepted / complete at `b1014149684ab46ccd53a59bfa8155e086a600b2`
  - Add control-plane authority rules, strict contract types/parser/loader, immutable snapshot/digest, and independent fixture skeleton.
  - Verify exact-field rejection, closed enums, task ID, paths, digest syntax, `.sureflow/**` worker-write refusal, mid-run hash mismatch, and no command/provider/remote fields.
- [x] **M2-T2 — Project detection** (`#priority/p1`, `area:backend`, `type:feature`, 3–4 h; depends on T1) — accepted / complete at `7f17028da00b817dd97545faa3f132cc922cee17`; CI run `35599713727`
  - Detect clean Git + Node/TypeScript/npm support from repository evidence with explicit unsupported outcomes.
- [x] **M2-T3 — Verification profile resolution and dispatch** (`#priority/p1`, `area:backend`, `type:feature`, 4–5 h; depends on T2) — accepted / complete at `9b94cfa205269bc75766fadde2f657fcad2275a2` after remote CI run `35603513806`
  - Map snapshot-owned required checks to fixed npm argv in canonical order; reject worker-selected, missing, or unsupported checks; accept no caller executable/argv/shell; document npm-script host trust.
- [x] **M2-T4 — Bounded replacement** (`#priority/p0`, `area:backend`, `type:feature`, 3–4 h; depends on T1–T2) — locally committed; push/remote acceptance remain unauthorized
  - Apply only snapshot-owned bytes after proving tracked existing-file scope, preimage SHA-256, path/symlink containment, and policy; return before/after digests.
- [ ] **M2-T5 — Scope compliance inspection** (`#priority/p0`, `area:backend`, `type:feature`, 3–4 h; depends on T2/T4)
  - Require no pre-existing tracked or non-ignored untracked project changes outside `.sureflow/**`; classify every unexpected Git-visible path as a terminal violation without claiming ignored-file/outside-repository detection.
- [ ] **M2-T6 — Aggregate evidence verifier** (`#priority/p0`, `area:backend`, `type:feature`, 4–5 h; depends on T1/T3–T5)
  - Reuse append-only evidence and base verifier; require current contract, exact changed paths, compliant scope, and all required checks.
- [ ] **M2-T7 — Single orchestration integration** (`#priority/p0`, `area:backend`, `type:refactor`, 5–7 h; depends on T1–T6)
  - Generalize the one run/verify pipeline; preserve policy, lock, state, event, evidence, CLI, and T0 compatibility invariants.
- [ ] **M2-T8 — End-to-end and negative acceptance** (`#priority/p1`, `area:backend`, `type:test`, 4–6 h; depends on T7)
  - Execute the independent temp-repository flow, N1–N16, full regressions, hygiene/review, and acceptance evidence.

No task may start merely because its predecessor is checked. Each task needs separate human authorization and an event-driven checkpoint before the next task.

## 4. Acceptance Criteria

- [ ] **AC-M2.1 — Project detection**: Repository evidence deterministically resolves the one supported adapter; unsupported or ambiguous projects halt before writes.
  - **Result**: Pending
  - **Evidence**: Focused detector tests and independent fixture acceptance
- [ ] **AC-M2.2 — Contract and authority**: Human/control-plane task bytes become one hashed immutable snapshot; workers cannot write `.sureflow/**`, expand path authority, change content/preimage, or weaken verification; a mid-run disk change halts without changing the active plan.
  - **Result**: Pending
  - **Evidence**: Contract/policy test matrix
- [ ] **AC-M2.3 — Bounded useful write**: Exactly one authorized tracked source file with a matching preimage is atomically replaced; every containment or stale violation is refused, and every unauthorized Git-visible changed path halts.
  - **Result**: Pending
  - **Evidence**: Writer/scope tests and end-to-end changed-path assertion
- [ ] **AC-M2.4 — Closed verification**: Snapshot-owned required profile IDs resolve only to fixed npm argv in canonical order; workers cannot select or weaken them; missing scripts halt; npm script bodies retain host filesystem/network access and are not sandboxed by `shell: false`.
  - **Result**: Pending
  - **Evidence**: Adapter dispatch tests
- [ ] **AC-M2.5 — Change evidence**: Evidence records current contract digest, before/after file digests, actual changed paths, scope result, and every required verification result.
  - **Result**: Pending
  - **Evidence**: Persisted JSONL assertions with redaction checks
- [ ] **AC-M2.6 — Deterministic verdict**: Only complete/current/unambiguous passing evidence yields PASS; missing/corrupt/duplicate/stale evidence yields UNKNOWN and explicit failures yield FAIL.
  - **Result**: Pending
  - **Evidence**: Aggregate verifier matrix and stale-accepted reconciliation tests
- [ ] **AC-M2.7 — Negative paths**: Specification cases N1–N16 pass exactly.
  - **Result**: Pending
  - **Evidence**: Named automated tests mapped to every negative ID
- [ ] **AC-M2.8 — Independent acceptance**: The public CLI changes a disposable copy of `fixtures/m2-node-ts-project/`, never Sureflow's own source tree, and reaches accepted/PASS after real checks.
  - **Result**: Pending
  - **Evidence**: End-to-end acceptance command, state, evidence, Git scope, and CLI assertions
- [ ] **AC-M2.9 — Regression and scope**: Existing M1/M1.1 behavior remains green and no deferred post-M2 subsystem appears.
  - **Result**: Pending
  - **Evidence**: Full suite, typecheck, lint, build, diff, reference, harness, hygiene, changed-file, and architecture review gates

## 5. Execution Policy

- **Mode**: `Gated Mode`
- **TDD Enforcement Mode**: `disabled`
- **Batch Authorization**: `N/A - every M2 task is separately authorized`
- **Soft Checkpoint**: At each M2-T task completion or around 60 minutes, whichever occurs first
- **Hard Checkpoint**: Before crossing from one M2-T task to the next, on scope expansion, or around 90 minutes without completion
- **Event-Driven Checkpoints**: Planning approval, implementation authorization, task completion, test failure, stop-condition trigger, commit, push, remote CI, scope expansion, handoff, compaction, or context drift
- **Stop Conditions**: Authority semantics change; arbitrary shell requirement; second orchestration framework; broad stack leakage into core; multi-agent/provider/MCP scope; non-objective acceptance; failed invariant/gate; missing approval; human stop
- **Host Timer Capability**: Live host timing and forced termination are unavailable; use observed elapsed time plus turn/task boundaries only.

## 6. State and Active Ownership

- **Execution State**: `awaiting_review`
- **Mapped `pk:tasks` Status**: `In Review`
- **Active Task Pointer**: `None`
- **Start Time**: `2026-09-21`
- **Current Actor**: Codex after the authorized M2-T4 implementation, local verification, and atomic commit; push remains unauthorized
- **Next Action**: Report T4 commit and local evidence, then STOP. Do not push or begin M2-T5.

### Transition History

| Previous State | New State | Timestamp | Actor | Reason | Supporting Evidence |
| :--- | :--- | :--- | :--- | :--- | :--- |
| N/A | planned | 2026-09-21 10:38 UTC | Codex under planning authorization | Fresh M2 planning boundary requested; implementation explicitly prohibited | [M2 specification](../specs/2026-09-21-m2-real-project-change-gate.md) |
| planned | ready | 2026-09-21 | Human authority | M2-T1 implementation authorized with T2-T8 still gated | This authorization |
| ready | in_progress | 2026-09-21 | Codex | Started T1 contract and independent fixture implementation only | T1 files and focused test plan |
| in_progress | awaiting_review | 2026-09-21 | Codex | T1 implementation and local verification complete; atomic commit authorization received | Focused T1 tests and canonical local gates |
| awaiting_review | in_progress | 2026-09-22 | Human authority | M2-T2 project detection implementation authorized; T3-T8 remain gated | This authorization |
| in_progress | awaiting_review | 2026-09-22 | Codex | T2 implementation and local verification complete; atomic commit authorization received | Focused T2/T1 tests and canonical local gates |
| awaiting_review | in_progress | 2026-09-22 | Human authority | M2-T3 verification profile resolution and dispatch implementation authorized; T4-T8 remain gated | This authorization |
| in_progress | awaiting_review | 2026-09-22 | Codex | T3 implementation and local verification complete; commit authorization remains separate | Focused T3/T2/T1 tests and canonical local gates |
| awaiting_review | accepted / complete | 2026-09-22 | Human authority / Codex | T3 pushed and accepted after GitHub Actions run `35603513806` passed on `9b94cfa205269bc75766fadde2f657fcad2275a2` | Remote CI test job and required steps passed |
| accepted / complete | in_progress | 2026-09-22 | Human authority | M2-T4 bounded replacement implementation authorized; T5-T8 remain gated | This authorization |
| in_progress | awaiting_review | 2026-09-22 | Codex | T4 implementation and local verification complete; atomic local commit created; push remains unauthorized | Focused T4 tests, regressions, full suite, and canonical local gates |

## 7. Evidence and Completion Gate

- **Changed Files**:
  - `src/taskContract.ts` — strict closed M2 task parser, contract hash, and immutable validated plan loader
  - `tests/taskContract.test.ts` — focused T1 contract, rejection, snapshot, and fixture-binding tests
  - `fixtures/m2-node-ts-project/**` — independent dependency-free Node/TypeScript acceptance fixture and example contract
  - `tsconfig.json` — canonical typecheck/project-service inclusion for the focused T1 test
  - `docs/tasks/2026-09-21-m2-real-project-change-gate.md` — T1 progress projection
  - `docs/STATE.md` — T1 progress projection
  - `src/projectDetection.ts` — bounded structural detector for the one closed adapter
  - `tests/projectDetection.test.ts` — focused evidence, authority, containment, and no-execution tests
  - `src/verificationAdapter.ts` — closed profile resolution, canonical npm dispatch, and process-result mapping
  - `tests/verificationAdapter.test.ts` — focused fixed-dispatch, ordering, result, retry, and fixture coverage
  - `src/boundedReplacement.ts` — immutable-plan-authorized tracked-file replacement, containment, preimage, policy, and atomic mode-preserving write
  - `tests/boundedReplacement.test.ts` — focused T4 policy, trackedness, containment, digest, atomic-write, mode, cleanup, and no-orchestration coverage
- **Scope Change Records**: `None`
- **Checkpoint Records**: `None`
- **Handoff Records**: `None`
- **Verification Evidence**: T4 focused bounded-replacement suite: 29/29 passed; T3/T2/T1 regressions: 50/50 passed; full Sureflow suite: 215/215 passed across 17 files in the permitted Node 24 host environment. Root typecheck, lint, and build passed. T4 covered plan/project consistency, ALLOW/DENY/REQUIRE_APPROVAL, fixed `git ls-files --error-unmatch -- <target>` trackedness outcomes, write-time containment and symlink escape refusal, symlinked-root canonicalization, missing/directory/non-UTF-8 targets, exact UTF-8 bytes, preimage SHA-256, mode preservation, same-directory exclusive temporary replacement, successful-temp cleanup, injected pre-rename cleanup, and no npm/whole-project Git-scope execution. `git diff --check`, PromptKit reference validation, harness/security preflight and regression, and scope/secret/debug/credential/runtime-artifact guards passed. The restricted sandbox reproduced the known existing `spawnSync node EPERM` in `tests/toolchain.test.ts`; the full-suite result is the permitted host result. Repository-wide execution-control validation remains non-green due only to pre-M2 legacy records; no diagnostics apply to this M2 Task Record or the current STATE projection, no legacy repair was attempted, and the raw diagnostic count is not an M2 quality metric.
- **Behavior IDs**: `N/A - TDD Enforcement Mode disabled`
- **TDD Intent Register**: `N/A - TDD Enforcement Mode disabled`
- **TDD Execution Evidence**: `N/A - TDD Enforcement Mode disabled`
- **TDD Exception Verification**: `N/A - TDD Enforcement Mode disabled`
- **CI Evidence**: `M2-T1 remote acceptance is recorded at b1014149684ab46ccd53a59bfa8155e086a600b2. M2-T2 remote acceptance is recorded at 7f17028da00b817dd97545faa3f132cc922cee17, GitHub Actions run 35599713727. M2-T3 remote acceptance is recorded at 9b94cfa205269bc75766fadde2f657fcad2275a2, GitHub Actions run 35603513806. T4 is local-only and has no remote CI evidence.`
- **Review Evidence**: `Human authorized M2-T4 implementation and one atomic commit within the five-file scope; push and T5-T8 remain unauthorized. T4 is locally complete, verified, and committed.`
- **Commit Evidence**: `T4 committed atomically with subject feat(m2): add bounded tracked file replacement. No push or remote CI has occurred.`
- **Pull Request Evidence**: `N/A before PR; remote action is not authorized`
- **Release Evidence**: `N/A - M2 planning is not a release`
- **Blocker and Resume Condition**: T4 implementation, local verification, and atomic commit are complete; push remains separately unauthorized. M2-T5 requires separate task authorization.
- **Completion State**: `T4 locally implemented, verified, and committed; push/remote acceptance pending`
- **Acceptance Results**: `AC-M2.1–AC-M2.9 pending`
- **Changed-File Summary**: T4 bounded replacement source/test, required test-project include, and the existing M2 Task Record/STATE projection; T1-T3 implementation and fixture are unchanged; no T5-T8 implementation, dependency, CI, or remote state changed.
- **Completion Exception**: `None`
- **Completion Decision and Timestamp**: `T3 remote acceptance recorded; T4 implementation/verification completed and committed locally on 2026-09-22; push remains separately unauthorized; M2-T5 through M2-T8 remain gated`
