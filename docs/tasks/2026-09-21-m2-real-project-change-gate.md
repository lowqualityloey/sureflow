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
- **Approval Boundary**: M2-T8 end-to-end and negative acceptance was authorized for the independent acceptance harness, focused tests/helpers, the required test-project include, and this existing M2 Task Record/STATE projection. Its commit, push, and remote acceptance are complete. M3, release, deployment, and other post-M2 work remain separately unauthorized.
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
  - T4 implementation file `src/boundedReplacement.ts`, focused test `tests/boundedReplacement.test.ts`, and the required test-project include;
  - T5 implementation file `src/projectScope.ts`, focused test `tests/projectScope.test.ts`, and the required test-project include;
  - human/control-plane-owned `.sureflow/task.json`, immutable run snapshot, and contract digest/provenance;
  - one Node/TypeScript+npm project adapter selected from repository evidence;
  - one existing tracked UTF-8 file replacement whose exact bytes come from the validated task snapshot, with exact path, containment, policy, and preimage checks;
  - fixed `typecheck`, `test`, `lint`, and `build` profile resolution/dispatch;
  - read-only Git-visible tracked/non-ignored-untracked baseline and scope inspection;
  - append-only change/check/scope evidence and deterministic aggregate verification;
  - one generalized run/verify orchestration pipeline with T0 compatibility preserved;
  - independent fixture acceptance and the full negative-test matrix;
  - T8 acceptance harness `tests/m2Acceptance.test.ts` and its explicit `tsconfig.json` test-project inclusion.
- **Explicit Non-Goals**:
  - all items listed in the specification's Non-Goals and Deferred Post-M2 sections;
  - production/runtime changes to the accepted T1-T7 implementation;
  - changes to the independent fixture source or contract;
  - M2-T9 or any post-M2 implementation;
  - commits, pushes, pull requests, releases, or other remote side effects.
- **Dependencies**: Accepted M2-T7 baseline `9fe350a256f2eb9f469e5e1e191e62acc5e98a29`; accepted M1/M1.1 contracts and M2-T1 through M2-T7; Node 24/npm/Git available locally; approved M2 planning baseline; explicit M2-T8 implementation, commit, and push authorizations were completed.
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
- [x] **M2-T4 — Bounded replacement** (`#priority/p0`, `area:backend`, `type:feature`, 3–4 h; depends on T1–T2) — accepted / complete at `1db22b3df297af29f23890b094030e4a507fdc25` after remote CI run `35607104678`
  - Apply only snapshot-owned bytes after proving tracked existing-file scope, preimage SHA-256, path/symlink containment, and policy; return before/after digests.
- [x] **M2-T5 — Scope compliance inspection** (`#priority/p0`, `area:backend`, `type:feature`, 3–4 h; depends on T2/T4) — accepted / complete at `a33651bb288e90d6628aaa87df96eaf5997eb635` after GitHub Actions run `35610656688`
  - Require no pre-existing tracked or non-ignored untracked project changes outside `.sureflow/**`; classify every unexpected Git-visible path as a terminal violation without claiming ignored-file/outside-repository detection.
- [x] **M2-T6 — Aggregate evidence verifier** (`#priority/p0`, `area:backend`, `type:feature`, 4–5 h; depends on T1/T3–T5) — accepted / complete at `4b081037c43e954437ef92eac143bd87cd960f01` after GitHub Actions run `35614567881`
  - Reuse append-only evidence and base verifier; require current contract, exact changed paths, compliant scope, and all required checks.
- [x] **M2-T7 — Single orchestration integration** (`#priority/p0`, `area:backend`, `type:refactor`, 5–7 h; depends on T1–T6) — accepted / complete at `9fe350a256f2eb9f469e5e1e191e62acc5e98a29`; CI run `35621524786`
  - Generalize the one run/verify pipeline; preserve policy, lock, state, event, evidence, CLI, and T0 compatibility invariants.
- [x] **M2-T8 — End-to-end and negative acceptance** (`#priority/p1`, `area:backend`, `type:test`, 4–6 h; depends on T7) — accepted / complete at `2b4d877ade0ff6be34b429e00966b0d3efd184e4`; GitHub Actions run `35630660962` passed
  - Execute the independent temp-repository flow, N1–N16, full regressions, hygiene/review, and acceptance evidence.

