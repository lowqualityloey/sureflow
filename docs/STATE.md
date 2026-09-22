# Project State & Living Execution Tracker

## 1. Executive Summary & Current Position
- **Project Name**: Sureflow — engineering control plane for AI coding agents
- **Current Milestone / Epic**: M3 — Cross-Project Bounded Change Gate — CORE-ONLY — MERGED / INTEGRATION VALIDATED
- **Overall Status**: M1, M1.1, M2, and M3 accepted / complete; M3-T1 through M3-T4 integrated into `main` via PR #1; post-merge main CI is green; no M4/post-M3 implementation has started
- **Target Release / Deadline**: M3 — no deadline recorded
- **Current Working Branch**: N/A for M3 implementation — M3 code is integrated into `main` via merge commit `f711876da659bb9c36745b3189eac986f94ba7ea`; no active M3 implementation branch exists. Local `m3-core` remains retained and remote `m3-core` is absent.
- **Last Updated**: 2026-09-23


---

## 2. Milestone & Task Progress

### Milestone Roadmap
- [x] **M0**: Repository discovery + architecture intake — completed, human-approved 2026-09-20 (M-D1..M-D5 in `docs/adrs/2026-09-20-stack-and-m1-boundary.md`)
- [x] **M1-spec**: Deterministic local task gate — APPROVED 2026-09-20 (`docs/specs/2026-09-20-m1-local-task-gate.md`)
- [x] **M1-build**: T1–T11 closeout complete; future milestones gated
- [x] **M1.1-H1**: Zero-cost Node 24 public CI — accepted after green remote CI run `35572778970` on `e1c3e6f04c7585c4947eaa8ae1e1f5d401038c8c`
- [x] **M1.1-H2**: Node 24 type alignment — accepted after green remote CI run `35574889277` on `505daa10f43410a6eefb28a5b758af94227c1fbe`
- [x] **M1.1-H3**: Runtime namespace symlink containment — accepted after GitHub Actions run `35577273766` passed on `1d0fed15cb54f938d55115e4a2a75caa9578d8c4`
- [x] **M1.1-H4**: State interruption safety — accepted after GitHub Actions run `35579830623` passed on `ce4be6af2326cf8ab6c2237b0234406501a042e0`
- [x] **M1.1-H5**: Single-project mutation exclusion — accepted after GitHub Actions run `35583342650` passed on `adbd526617ec82326b3921a4a69e336198412149`
- [x] **M1.1-H6**: Event corruption surfacing — accepted after GitHub Actions run `35585861754` passed on `99b2e340ceec288982788b16ebaa8620ddb891ed`
- [x] **M1.1-H7**: Public source-install and `init --force` documentation truth — accepted after GitHub Actions run `35588373963` passed on `9bb55ca42f7ec8801cab4bc908c9be61d5b9b2c0`
- [x] **M2-plan**: Real Project Change Gate planning baseline approved with contract clarification complete
- [x] **M2-T1**: Contract + independent fixture — accepted / complete at `b1014149684ab46ccd53a59bfa8155e086a600b2`
- [x] **M2-T2**: Project detection — accepted / complete at `7f17028da00b817dd97545faa3f132cc922cee17` after remote CI run `35599713727`
- [x] **M2-T3**: Closed verification profile resolution and dispatch — accepted / complete at `9b94cfa205269bc75766fadde2f657fcad2275a2` after remote CI run `35603513806`
- [x] **M2-T4**: Bounded existing-file replacement — accepted / complete at `1db22b3df297af29f23890b094030e4a507fdc25` after remote CI run `35607104678`
- [x] **M2-T5**: Git-visible scope compliance — accepted / complete at `a33651bb288e90d6628aaa87df96eaf5997eb635` after GitHub Actions run `35610656688`
- [x] **M2-T6**: Aggregate evidence verifier — accepted / complete at `4b081037c43e954437ef92eac143bd87cd960f01` after GitHub Actions run `35614567881`
- [x] **M2-T7**: Single orchestration integration — accepted / complete at `9fe350a256f2eb9f469e5e1e191e62acc5e98a29` after remote CI run `35621524786`
- [x] **M2-T8**: End-to-end and negative acceptance — accepted / complete at `2b4d877ade0ff6be34b429e00966b0d3efd184e4` after GitHub Actions run `35630660962`
- [x] **M3-T1**: Closed adapter/kernel boundary + EvidenceRecord v2 contract — accepted and integrated into `main` via PR #1; implementation `4fbe92d41940db3c7d1965a0124f6b8f9b98a40f`, hardening follow-up `46fb1e0cce39105e8b9a55f141204d181a15f955`, CI run `35699026135`, `372/372` across 23 files
- [x] **M3-T2**: Narrow pnpm eligibility and fixed dispatch — accepted and integrated into `main` via PR #1; implementation `5b46501eccf146777e6d8b6277700667237df464`, lint correction `5bfd27c2a2ea57da8e98d9b2ad6447de4a431418`, CI run `35702794992`, `405/405` across 24 files with zero skips
- [x] **M3-T3**: Bounded verification execution, cancellation, EvidenceRecord v2, and input/plan binding — accepted and integrated into `main` via PR #1 at commit `f6f4bbd8a42df2b038531e065ce7d88241f520f4`; GitHub Actions run `35731683141` passed with `453/453` across 25 files and zero skips reported
- [x] **M3-T4**: Independent npm + pnpm acceptance and M3 closeout — accepted and integrated into `main` via PR #1; implementation commit `7944b13f0268473606b1b99833f1706d1159a0ab`; GitHub Actions run `35744104235` passed with `460/460` across 26 files and focused T4 `7/7`
- [x] **M3 integration**: PR #1 merged by normal merge commit `f711876da659bb9c36745b3189eac986f94ba7ea`; post-merge main CI run `35750536825` passed with `460/460` across 26 files

