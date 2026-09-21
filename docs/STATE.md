# Project State & Living Execution Tracker

## 1. Executive Summary & Current Position
- **Project Name**: Sureflow — engineering control plane for AI coding agents
- **Current Milestone / Epic**: M1.1 reliability hardening — H1–H6 accepted; H7 gated
- **Overall Status**: H6 ACCEPTED / COMPLETE — remote CI passed; H7 remains unauthorized
- **Target Release / Deadline**: M1.1 — no deadline recorded
- **Current Working Branch**: `main` at `99b2e340ceec288982788b16ebaa8620ddb891ed`; H1–H6 accepted; H7 gated
- **Last Updated**: 2026-09-21


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
- [!] Stop boundary: H6 is complete; do not begin H7

---

## 3. Active Working Set
- **Target Workspace / Package (if Monorepo)**: Standalone repository (no packages)
- **Active RFC / Spec**: `docs/specs/2026-09-21-m1-1-reliability-hardening.md` — H1–H6 accepted; H7 gated
- **Active Task Spec**: `docs/tasks/2026-09-21-m1-1-reliability-hardening.md`
- **Key Files in Flight**: H6 acceptance bookkeeping is recorded in `docs/STATE.md` and the Task Record; H7 remains out of scope.
- **Verification Commands (Scoped)**:
  - Unit Tests: H6-focused selection → 10 passed (15 non-H6 tests excluded by name filter) in `tests/runTask.test.ts`; GitHub Actions full suite → 133 passed across 13 files (2026-09-21)
  - Typecheck: `npm run typecheck` → exit 0 (2026-09-21)
  - Linter: `npm run lint` → exit 0 (2026-09-21)
  - Build: `npm run build` → exit 0 (2026-09-21)
  - Repository checks: GitHub Actions `git diff --check` and tracked-tree cleanliness → exit 0 (2026-09-21)
  - PromptKit reference validation: exit 0; harness preflight: bounded fixed-scope scan reported no findings; scope/secret/debug/credential/runtime-artifact guards passed (2026-09-21)
  - H3 focused tests: 9 passed locally; GitHub Actions full suite: 100 passed across 12 files on `ubuntu-latest`; H4 remote CI: 112 passed across 12 files on `ubuntu-latest`; H5 remote CI: 123 passed across 13 files on `ubuntu-latest`, including 11 mutation-lock tests

---

## 3A. Execution-Control Projection (Optional)