No task may start merely because its predecessor is checked. Each task needs separate human authorization and an event-driven checkpoint before the next task.

## 4. Acceptance Criteria

- [x] **AC-M2.1 — Project detection**: Repository evidence deterministically resolves the one supported adapter; unsupported or ambiguous projects halt before writes.
  - **Result**: Passed locally
  - **Evidence**: T2 acceptance remains green; T8 N1 unsupported-project and N2 missing-script cases halt before mutation.
- [x] **AC-M2.2 — Contract and authority**: Human/control-plane task bytes become one hashed immutable snapshot; M2's immutable `targetPath` is both the sole authorized project-write target and the sole expected Git-visible project change; workers cannot write `.sureflow/**`, substitute the target, change content/preimage, or weaken verification; a mid-run disk change halts without changing the active plan.
  - **Result**: Passed locally
  - **Evidence**: T1/T7 regressions plus N3 malformed/unknown/duplicate/invalid contract cases and N16 mid-run contract-integrity mismatch.
- [x] **AC-M2.3 — Bounded useful write**: Exactly one immutable `targetPath` authorized by the task, tracked source file with a matching preimage is atomically replaced; every containment or stale violation is refused, and every Git-visible project path other than `targetPath` halts.
  - **Result**: Passed locally
  - **Evidence**: T4/T5 regressions plus N5 unauthorized targets, N6 dirty/stale baselines, N7 single-target authority mismatch, N10 unauthorized post-write path, and N13 no-op/missing-change evidence.
- [x] **AC-M2.4 — Closed verification**: Snapshot-owned required profile IDs resolve only to fixed npm argv in canonical order; workers cannot select or weaken them; missing scripts halt; npm script bodies retain host filesystem/network access and are not sandboxed by `shell: false`.
  - **Result**: Passed locally
  - **Evidence**: T3 regression plus AC-M2.8 real wrapper trace: `run typecheck`, `test`, `run lint`, `run build`; N2 missing-script halt.
- [x] **AC-M2.5 — Change evidence**: Evidence records current contract digest, before/after file digests, actual changed paths, scope result, and every required verification result.
  - **Result**: Passed locally
  - **Evidence**: AC-M2.8 persisted JSONL assertions cover contract, replacement, project scope, and all four verification records; N10/N13 cover post-write scope/evidence violations.
- [x] **AC-M2.6 — Deterministic verdict**: Only complete/current/unambiguous passing evidence yields PASS; missing/corrupt/duplicate/stale evidence yields UNKNOWN and explicit failures yield FAIL.
  - **Result**: Passed locally
  - **Evidence**: T6 regression plus N8/N9 failures, N11 missing evidence, N12 corrupt/stale evidence, N13 no-op/missing-target evidence, and read-only verify helper.
- [x] **AC-M2.7 — Negative paths**: Specification cases N1–N16 pass exactly.
  - **Result**: Passed locally, 35 negative test cases / 38 total T8 tests
  - **Evidence**: `tests/m2Acceptance.test.ts` maps N1, N2, N3 (4 cases), N4 (3 parameterized cases), N5 (9 cases), N6 (2), N7 single-target authority mismatch, N8, N9 (2), N10 post-write unauthorized path, N11, N12 (2), N13 (2), N14 (2), N15 (2), and N16.
- [x] **AC-M2.8 — Independent acceptance**: The public CLI changes a disposable copy of `fixtures/m2-node-ts-project/`, never Sureflow's own source tree, and reaches accepted/PASS after real checks.
  - **Result**: Passed locally and remotely; GitHub Actions run `35630660962` passed on `2b4d877ade0ff6be34b429e00966b0d3efd184e4`
  - **Evidence**: Public `init`, `run TASK-M2-FIXTURE-DISPLAY-NAME`, and `verify TASK-M2-FIXTURE-DISPLAY-NAME`; replacement bytes, accepted state, seven evidence records, Git-visible target scope, and read-only verify were asserted.