### Active Milestone Task Breakdown

- [x] TASK-2026-09-20-sureflow-discovery-intake: discovery baseline — completed
- [x] TASK-2026-09-20-m1-local-task-gate: M1 spec — approved 2026-09-20
- [x] T1: npm/Node 24 TypeScript scaffold — committed `d7a5d24`
- [x] T2: state authority and policy decisions — committed `6ad617f`
- [x] T3: append-only evidence and redaction — committed `a4f16af`
- [x] T4: deterministic verifier — committed `7c70622`
- [x] T5: CLI `init` and read-only `status` — committed `e035cde`
- [x] T8: minimal T0 fixture contract — committed `a66fccc`
- [x] T6: implementation and integration acceptance complete — real T0 path reached ACCEPT/PASS with one attempt and zero retries
- [x] T7: verify CLI and stale-ACCEPT reconciliation complete
- [x] T9: negative acceptance coverage complete
- [x] T10: determinism and public-surface audit complete
- [x] T11: documentation and acceptance closeout complete
- [x] H1: zero-cost Node 24 verification workflow — accepted; CI run `35572778970` passed on `e1c3e6f04c7585c4947eaa8ae1e1f5d401038c8c`
- [x] H2: Node 24 type alignment — accepted; CI run `35574889277` passed on `505daa10f43410a6eefb28a5b758af94227c1fbe`
- [x] TASK-2026-09-21-m2-real-project-change-gate: M2-T1 through M2-T8 accepted / complete; final remote acceptance recorded
- [x] **M3 CORE-ONLY**: T1-T4 accepted / complete and integrated into `main` via PR #1; post-merge validation passed

---