- **Local Task Source**: `docs/tasks/2026-09-21-m1-1-reliability-hardening.md`
- **Task ID**: `TASK-2026-09-21-m1-1-reliability-hardening`
- **Task Record**: `docs/tasks/2026-09-21-m1-1-reliability-hardening.md`
- **Specification**: `docs/specs/2026-09-21-m1-1-reliability-hardening.md`
- **Execution Scope**: `M1.1 H6 acceptance: event-log corruption surfacing and remote CI evidence; H1–H6 accepted; H7 gated`
- **Execution State**: `accepted`
- **Mapped `pk:tasks` Status**: `Complete`
- **Active Task Pointer**: `H6 / TASK-2026-09-21-m1-1-reliability-hardening (accepted)`
- **Owner / Current Actor**: `Codex, H6 remotely accepted under explicit authorization; H1–H5 accepted; H7 remains gated`
- **Start Time**: `2026-09-21 06:50 UTC`
- **Current Branch**: `main`
- **Current Revision**: `99b2e340ceec288982788b16ebaa8620ddb891ed; H1–H6 accepted; origin/main matches`
- **Checkpoint Policy**: `Commit, push, remote CI result, scope expansion, or task switch; stop before H7 work`
- **Blockers and Resume Condition**: `H6 has no blocker; remote CI passed. H7 remains gated and unauthorized.`
- **Verification Status**: `H6-focused selection: 10 passed in tests/runTask.test.ts; GitHub Actions run 35585861754 passed the full 133-test suite across 13 files; npm ci, typecheck, lint, build, git diff --check, and cleanliness all passed.`
- **CI Evidence**: `H1: GitHub Actions CI run 35572778970 (<https://github.com/lowqualityloey/sureflow/actions/runs/35572778970>) passed on e1c3e6f04c7585c4947eaa8ae1e1f5d401038c8c. H2: GitHub Actions CI run 35574889277 (<https://github.com/lowqualityloey/sureflow/actions/runs/35574889277>) passed on 505daa10f43410a6eefb28a5b758af94227c1fbe; its test job and all steps concluded success. H4: GitHub Actions CI run 35579830623 (<https://github.com/lowqualityloey/sureflow/actions/runs/35579830623>) passed on ce4be6af2326cf8ab6c2237b0234406501a042e0; its test job and all required steps concluded success. H5: GitHub Actions CI run 35583342650 (<https://github.com/lowqualityloey/sureflow/actions/runs/35583342650>) passed on adbd526617ec82326b3921a4a69e336198412149; the test job and every required step concluded success.`
- **Changed-File Summary**: `H6 commit 99b2e340ceec288982788b16ebaa8620ddb891ed contains exactly src/eventStore.ts, tests/runTask.test.ts, tests/negativePaths.test.ts, tests/t10Audit.test.ts, docs/STATE.md, and the M1.1 Task Record; no dependency, CLI, state-authority, verifier, H3, H4, H5, CI, or H7 changes.`
- **Latest Checkpoint**: `H6 remote acceptance recorded in this state tracker and the M1.1 Task Record; run 35585861754 passed on the exact pushed revision`
- **H6 CI Evidence Addendum**: `GitHub Actions run 35585861754 (<https://github.com/lowqualityloey/sureflow/actions/runs/35585861754>) tested 99b2e340ceec288982788b16ebaa8620ddb891ed and passed. The remote npm test step/job succeeded, and the committed H6 event-corruption test block contains no skip/only markers. No separately retrieved remote per-test Vitest summary is claimed because the log archive fetch timed out.`
- **Latest Handoff**: `N/A`
- **Next Action**: `STOP. Do not begin H7.`

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
| 2026-09-20 (M0 discovery) | ~15 | host telemetry unavailable | ~150k tok total (~8k-15k tok/turn heuristic) | Discovery reads of 8 docs + Task Record + spec + STATE.md sync; heuristic per checkpoint protocol, not billing telemetry |
| 2026-09-20 (M1 spec) | ~14 | host telemetry unavailable | ~140k tok total (~8k-15k tok/turn heuristic) | ADR + M1 spec + M1 Task Record + STATE/PROMPTKIT sync; heuristic, not billing telemetry | not tracked |

---

## 5. Known Blockers, Risks & Open Questions
- **Blockers**:
  - M1 implementation, integration acceptance, verification, negative acceptance, determinism audit, and T11 documentation closeout are complete. Future milestones remain gated.
- **Architectural Questions**:
  - Remaining from M0: C1 router/topology contract; C4 evidence schema key finalization + UNKNOWN transition table; C6 cost-gate units (deferred post-M1); C7 capability-filter before MCP (deferred post-M1); C8 stack-agnostic verify-adapter interface (M1 avoids via fixture-local verify). C2/C3/C5 closed by M-D4/M-D3. Full text: `docs/specs/2026-09-20-sureflow-discovery-intake.md` §5.
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
1. H2 accepted: commit `505daa10f43410a6eefb28a5b758af94227c1fbe` is on `origin/main`; CI run `35574889277` passed.
2. H3 commits `d8932eb` and `1d0fed1` pushed; GitHub Actions run `35577273766` passed.
3. H4 commit `ce4be6af2326cf8ab6c2237b0234406501a042e0` pushed; GitHub Actions run `35579830623` passed; H4 accepted / complete.
4. H5 commit `adbd526617ec82326b3921a4a69e336198412149` pushed; GitHub Actions run `35583342650` passed with 123 tests and no skips; H5 accepted / complete.
5. H6 commit `99b2e340ceec288982788b16ebaa8620ddb891ed` pushed; GitHub Actions run `35585861754` passed with 133 tests across 13 files; H6 accepted / complete; do not begin H7.

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