- [x] **AC-M2.9 — Regression and scope**: Existing M1/M1.1 behavior remains green and no deferred post-M2 subsystem appears.
  - **Result**: Passed locally and remotely; the full remote suite passed 348/348 across 21 files
  - **Evidence**: Public T0 run/verify regression, T1-T7 regressions, full suite, typecheck, lint, build, diff, reference, harness, hygiene, and exact changed-file scope checks.

## 4A. M2 Contract Authority Reconciliation

The original planning baseline proposed a richer generalized authority shape
with `permittedCapabilities`, `allowedPaths`, nested `change.path`,
`expectedChangedPaths`, and a task-selectable `stopPolicy`. T1 implemented a
closed single-target representation instead. No prior explicit simplification
authorization was found in the historical T1 records.

Human authority explicitly approved the implemented representation for M2 on
2026-09-22. For M2, `targetPath` is simultaneously the sole task-authorized
project-write target and the sole expected Git-visible project change. The
fixed orchestration capabilities are `repo.read`, `repo.write`, and
`repo.verify`; they are individually evaluated through existing policy before
project mutation and are not task-expandable. M2 strict stopping semantics are
fixed control-plane behavior, not task-selectable input.

The richer path and capability declarations are deferred to a future
multi-file/generalized milestone. This is an authority reconciliation, not a
runtime migration; the accepted runtime schema remains unchanged.

### N7/N10 boundary

N7 is the pre-write single-target authority check: disagreement between the
immutable `targetPath` and the detected project target is refused with no
project mutation. N10 remains the post-write observation that verification or
execution introduced some other Git-visible project path; that is a scope
violation with changes preserved.

## 4B. Final M2 Acceptance

**M2 — Real Project Change Gate: ACCEPTED / COMPLETE**

Accepted task chain:

- T1 `b1014149684ab46ccd53a59bfa8155e086a600b2`
- T2 `7f17028da00b817dd97545faa3f132cc922cee17`
- T3 `9b94cfa205269bc75766fadde2f657fcad2275a2`
- T4 `1db22b3df297af29f23890b094030e4a507fdc25`
- T5 `a33651bb288e90d6628aaa87df96eaf5997eb635`
- T6 `4b081037c43e954437ef92eac143bd87cd960f01`
- T7 `9fe350a256f2eb9f469e5e1e191e62acc5e98a29`
- T8 `2b4d877ade0ff6be34b429e00966b0d3efd184e4`

T8 remote acceptance: GitHub Actions run `35630660962`, job `test` /
`106435781923`, passed on the GitHub-hosted runner. `npm ci`, root typecheck,
full tests (`348/348` across `21` files, including `38` T8 tests), lint, build,
`git diff --check`, and tracked-tree cleanliness all passed. The working tree
and `origin/main` are synchronized at the T8 commit.

M3: **NOT STARTED / NOT AUTHORIZED**.

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