## 3. Active Working Set
- **Target Workspace / Package (if Monorepo)**: Standalone repository (no packages)
- **Active RFC / Spec**: `N/A — M3 CORE-ONLY authority is captured in the Task Record; no separate M3 specification file exists`
- **Active Task Spec**: `docs/tasks/2026-09-22-m3-cross-project-bounded-change-gate.md`
- **Key Files in Flight**: No M3 implementation files are in flight. The canonical M3 records describe the completed integrated state. No M4/post-M3 implementation has started.
- **Verification Commands (Scoped)**:
  - Unit Tests: H6-focused selection → 10 passed (15 non-H6 tests excluded by name filter) in `tests/runTask.test.ts`; GitHub Actions full suite → 133 passed across 13 files (2026-09-21)
  - Typecheck: `npm run typecheck` → exit 0 (2026-09-21)
  - Linter: `npm run lint` → exit 0 (2026-09-21)
  - Build: `npm run build` → exit 0 (2026-09-21)
  - Repository checks: GitHub Actions `git diff --check` and tracked-tree cleanliness → exit 0 (2026-09-21)
  - PromptKit reference validation: exit 0; harness preflight: bounded fixed-scope scan reported no findings; scope/secret/debug/credential/runtime-artifact guards passed (2026-09-21)
  - H3 focused tests: 9 passed locally; GitHub Actions full suite: 100 passed across 12 files on `ubuntu-latest`; H4 remote CI: 112 passed across 12 files on `ubuntu-latest`; H5 remote CI: 123 passed across 13 files on `ubuntu-latest`, including 11 mutation-lock tests
  - H7 focused init/status suite: 25 passed; full local suite: 136 passed across 13 files; typecheck, lint, and build passed (2026-09-21)
  - H7 remote CI run `35588373963`: `tests/initStatus.test.ts` executed 25 tests; full suite passed 136 tests across 13 files; no skipped tests reported; wording changes present on the tested SHA (2026-09-21)
  - M2-T1 focused contract suite: 18 tests passed; full Sureflow suite: 154 tests passed across 14 files in the permitted host environment; typecheck, lint, and build passed (2026-09-21)
  - M2-T2 focused project-detection suite: 15 tests passed; T1 regression suite: 18 tests passed; full Sureflow suite: 169 tests passed across 15 files with Node 24; typecheck, lint, and build passed (2026-09-22)
  - M2-T2 fixture checks: typecheck, lint, and build passed; the fixture application test intentionally failed 0/1 before the planned bounded replacement and was not changed (2026-09-22)
  - M2-T2 remote acceptance: GitHub Actions run `35599713727` passed on `7f17028da00b817dd97545faa3f132cc922cee17`; T2 project-detection coverage and the root quality gates were green; T3-T8 were not implemented in that tested SHA (2026-09-22)
  - M2-T3 focused verification-adapter suite: 17 tests passed; T2 project-detection and T1 contract regressions: 33 tests passed; full Sureflow suite: 186 tests passed across 16 files in the permitted Node 24 host environment (2026-09-22)
  - M2-T3 fixture dispatch: typecheck, lint, and build passed; the fixture application test intentionally failed 0/1 before bounded replacement; no fixture test was weakened or skipped (2026-09-22)
  - M2-T3 canonical gates: typecheck, lint, build, `git diff --check`, PromptKit reference validation, harness/security preflight, and scope/secret/debug/credential/runtime-artifact guards passed; restricted sandbox reproduced the known `spawnSync npx EPERM`, so the full-suite result above is the permitted host result (2026-09-22)
  - M2-T4 focused bounded-replacement suite: 29 tests passed; T3/T2/T1 regressions: 50 tests passed; full Sureflow suite: 215 tests passed across 17 files in the permitted Node 24 host environment. Root typecheck, lint, and build passed; the restricted sandbox reproduced the known existing `spawnSync node EPERM` in `tests/toolchain.test.ts`, so the full-suite result is the permitted host result (2026-09-22)
  - M2-T4 `git diff --check`, PromptKit reference validation, harness preflight/regression, and scope/secret/debug/credential/runtime-artifact guards passed. The repository-wide execution-control validator remains non-green only for pre-M2 legacy records; no legacy repair was attempted and its raw diagnostic count is not an M2 quality metric (2026-09-22)
  - M2-T5 focused project-scope suite: 26 tests passed; T1-T4 regressions: 79 tests passed; full Sureflow suite: 241 tests passed across 18 files in the permitted Node 24 host environment. Typecheck, lint, and build passed; the restricted sandbox reproduced the known existing `spawnSync node EPERM` in `tests/toolchain.test.ts`, so the full-suite result is the permitted host result (2026-09-22)
  - M2-T5 `git diff --check`, PromptKit reference validation, harness preflight/regression, exact-five-file scope, credential-shaped token, debug, credential-filename, and runtime-artifact guards passed. The repository-wide execution-control validator reports 98 diagnostics only from pre-M2 historical records; no current M2-T5 diagnostics remain and no legacy repair was attempted (2026-09-22)
  - M2-T5 remote acceptance: GitHub Actions run `35610656688` tested `a33651bb288e90d6628aaa87df96eaf5997eb635` and passed on the GitHub-hosted Linux runner; npm ci, typecheck, 241 tests across 18 files, lint, build, `git diff --check`, and cleanliness all passed (2026-09-22)
  - M2-T6 local acceptance: focused T6 35/35, M1 verifier 7/7, T1-T5 regressions 105/105, and permitted-host full suite 276/276 across 19 files passed; typecheck, lint, build, PromptKit references, harness security, diff check, and exact-six-file hygiene passed (2026-09-22)
  - M2-T6 remote acceptance: GitHub Actions run `35614567881` tested `4b081037c43e954437ef92eac143bd87cd960f01`; the single `test` job and npm ci, typecheck, 276 tests across 19 files including `tests/projectChangeVerifier.test.ts` (35 tests), lint, build, `git diff --check`, and tracked-tree cleanliness all passed (2026-09-22)
  - M2-T7 remediation: focused bounded-replacement suite 30/30 passed, including the stale-between-preflight-and-apply regression; T7 focused integration suite 33/33 passed; permitted-host full Sureflow suite 310/310 across 20 files, including all T0 and T1-T6 regressions. Root typecheck, lint, and build passed. The restricted sandbox reproduced the known existing `spawnSync node EPERM` in `tests/toolchain.test.ts`; the permitted-host full-suite result is the passing evidence (2026-09-22)
  - M2-T7 hygiene: `git diff --check`, canonical PromptKit reference validation, fixed-scope harness/security preflight and regression, scope, secret, debug, credential-file, runtime-artifact, dependency/version, and CI guards passed. `src/projectChangeVerifier.ts` has zero diff from accepted T6 baseline `4b081037c43e954437ef92eac143bd87cd960f01`. The repository-wide execution-control validator remains non-green at exactly 98 pre-M2 historical diagnostics; no current M2-T7 diagnostic remains and no legacy repair was attempted (2026-09-22)
  - M2-T8 local and remote acceptance after contract reconciliation: `tests/m2Acceptance.test.ts` passed 38/38 on the permitted host, including AC-M2.8/AC-M2.9 and N1-N16; the focused T1/T4/T5/T6/T7/T0 regression selection passed 192/192 across 7 files. The independent fixture’s pre-change `npm test` was exactly 0/1 as expected; fixture typecheck, lint, and build passed under explicit Node 24. The full permitted-host root `npm test` passed 348/348 across 21 files; root typecheck, lint, build, and `git diff --check` passed. GitHub Actions run `35630660962` tested `2b4d877ade0ff6be34b429e00966b0d3efd184e4` and passed with the same 348/348 suite. Correct PromptKit reference validation, harness/security preflight, exact five-file scope, secret/debug/credential-file/runtime-artifact/dependency/version/CI guards passed. The restricted sandbox reproduced the known `spawnSync node EPERM` when launching the built CLI; permitted-host and GitHub-hosted CI results are the passing evidence. The execution-control validator remained non-green only for pre-M2 records: this run observed 105 historical diagnostics, none for the current M2 record; the documented historical 98-count drift was not investigated. T8 adds no runtime, fixture-source, dependency, package, CI, or M3 behavior (2026-09-22)
  - M2-T8 contract reconciliation: Human authority explicitly approved the implemented single-target M2 contract. `targetPath` is the sole authorized and expected project path; `repo.read`, `repo.write`, and `repo.verify` are fixed orchestration capabilities; strict stopping is fixed control-plane behavior; richer path/capability/stop-policy declarations are deferred to a future generalized milestone. The existing N7 test was retained with clarified single-target authority terminology; no T1-T7 runtime module or fixture changed (2026-09-22)

---

  - M3-T3 remote validation: commit `f6f4bbd8a42df2b038531e065ce7d88241f520f4`; GitHub Actions run `35731683141` passed with `453/453` across 25 files and zero skips reported (2026-09-23)
  - M3-T4 local acceptance: focused public-CLI cross-project suite `7/7`; full permitted-host suite `460/460` across 26 files; both npm and pnpm disposable projects exercised public `init`, `preflight`, `run`, `status`, and `verify`; manager-mismatch, dual-lockfile, and workspace negatives halted before mutation; fixture pre-change npm/pnpm tests failed nonzero as required; fixture typecheck, lint, build, and disposable pnpm frozen-lockfile install passed; root typecheck, lint, build, and `git diff --check` passed (2026-09-23)
  - M3-T4 hygiene: PromptKit kit reference validation passed; harness regression tests passed; direct linked-worktree preflight reported only `PREFLIGHT|INCOMPLETE|GIT_LAYOUT|.`; execution-control validation remains non-green only for 98 historical pre-M2 diagnostics; no legacy repair was attempted and that count is not an M3 quality metric (2026-09-23)
  - M3-T4 remote acceptance: commit `7944b13f0268473606b1b99833f1706d1159a0ab`; GitHub Actions run `35744104235`, job `106801107733`, synthetic PR merge SHA `e76b47838af5f94f14613f57c036292cead4c723`; pinned pnpm `9.15.4`, npm ci, typecheck, npm test, lint, build, `git diff --check`, and tracked-tree cleanliness passed with `460/460` across 26 files and focused T4 `7/7` (2026-09-23)
  - M3-T4 remote warnings: deprecated ESLint, two moderate npm audit findings, and an esbuild install-script approval warning were observed; none failed a required gate and none are claimed resolved (2026-09-23)
  - M3 post-merge main validation: merge commit `f711876da659bb9c36745b3189eac986f94ba7ea`; GitHub Actions run `35750536825`, job `106823643297`, passed pinned pnpm `9.15.4`, npm ci, typecheck, `460/460` tests across 26 files, focused T4 `7/7`, lint, build, `git diff --check`, and tracked-tree cleanliness. The same non-blocking warnings remained observed (2026-09-23)

## 3A. Execution-Control Projection (Optional)