- **Execution State**: `completed`
- **Mapped `pk:tasks` Status**: `Done`
- **Active Task Pointer**: `None`
- **Start Time**: `2026-09-21`
- **Current Actor**: Codex completed M2-T1 through M2-T8; remote acceptance is recorded and no M3 work has started
- **Next Action**: No M3 work has started. M3 remains not started / not authorized; no further M2 implementation is planned.

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
| in_progress | awaiting_review | 2026-09-22 | Codex | T4 implementation and local verification complete; atomic local commit created; push remains unauthorized | Focused T4 tests, regressions, full suite, and canonical local gates |
| awaiting_review | in_progress | 2026-09-22 | Human authority | T4 remote acceptance recorded after GitHub Actions run `35607104678` passed on `1db22b3df297af29f23890b094030e4a507fdc25`; M2-T5 read-only Git-visible scope inspection authorized; T6-T8 remain gated | This authorization and remote CI test job evidence |
| in_progress | awaiting_review | 2026-09-22 | Codex | T5 implementation and local verification complete; atomic local commit created; push remains unauthorized | Focused T5 tests, regressions, full suite, and canonical local gates |
| awaiting_review | in_progress | 2026-09-22 | Human authority | T5 remote acceptance recorded on `a33651bb288e90d6628aaa87df96eaf5997eb635` after GitHub Actions run `35610656688`; M2-T6 implementation authorized and T7-T8 remain gated | This authorization and remote CI test job evidence |
| in_progress | awaiting_review | 2026-09-22 | Codex | T6 implementation and local verification complete; atomic commit created; push remains unauthorized | Focused T6, M1 verifier, T1-T5 regression, full-suite, and canonical local gates passed |
| awaiting_review | in_progress | 2026-09-22 | Human authority | T6 remote acceptance recorded on `4b081037c43e954437ef92eac143bd87cd960f01` after GitHub Actions run `35614567881`; M2-T7 implementation authorized and T8 remains gated | This authorization and remote CI test job evidence |
| in_progress | awaiting_review | 2026-09-22 | Codex | T7 implementation and local verification complete; commit authorization remains separate | Focused T7 33/33, permitted-host full suite 309/309 across 20 files, canonical gates, and hygiene checks passed |
| awaiting_review | in_progress | 2026-09-22 | Human authority | Narrow T7 remediation authorized: restore T6 baseline typing, preserve T4 apply-time preimage validation, and add the required interleaving regression; T8 remains gated | This authorization |
| in_progress | awaiting_review | 2026-09-22 | Codex | T7 remediation and local verification complete; commit authorization remains separate | T4 30/30, T7 33/33, permitted-host full suite 310/310, canonical gates, and hygiene checks passed |
| awaiting_review | in_progress | 2026-09-22 | Human authority | M2-T7 remote acceptance recorded on `9fe350a256f2eb9f469e5e1e191e62acc5e98a29` after GitHub Actions run `35621524786`; M2-T8 acceptance implementation authorized | This authorization |
| in_progress | awaiting_review | 2026-09-22 | Codex | T8 independent public acceptance and N1-N16 coverage completed; commit authorization remains separate | T8 focused file 38/38 on permitted host; restricted sandbox `spawnSync node EPERM` preserved as environment evidence |
| awaiting_review | in_progress | 2026-09-22 | Human authority | Explicitly reconciled and approved the implemented T1 single-target M2 contract; richer path/capability/stop-policy fields are deferred to a future generalized milestone | This authorization |
| in_progress | awaiting_review | 2026-09-22 | Codex | Reconciled the M2 specification and T8 acceptance mapping; retained the existing N7 behavior and clarified its boundary with N10 | Focused T8 acceptance and canonical gates rerun after reconciliation |
| awaiting_review | completed | 2026-09-22 | Codex | M2-T8 committed and pushed after explicit authorization; GitHub Actions remote acceptance passed and M2 T1-T8 is complete | Commit `2b4d877ade0ff6be34b429e00966b0d3efd184e4`; run `35630660962`; 348/348 tests across 21 files |

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
  - `src/projectScope.ts` — read-only porcelain-v1 Git-visible baseline and one-target scope classification
  - `tests/projectScope.test.ts` — focused T5 baseline, parsing, failure, containment-of-scope, and no-mutation coverage
  - `tests/m2Acceptance.test.ts` — independent public CLI acceptance, AC-M2.1–AC-M2.9 assertions, and N1-N16 negative coverage
  - `tsconfig.json` — explicit typecheck/project-service inclusion for the T8 acceptance test