- **Local Task Source**: `docs/tasks/2026-09-22-m3-cross-project-bounded-change-gate.md`
- **Task ID**: `TASK-2026-09-22-m3-cross-project-bounded-change-gate`
- **Task Record**: `docs/tasks/2026-09-22-m3-cross-project-bounded-change-gate.md`
- **Specification**: `N/A — M3 CORE-ONLY authority is captured in this Task Record; no separate M3 specification file exists`
- **Execution Scope**: `M3 CORE-ONLY, separate independent npm/pnpm project shapes, one supplied bounded single-file change, no automatic repair`
- **Execution State**: `completed`
- **Mapped `pk:tasks` Status**: `Done`
- **Active Task Pointer**: `None`
- **Active Review Task**: `None`
- **Owner / Current Actor**: Human authority / Codex — M3 integrated and post-merge validated; no active M3 implementation task.
- **Start Time**: `2026-09-22`
- **Current Branch**: N/A — no active M3 implementation branch.
- **Current Revision**: M3 code integration baseline is main merge commit `f711876da659bb9c36745b3189eac986f94ba7ea`. Local `m3-core @ 6f51237d68d8b20193a2924fbeb6a2d90801299f` remains retained; remote `m3-core` is absent.
- **Checkpoint Policy**: `Human plan review; separate authorization for each M3 task; checkpoint before every task transition, commit, push, scope expansion, or stop-condition response`
- **Blockers and Resume Condition**: `No M3 implementation blocker remains. M3 is integrated and post-merge validated. Any branch cleanup, M4, or other future work requires separate authorization.`
- **Verification Status**: `M3-T1 through M3-T4 were independently accepted on m3-core and integrated into main by normal merge commit f711876da659bb9c36745b3189eac986f94ba7ea. Post-merge main CI run 35750536825 with job 106823643297 passed pinned pnpm 9.15.4, npm ci, typecheck, npm test 460/460 across 26 files, focused T4 7/7, lint, build, diff check, and tracked-tree cleanliness. The direct linked-worktree harness remains incomplete only because of GIT_LAYOUT; its regression suite and supplemental worktree checks passed. Current M3 diagnostics are 0; 98 historical pre-M2 diagnostics remain outside M3 acceptance.`
- **Changed-File Summary**: `The M3-T4 local acceptance scope was exactly 14 authorized paths: .github/workflows/ci.yml; the nine files under fixtures/m3-pnpm-node-ts-project/; tests/m3T4CrossProjectAcceptance.test.ts; tsconfig.json; docs/STATE.md; and this Task Record. This post-merge reconciliation changes only docs/STATE.md and this Task Record; no M3 runtime source, package, dependency, or post-M3 files are included.`
- **Latest Checkpoint**: `PR #1 merged by normal merge commit f711876da659bb9c36745b3189eac986f94ba7ea; post-merge main CI run 35750536825 passed 460/460 across 26 files.`
- **H6 CI Evidence Addendum**: `GitHub Actions run 35585861754 (<https://github.com/lowqualityloey/sureflow/actions/runs/35585861754>) tested 99b2e340ceec288982788b16ebaa8620ddb891ed and passed. The remote npm test step/job succeeded, and the committed H6 event-corruption test block contains no skip/only markers. No separately retrieved remote per-test Vitest summary is claimed because the log archive fetch timed out.`
- **H7 CI Evidence Addendum**: `GitHub Actions run 35588373963 (<https://github.com/lowqualityloey/sureflow/actions/runs/35588373963>) tested 9bb55ca42f7ec8801cab4bc908c9be61d5b9b2c0 and passed; its test job `106296927285` (<https://github.com/lowqualityloey/sureflow/actions/runs/35588373963/job/106296927285>) concluded success. The remote npm ci, typecheck, npm test, lint, build, git diff --check, and cleanliness steps passed; npm test reported `tests/initStatus.test.ts` with 25 tests and 136 passed tests across 13 files, with no skipped tests reported. The tested SHA contains the source-install and partial-core-state `init --force` wording changes.`
- **Latest Handoff**: `N/A`
- **Next Action**: `No further M3 implementation action. Branch/worktree cleanup and any future milestone planning remain separately authorized.`

---

## 3B. Release-Evaluation Handoff (Optional)

> Use this projection only when PromptKit OS release evaluation is being handed from QA/Reviewer to a Release Coordinator. It is a durable handoff, not approval, and the canonical evaluation or Task Record remains authoritative.

- **Evaluation ID**: `[evaluation ID or N/A]`
- **Release Candidate Commit**: `[exact candidate revision or N/A]`
- **Preliminary SemVer Candidate**: `[preliminary version, including prerelease identifier when applicable, or N/A]`
- **QA/Reviewer Result**: `[Pass | Fail | Pending | N/A]`
- **Unresolved Blockers**: `[blocker, owner, and resolution condition, or None]`
- **Requested Release Coordinator Decision / Next Approval Action**: `[exact human decision requested, or N/A]`
- **Handoff Status**: `[Ready for Coordinator Review | Blocked | Deferred | N/A]`
- **Approval Boundary**: `This projection does not approve a candidate or version and does not authorize tag creation, hosted release creation, changelog publication, remote operations, deployment, or rollback.`
- **Source Evaluation / Task Record**: `[authoritative record path or N/A]`

---

## 4. Locked Technical Invariants (Do Not Undo)
- Sureflow invariants (carried from ARCHITECTURE.md §§7/41 + user brief, preserved as design intent, not implemented code): control plane owns authority; minimum sufficient context; risk/context independent; workflows = intent, policies = authority; capabilities = actions; skills = knowledge, never authority; workers disposable, state durable; multi-agent optional + cost-gated; evidence > model confidence; verification stays deterministic; explicit human approval for protected ops; MCP optional external provider; Git/tasks/evidence/events/state distinct; CLI = intent, router = topology; token efficiency never overrides correctness; CPAC > raw token minimization; every subsystem justifies complexity.
- Discovery constraint: no stack invented — CONTRIBUTING.md forbids assuming runtime/PM/CI before adoption (observed 2026-09-20).
- Human M-D1..M-D5 (2026-09-20, `docs/adrs/2026-09-20-stack-and-m1-boundary.md`): TS+Node stack; local tracking for M1; 5 protected ops + max-1-retry-then-HALT; `.sureflow/state/` authoritative, `docs/STATE.md` never runtime state; isolated `fixtures/t0-basic/`, never own source tree as fixture.
- Human M-D6..M-D13 (2026-09-21, `docs/adrs/2026-09-21-m1-t6-preflight-contracts.md`): terminal `REQUIRE_APPROVAL`; T8 before T6; closed `npm-test` dispatch; no OS-sandbox claim; fixed process-result mapping; only initial started-process nonzero exit retries; verification follows terminal retry resolution; fixture expectation remains independent.

---

## 4A. Candidate Learnings (Unpromoted)

Staging area for rules observed during sessions but not yet approved as invariants. Entries here are **never pre-filled** and are non-authoritative: agents must not treat them as policy, quote them as invariants, or copy them into project guardrails. Promotion requires a recorded human decision (`approved` / `rejected` / `deferred`) with approver, date, evidence reference, and destination (see `protocols/context-sync.md` §3.1).

| Date | Proposed Rule | Source / Evidence | Scope | Status | Human Decision (approver, date, destination) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| 2026-09-20 (M0 discovery) | ~15 | host telemetry unavailable | ~150k tok total (~8k-15k tok/turn heuristic) | Discovery reads of 8 docs + Task Record + spec + STATE.md sync; heuristic per checkpoint protocol, not billing telemetry | not tracked |
| 2026-09-20 (M1 spec) | ~14 | host telemetry unavailable | ~140k tok total (~8k-15k tok/turn heuristic) | ADR + M1 spec + M1 Task Record + STATE/PROMPTKIT sync; heuristic, not billing telemetry | not tracked |

---

## 5. Known Blockers, Risks & Open Questions
- **Blockers**:
  - No technical M3 implementation blocker remains. M3 CORE-ONLY is integrated and post-merge validated. Branch/worktree cleanup and any M4 work remain separately authorized.
- **Architectural Questions**:
  - Remaining from M0: C1 router/topology contract; C4 evidence schema key finalization + UNKNOWN transition table; C6 cost-gate units (deferred post-M2); C7 capability-filter before MCP (deferred post-M2). C8 receives a narrow M2 proposal: one literal Node/TypeScript+npm adapter behind a closed contract, not a generalized registry. C2/C3/C5 remain closed by M-D4/M-D3.
- **Technical Debt & Risks**:
  - R1 stack-by-default — CLOSED by explicit human M-D1 (+ ADR). R2 full-core-at-once — mitigated by binding M1 non-goals. R3/R4/R5 standing. npm emitted an `ignore-workspace-root-check` user-config deprecation warning during all three verification commands; it did not fail a gate.

---

## 6. Recent Architectural Decisions (ADR Log)
| Date | Title & Scope | Decision Summary | ADR File |
| :--- | :--- | :--- | :--- |
| 2026-09-20 | M1 stack/tracking/protection/state/fixture (M-D1..M-D5) | TS+Node; local tracking; 5 protected ops + 1 retry then HALT; `.sureflow/state/` authoritative; `fixtures/t0-basic/` | `docs/adrs/2026-09-20-stack-and-m1-boundary.md` |
| 2026-09-21 | M1 T6 preflight contracts (M-D6..M-D13) | terminal `REQUIRE_APPROVAL`; T8 before T6; closed profile; no OS-sandbox claim; fixed result mapping and retry/verification order | `docs/adrs/2026-09-21-m1-t6-preflight-contracts.md` |

---

## 7. Next Immediate Actions (Queued)
1. No further M3 implementation action is required.
2. Any branch/worktree cleanup requires separate authorization.
3. Any M4 or other post-M3 planning/implementation requires separate authorization.

---

## 8. Session Continuity Log
Compact record of pairing sessions to enable instant chat resumption:
<!-- Table Invariant: Keep rows strictly contiguous without blank lines; escape literal pipes as \|; use <br> for multi-line cells -->