- **Scope Change Records**: `None`
- **Checkpoint Records**: `None`
- **Handoff Records**: `None`
- **Verification Evidence**: T4 focused bounded-replacement suite: 29/29 passed; T3/T2/T1 regressions: 50/50 passed; full Sureflow suite: 215/215 passed across 17 files in the permitted Node 24 host environment. Root typecheck, lint, and build passed. T4 covered plan/project consistency, ALLOW/DENY/REQUIRE_APPROVAL, fixed `git ls-files --error-unmatch -- <target>` trackedness outcomes, write-time containment and symlink escape refusal, symlinked-root canonicalization, missing/directory/non-UTF-8 targets, exact UTF-8 bytes, preimage SHA-256, mode preservation, same-directory exclusive temporary replacement, successful-temp cleanup, injected pre-rename cleanup, and no npm/whole-project Git-scope execution. `git diff --check`, PromptKit reference validation, harness/security preflight and regression, and scope/secret/debug/credential/runtime-artifact guards passed. The restricted sandbox reproduced the known existing `spawnSync node EPERM` in `tests/toolchain.test.ts`; the full-suite result is the permitted host result. Repository-wide execution-control validation remains non-green due only to pre-M2 legacy records; no diagnostics apply to this M2 Task Record or the current STATE projection, no legacy repair was attempted, and the raw diagnostic count is not an M2 quality metric.
- **T5 Verification Evidence**: Focused project-scope suite: 26/26 passed; T1-T4 regressions: 79/79 passed; full Sureflow suite: 241/241 passed across 18 files in the permitted Node 24 host environment. Typecheck, lint, build, and `git diff --check` passed. PromptKit reference validation, harness/security preflight and regression, exact-five-file scope, credential-shaped token, debug, credential-filename, and runtime-artifact guards passed. The restricted sandbox reproduced the known existing `spawnSync node EPERM` in `tests/toolchain.test.ts`; the full-suite result is the permitted host result. The repository-wide execution-control validator remains non-green only for pre-M2 historical records; no current M2-T5 diagnostics remain and no legacy repair was attempted.
- **T5 Remote Acceptance Evidence**: GitHub Actions run `35610656688` tested `a33651bb288e90d6628aaa87df96eaf5997eb635` on the GitHub-hosted Linux runner and passed. The `test` job and npm ci, root typecheck, full 241-test suite across 18 files, lint, build, `git diff --check`, and tracked-tree cleanliness steps all concluded success. Remote T5 coverage included `src/projectScope.ts` and `tests/projectScope.test.ts`; no T6+ implementation was present in that tested SHA.
- **T6 Planning Clarification**: The approved M2 specification now defines `integrity-mismatch:<observed-sha256>` as the exact execution-time `.sureflow/task.json` integrity-failure result; stale current-contract evidence remains UNKNOWN. No evidence schema or persistence change is introduced.
- **T6 Verification Evidence**: Focused T6 suite: 35/35 passed; M1 verifier regression: 7/7 passed; T1-T5 regressions: 105/105 passed; full permitted-host Sureflow suite: 276/276 across 19 files. Typecheck, lint, build, and `git diff --check` passed. PromptKit reference validation, harness security preflight/regression, exact-six-file scope, secret/debug/credential/runtime-artifact/package/CI guards passed. The restricted sandbox's known `spawnSync node EPERM` remains environment evidence; the permitted-host full-suite result is the passing evidence. The repository-wide execution-control validator remains non-green only for 98 pre-M2 historical diagnostics; no current M2 T6 diagnostics apply and no legacy repair was attempted.
- **T7 Verification Evidence**: Focused M2-T7 integration suite: 33/33 passed. Permitted-host full Sureflow suite: 309/309 tests across 20 files, including the T0 path and T1-T6 regressions. Root typecheck, lint, and build passed. `git diff --check`, canonical PromptKit reference validation, fixed-scope harness/security preflight, scope, secret, debug, credential-file, runtime-artifact, dependency/version, and CI guards passed. The restricted sandbox reproduced the known existing `spawnSync node EPERM` in `tests/toolchain.test.ts`; the permitted-host full-suite result is the passing evidence. The repository-wide execution-control validator remains non-green at exactly 98 pre-M2 historical diagnostics; no current M2-T7 diagnostics apply and no legacy repair was attempted.
- **T7 Remediation Evidence**: `src/projectChangeVerifier.ts` has zero diff from accepted T6 baseline `4b081037c43e954437ef92eac143bd87cd960f01`. T4 now uses a shared private read-only current-target validation helper; preflight and apply invoke it independently, and apply uses fresh path/mode/preimage data. The required stale-between-preflight-and-apply test passes: refusal, preimage reason, external bytes preserved, and no temporary artifact. Focused T4 suite: 30/30; focused T7 suite: 33/33; permitted-host full suite: 310/310 across 20 files. All original T4/T6 tests remain unchanged and green; no retry, repair, rollback, evidence success, or verification execution follows the stale refusal.
- **T7 Verification Evidence**: Focused M2-T7 integration suite: 33/33 passed. Permitted-host full Sureflow suite: 310/310 tests across 20 files, including the T0 path and T1-T6 regressions. Root typecheck, lint, and build passed. `git diff --check`, canonical PromptKit reference validation, fixed-scope harness/security preflight and regression, scope, secret, debug, credential-file, runtime-artifact, dependency/version, and CI guards passed. The restricted sandbox reproduced the known existing `spawnSync node EPERM` in `tests/toolchain.test.ts`; the permitted-host full-suite result is the passing evidence. The repository-wide execution-control validator remains non-green at exactly 98 pre-M2 historical diagnostics; no current M2-T7 diagnostics apply and no legacy repair was attempted.
- **T7 Remote Acceptance Evidence**: GitHub Actions run `35621524786` tested `9fe350a256f2eb9f469e5e1e191e62acc5e98a29` and passed; T7 is accepted / complete. No T8 changes were present in that tested SHA.
- **T8 Verification Evidence**: `tests/m2Acceptance.test.ts` passed 38/38 after the contract reconciliation on the permitted host. The independent fixture’s pre-change `npm test` was exactly 0/1 as intentionally expected; its typecheck, lint, and build passed under explicit Node 24. AC-M2.8 exercised public `init`, `run`, and `verify` against a disposable copy of `fixtures/m2-node-ts-project/`; the real npm wrapper observed `run typecheck`, `test`, `run lint`, and `run build` in order. The test asserted the replacement bytes, accepted task state, seven persisted evidence records, expected Git-visible target path, and read-only public verify. AC-M2.9 preserved the public T0 run/verify path. N1-N16 passed with 35 negative cases: unsupported project; missing script; malformed/unknown/duplicate/invalid contract; DENY/REQUIRE_APPROVAL; absolute/traversal/control-plane/directory/missing/untracked/symlink targets; dirty/stale baseline; single-target authority mismatch; failed/spawn-error/terminated verification; unauthorized post-write path; missing/corrupt/stale/no-op/missing-target evidence; replay; existing lock/release-owner race; and mid-run contract integrity mismatch. The focused T1/T4/T5/T6/T7/T0 regression selection passed 192/192 across 7 files. The full permitted-host root suite passed 348/348 across 21 files. Root typecheck, lint, build, and `git diff --check` passed; fixture typecheck, lint, and build passed under explicit Node 24. Correct PromptKit reference validation and harness/security preflight passed. The restricted sandbox reproduced the known `spawnSync node EPERM` when the harness launches node; permitted-host execution is the passing evidence. The execution-control validator remained non-green only for pre-M2 records: this run observed 105 historical diagnostics, none for the current M2 record; the documented historical 98-count drift was not investigated. No T1-T7 runtime files, fixture source/contract, package, dependency, CI, or post-M2 files were changed.
- **T8 Remote Acceptance Evidence**: GitHub Actions run `35630660962` tested `2b4d877ade0ff6be34b429e00966b0d3efd184e4` on the GitHub-hosted Ubuntu 24.04 runner; job `test` / `106435781923` passed. The remote `npm ci`, root typecheck, `npm test` (`348/348` across `21` files, including `tests/m2Acceptance.test.ts` with `38` tests), lint, build, `git diff --check`, and tracked-tree cleanliness steps all succeeded. `origin/main` and the working tree are synchronized at the T8 commit.
- **Behavior IDs**: `N/A - TDD Enforcement Mode disabled`
- **TDD Intent Register**: `N/A - TDD Enforcement Mode disabled`
- **TDD Execution Evidence**: `N/A - TDD Enforcement Mode disabled`
- **TDD Exception Verification**: `N/A - TDD Enforcement Mode disabled`
- **CI Evidence**: `M2-T1 remote acceptance is recorded at b1014149684ab46ccd53a59bfa8155e086a600b2. M2-T2 remote acceptance is recorded at 7f17028da00b817dd97545faa3f132cc922cee17, GitHub Actions run 35599713727. M2-T3 remote acceptance is recorded at 9b94cfa205269bc75766fadde2f657fcad2275a2, GitHub Actions run 35603513806. M2-T4 remote acceptance is recorded at 1db22b3df297af29f23890b094030e4a507fdc25, GitHub Actions run 35607104678; npm ci, typecheck, 215 tests across 17 files including 29 T4 tests, lint, build, diff check, and cleanliness all succeeded. M2-T5 remote acceptance is recorded at a33651bb288e90d6628aaa87df96eaf5997eb635, GitHub Actions run 35610656688; npm ci, typecheck, 241 tests across 18 files, lint, build, diff check, and cleanliness all succeeded. M2-T6 remote acceptance is recorded at 4b081037c43e954437ef92eac143bd87cd960f01, GitHub Actions run 35614567881; npm ci, typecheck, 276 tests across 19 files including 35 project-change-verifier tests, lint, build, diff check, and cleanliness all succeeded. M2-T7 remote acceptance is recorded at 9fe350a256f2eb9f469e5e1e191e62acc5e98a29, GitHub Actions run 35621524786. M2-T8 remote acceptance is recorded at 2b4d877ade0ff6be34b429e00966b0d3efd184e4, GitHub Actions run 35630660962; npm ci, typecheck, 348 tests across 21 files including 38 T8 tests, lint, build, diff check, and cleanliness all succeeded.`
- **Review Evidence**: `T7 is accepted remotely at 9fe350a256f2eb9f469e5e1e191e62acc5e98a29. Human authorized T8 for the independent acceptance harness, focused tests/helpers, required test-project include, and canonical docs. Human authority reconciled the implemented T1 single-target contract for M2: targetPath is the sole authorized and expected project path; repo.read/repo.write/repo.verify are fixed orchestration capabilities; strict stopping is fixed control-plane behavior. Review confirms no T1-T7 runtime or fixture-source change, no dependency/package/CI change, no deferred post-M2 subsystem, and truthful preservation of the restricted-sandbox process limitation. T8 is accepted remotely at 2b4d877ade0ff6be34b429e00966b0d3efd184e4 after GitHub Actions run 35630660962 passed.`
- **Commit Evidence**: `T5 committed atomically with subject feat(m2): add git-visible scope inspection; pushed to origin/main as a33651bb288e90d6628aaa87df96eaf5997eb635. T6 committed atomically with subject feat(m2): add aggregate project change verifier; pushed to origin/main as 4b081037c43e954437ef92eac143bd87cd960f01. T7 committed/pushed as 9fe350a256f2eb9f469e5e1e191e62acc5e98a29 and accepted by GitHub Actions run 35621524786. T8 committed atomically as 2b4d877ade0ff6be34b429e00966b0d3efd184e4 and pushed non-force to origin/main; GitHub Actions run 35630660962 passed.`
- **Pull Request Evidence**: `N/A before PR; remote action is not authorized`
- **Release Evidence**: `N/A - M2 planning is not a release`
- **Blocker and Resume Condition**: `M2-T1 through M2-T8 are accepted remotely. No M3 work has started; M3 remains separately unauthorized.`
- **Completion State**: `completed`
- **Acceptance Results**: `AC-M2.1–AC-M2.9 passed locally and remotely; T8 remote suite passed 348/348 across 21 files`
- **Changed-File Summary**: `T8 reconciliation changes are exactly docs/specs/2026-09-21-m2-real-project-change-gate.md, docs/STATE.md, docs/tasks/2026-09-21-m2-real-project-change-gate.md, tests/m2Acceptance.test.ts, and tsconfig.json. The tsconfig change adds only the T8 acceptance test to the explicit typecheck/project-service include list. No T1-T7 runtime file, fixture source/contract, package, dependency, CI, or post-M2 file changed.`
- **Completion Exception**: `None`
- **Completion Decision and Timestamp**: `M2-T8 remote acceptance recorded on 2026-09-22 at commit 2b4d877ade0ff6be34b429e00966b0d3efd184e4 after GitHub Actions run 35630660962 passed; M2-T1 through M2-T8 are accepted / complete. M3 has not started and remains unauthorized.`