| Date | Engineer / Agent | Milestone / Focus | Key Changes & Artifacts |
| :--- | :--- | :--- | :--- |
| 2026-09-20 | Cline | M0 discovery intake | Read ARCH/README/SECURITY/BENCHMARKS/CONTRIBUTING/CHANGELOG/PROMPTKIT/STATE; confirmed 0% implemented, no stack adopted; created Task Record + discovery spec; synced STATE.md §§1–5,7,3A |
| 2026-09-20 | Cline | M1 spec for review | Recorded human M-D1..M-D5 in ADR; closed M0; wrote M1 spec (AC-1..AC-8 + §9) + M1 Task Record; updated PROMPTKIT.md §§1-2 + STATE.md; zero code |
| 2026-09-21 | Codex | M1 T1–T5 checkpoint | Verified commits through T5 and 34 passing tests plus clean typecheck/lint; found canonical record drift; wrote checkpoint + handoff and stopped at `checkpoint_due` |
| 2026-09-21 | Codex | T6 second preflight contract correction | Accepted preflight STOP; recorded fixed npm-test result mapping, execution-outcome retry eligibility, terminal evidence/verification ordering, and fixture/evidence independence; documentation only |
| 2026-09-21 | Codex | T6 implementation | Implemented policy-gated T0 run orchestration, bounded worker primitives, fixed npm-test dispatch/result mapping, max-one retry, minimal events, one terminal evidence write, deterministic verification/state transitions, and focused tests; stopped before T9 and commit |
| 2026-09-21 | Codex | M1.1 H1 public CI | Added the bounded Node 24 GitHub Actions workflow; locally verified typecheck, 90 tests, lint, build, diff/cleanliness checks, and fixed-scope harness preflight; H2–H7 remain gated |
| 2026-09-21 | Codex | M1.1 H1 remote acceptance | Pushed `e1c3e6f04c7585c4947eaa8ae1e1f5d401038c8c` non-force to `origin/main`; GitHub Actions CI run `35572778970` passed; H1 accepted and H2–H7 remain gated |
| 2026-09-21 | Codex | M1.1 H2 Node 24 type alignment | Aligned `@types/node` to Node 24, verified 91 local tests and canonical gates, pushed `505daa10f43410a6eefb28a5b758af94227c1fbe`, and accepted H2 after CI run `35574889277` passed; H3–H7 remain gated |
| 2026-09-21 | Codex | M1.1 H3 remote acceptance | Pushed authorized commits `d8932eb` and `1d0fed1`; GitHub Actions run `35577273766` passed on `ubuntu-latest` for `1d0fed15cb54f938d55115e4a2a75caa9578d8c4`, including 100 tests and 9 H3 containment tests; H4–H7 remain gated |
| 2026-09-21 | Codex | M1.1 H4 authorization and implementation start | Human authorized H4 only; preflight confirmed baseline `e156a8a819fdcddb2cee84a8a5dfb657c3be241e` and 20 focused init/status baseline tests; H4 atomic state writes and consistency validation are in progress; H5–H7 remain gated |
| 2026-09-21 | Codex | M1.1 H4 remote acceptance | Pushed `ce4be6af2326cf8ab6c2237b0234406501a042e0` non-force to `origin/main`; GitHub Actions run `35579830623` passed on `ubuntu-latest` with npm ci, typecheck, 112 tests, lint, build, diff check, and cleanliness; H4 accepted / complete; H5–H7 remain gated |
| 2026-09-21 | Codex | M1.1 H5 implementation | Human authorized H5 only; added narrow execution.lock exclusion, lock-aware status, focused 11-test coverage, and linked bookkeeping; H1–H4 remain accepted; H6–H7 remain gated; commit and push remain unauthorized |
| 2026-09-21 | Codex | M1.1 H5 remote acceptance | Pushed `adbd526617ec82326b3921a4a69e336198412149` non-force to `origin/main`; GitHub Actions run `35583342650` passed on `ubuntu-latest` with npm ci, typecheck, 123 tests across 13 files including 11 mutation-lock tests, lint, build, diff check, and cleanliness; H5 accepted / complete; H6–H7 remain gated |
| 2026-09-21 | Codex | M1.1 H6 local implementation and commit | Human authorized H6 only after preflight confirmed event reads collapsed missing/unreadable files, threw on malformed JSON, and skipped invalid lines; implemented explicit record/corrupt event reads with focused corruption, append-preservation, and non-authority coverage; local commit created after all gates passed; push/remote acceptance remain separately authorized; H7 remains gated |
| 2026-09-21 | Codex | M1.1 H6 remote acceptance | Pushed `99b2e340ceec288982788b16ebaa8620ddb891ed` non-force to `origin/main`; GitHub Actions run `35585861754` passed on `ubuntu-latest` with npm ci, typecheck, 133 tests across 13 files, lint, build, diff check, and cleanliness; H6 accepted / complete; H7 remains gated |
| 2026-09-21 | Codex | M1.1 H7 local implementation | Human authorized H7 only; corrected source-install and `init --force` truth without changing runtime semantics, added minimal regression coverage, and passed the focused 25-test and full 136-test suites plus typecheck, lint, and build; commit/push/remote acceptance remain pending; M2 remains gated |
| 2026-09-21 | Codex | M1.1 H7 remote acceptance | Pushed `9bb55ca42f7ec8801cab4bc908c9be61d5b9b2c0` non-force to `origin/main`; GitHub Actions run `35588373963` passed on `ubuntu-latest` with npm ci, typecheck, 136 tests across 13 files including 25 `tests/initStatus.test.ts` tests, lint, build, diff check, and cleanliness; H7 and M1.1 accepted / complete; M2 remains gated |
| 2026-09-21 | Codex | M2 planning boundary | Inspected accepted baseline `0a1c503fb8a0bc5399b5a28c1cbb2418ab6c8108`; drafted the M2 real-project change-gate specification and planned Task Record; no implementation, commit, push, dependency, fixture, runtime, or remote change |
| 2026-09-21 | Codex | M2 contract clarification | Recorded control-plane ownership of `.sureflow/task.json`, immutable per-run plan snapshot/hash, task-owned replacement bytes, trusted-profile/npm-script boundary, deterministic clean-baseline semantics, and exact Git-visible scope claim; task order and estimates unchanged; T1 remains unauthorized |
| 2026-09-21 | Codex | M2 planning baseline authorization | Human approved the planning baseline and authorized one atomic commit limited to the M2 specification, M2 Task Record, and STATE projection; no implementation or M2-T1 work started |
 | 2026-09-21 | Codex | M2-T1 local implementation | Added the closed task contract parser, hashed immutable ValidatedExecutionPlan snapshot, independent Node/TypeScript fixture with explicit before/after example, 18 focused tests, and the required test-project include; full local verification passed in the permitted host environment; commit unauthorized and T2-T8 remain gated |
| 2026-09-22 | Codex | M2-T3 remote acceptance | Pushed `9b94cfa205269bc75766fadde2f657fcad2275a2` non-force to `origin/main`; GitHub Actions run `35603513806` passed; T3 accepted / complete and T4 authorization became the active boundary |
| 2026-09-22 | Codex | M2-T4 remote acceptance | Pushed `1db22b3df297af29f23890b094030e4a507fdc25` non-force to `origin/main`; GitHub Actions run `35607104678` passed with npm ci, typecheck, 215 tests across 17 files including 29 T4 tests, lint, build, diff check, and cleanliness; T4 accepted / complete; T5 authorization became the active boundary |
| 2026-09-22 | Codex | M2-T5 authorization | Human authorized read-only Git-visible scope inspection within `src/projectScope.ts`, `tests/projectScope.test.ts`, `tsconfig.json`, and the existing M2 Task Record/STATE projection; T6-T8 remain gated |
| 2026-09-22 | Human authority / Codex | M2 contract authority reconciliation | Human explicitly approved the implemented T1 single-target M2 contract; reconciled the M2 specification and T8 N7 mapping without changing runtime schema; richer path/capability/stop-policy declarations are deferred to a future generalized milestone; T8 commit/push remain unauthorized |
| 2026-09-23 | Human authority / Codex | M3-T4 acceptance-only verification | Historical pre-merge record: added the independent pnpm fixture and public-CLI acceptance harness under the exact 14-file scope; focused 7/7 and full 460/460 local gates passed; T4 commit and remote acceptance remained separately gated at that point |
| 2026-09-23 | Human authority / Codex | M3-T4 remote acceptance | Pushed `7944b13f0268473606b1b99833f1706d1159a0ab` non-force to `origin/m3-core`; GitHub Actions run `35744104235` passed with job `106801107733`, `460/460` across 26 files, focused T4 `7/7`, and all required setup/quality/cleanliness gates; M3-T4 accepted / complete on `m3-core` |
| 2026-09-23 | Human authority / Codex | M3 CORE-ONLY acceptance projection | Historical pre-merge record: reconciled M3-T1 through M3-T4 as accepted / complete on `m3-core`; PR #1 was then still open/draft/unmerged, `origin/main` was unchanged, and final closeout commit plus main integration were separately gated at that point |
| 2026-09-23 | Human authority / Codex | M3 PR readiness and integration | PR #1 was marked ready, its final body metadata was reconciled, and it was merged with normal merge commit `f711876da659bb9c36745b3189eac986f94ba7ea`; the remote `m3-core` branch was later observed absent while local `m3-core` remained, with no recreation or remediation performed |
| 2026-09-23 | Human authority / Codex | M3 post-merge validation | Main CI run `35750536825`, job `106823643297`, passed pnpm `9.15.4`, npm ci, typecheck, `460/460` tests across 26 files, focused T4 `7/7`, lint, build, diff check, and tracked-tree cleanliness; M3 integration is validated |
| 2026-09-23 | Human authority / Codex | Post-merge documentation reconciliation | Reconciled the canonical STATE projection and M3 Task Record to the completed PR #1 merge and green post-merge main CI; no M4/post-M3 feature work was introduced |

---

## 9. Session Spend Ledger
<!-- Table Invariant: Keep rows strictly contiguous without blank lines; escape literal pipes as \|; use <br> for multi-line cells -->

| Session | Turns | Measured in/out | Estimated payload | Note |
| :--- | :--- | :--- | :--- | :--- |
| 2026-09-20 (M0 discovery) | ~15 | host telemetry unavailable | ~150k tok total (~8k-15k tok/turn heuristic) | Discovery reads of 8 docs + Task Record + spec + STATE.md sync; heuristic per checkpoint protocol, not billing telemetry |
| 2026-09-20 (M1 spec) | ~14 | host telemetry unavailable | ~140k tok total (~8k-15k tok/turn heuristic) | ADR + M1 spec + M1 Task Record + STATE/PROMPTKIT sync; heuristic, not billing telemetry |
| 2026-09-21 (sync, status, checkpoint) | ~3 | host telemetry unavailable | ~30k tok total (~8k-15k tok/turn heuristic) | Disk sync, CLI status, repository audit, verification, and durable checkpoint; heuristic, not billing telemetry |
| 2026-09-21 (M1.1 H1 remote acceptance) | ~6 | host telemetry unavailable | ~60k tok total (~8k-15k tok/turn heuristic) | Approved H1 push, remote SHA verification, GitHub Actions monitoring, and M1.1 boundary checkpoint; heuristic, not billing telemetry |
| 2026-09-21 (M1.1 H2 alignment and acceptance) | ~15 | host telemetry unavailable | ~150k tok total (~8k-15k tok/turn heuristic) | H2 dependency alignment, local quality gates, authorized commit/push, remote CI monitoring, and M1.1 boundary checkpoint; heuristic, not billing telemetry |

- **Running total**: ~53 turns (5 sessions) · ~530k tokens estimated cumulative spend

## Project Closeout (Definition of Done)
- **Completed**: 2026-09-21 · **Scope delivered**: M1 deterministic local task gate, T1–T11 implementation, acceptance, and documentation closeout
- **Measured spend**: not measured (host telemetry unavailable)
- **Estimated spend**: ~320k tokens cumulative across 3 recorded sessions
- **Variance**: not measurable
- **Gates held**: npm typecheck, 90 tests across 11 files, canonical lint, npm build, git diff check, harness security, scope/secret/debug/credential/artifact guards
