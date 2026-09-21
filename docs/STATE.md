# Project State & Living Execution Tracker

## 1. Executive Summary & Current Position
- **Project Name**: Sureflow — engineering control plane for AI coding agents
- **Current Milestone / Epic**: M1.1 reliability hardening — H1 zero-cost public CI active; H2–H7 gated
- **Overall Status**: IN PROGRESS — H1 local gates pass; commit and remote CI acceptance remain pending
- **Target Release / Deadline**: M1.1 — no deadline recorded
- **Current Working Branch**: `main` at `74408a9`; H1 workflow and bookkeeping pending atomic commit
- **Last Updated**: 2026-09-21


---

## 2. Milestone & Task Progress

### Milestone Roadmap
- [x] **M0**: Repository discovery + architecture intake — completed, human-approved 2026-09-20 (M-D1..M-D5 in `docs/adrs/2026-09-20-stack-and-m1-boundary.md`)
- [x] **M1-spec**: Deterministic local task gate — APPROVED 2026-09-20 (`docs/specs/2026-09-20-m1-local-task-gate.md`)
- [x] **M1-build**: T1–T11 closeout complete; future milestones gated
- [ ] **M1.1-H1**: Zero-cost Node 24 public CI — local verification complete; commit and green remote run pending

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
- [ ] H1: zero-cost Node 24 verification workflow — active; local gates pass; commit and green remote run pending
- [!] Stop boundary: H2–H7 remain unauthorized; do not begin H2

---

## 3. Active Working Set
- **Target Workspace / Package (if Monorepo)**: Standalone repository (no packages)
- **Active RFC / Spec**: `docs/specs/2026-09-21-m1-1-reliability-hardening.md` — approved for H1 only
- **Active Task Spec**: `docs/tasks/2026-09-21-m1-1-reliability-hardening.md`
- **Key Files in Flight**: `.github/workflows/ci.yml`, the linked M1.1 specification and Task Record, and `docs/STATE.md`. No runtime, test, fixture, package, or H2–H7 implementation files are in flight.
- **Verification Commands (Scoped)**:
  - Unit Tests: `npm test` → 90 passed across 11 files on unchanged retry outside the restricted command sandbox; first attempt's child `node` process was denied with `EPERM` (2026-09-21)
  - Typecheck: `npm run typecheck` → exit 0 (2026-09-21)
  - Linter: `npm run lint` → exit 0 (2026-09-21)
  - Build: `npm run build` → exit 0 (2026-09-21)
  - Repository checks: `git diff --check` and the tracked-tree cleanliness check → exit 0 (2026-09-21)
  - Harness preflight: bounded fixed-scope scan reported no findings (2026-09-21)

---

## 3A. Execution-Control Projection (Optional)

- **Local Task Source**: `docs/tasks/2026-09-21-m1-1-reliability-hardening.md`
- **Task ID**: `TASK-2026-09-21-m1-1-reliability-hardening`
- **Task Record**: `docs/tasks/2026-09-21-m1-1-reliability-hardening.md`
- **Specification**: `docs/specs/2026-09-21-m1-1-reliability-hardening.md`
- **Execution Scope**: `M1.1 H1 only: .github/workflows/ci.yml plus linked bookkeeping records`
- **Execution State**: `in_progress`
- **Mapped `pk:tasks` Status**: `In Progress — H1 local verification complete; remote acceptance pending`
- **Active Task Pointer**: `H1 / TASK-2026-09-21-m1-1-reliability-hardening`
- **Owner / Current Actor**: `Codex, under explicit H1 authorization; H2–H7 remain gated`
- **Start Time**: `2026-09-21 06:50 UTC`
- **Current Branch**: `main`
- **Current Revision**: `74408a9; H1 atomic commit pending`
- **Checkpoint Policy**: `Commit, push, remote CI result, scope expansion, or task switch; hard stop before H2 authorization`
- **Blockers and Resume Condition**: `Remote CI pending; accept H1 only after its committed revision is pushed and the GitHub Actions run is green.`
- **Verification Status**: `H1 workflow structure matches AC-H1.1 and AC-H1.2. Typecheck, 90 tests across 11 files, lint, build, git diff check, tracked-tree cleanliness, and bounded harness preflight pass locally. The initial sandboxed test attempt denied one child node process with EPERM; the unchanged suite passed outside the restricted command sandbox.`
- **CI Evidence**: `Pending — GitHub Actions run after the H1 commit is pushed`
- **Changed-File Summary**: `.github/workflows/ci.yml` plus the existing M1.1 specification, Task Record, and `docs/STATE.md`. No runtime, test, fixture, package, or H2–H7 implementation files changed.
- **Latest Checkpoint**: `N/A - H1 is a bounded configuration task`
- **Latest Handoff**: `N/A`
- **Next Action**: `Commit the verified H1 workflow and bookkeeping atomically; push requires explicit remote authorization. Do not begin H2.`

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
1. Commit the verified H1 workflow and bookkeeping records atomically.
2. With explicit remote authorization, push only the H1 commit and require a green GitHub Actions run before accepting H1.
3. Stop; do not begin H2 without separate authorization.

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

---

## 9. Session Spend Ledger
<!-- Table Invariant: Keep rows strictly contiguous without blank lines; escape literal pipes as \|; use <br> for multi-line cells -->

| Session | Turns | Measured in/out | Estimated payload | Note |
| :--- | :--- | :--- | :--- | :--- |
| 2026-09-20 (M0 discovery) | ~15 | host telemetry unavailable | ~150k tok total (~8k-15k tok/turn heuristic) | Discovery reads of 8 docs + Task Record + spec + STATE.md sync; heuristic per checkpoint protocol, not billing telemetry |
| 2026-09-20 (M1 spec) | ~14 | host telemetry unavailable | ~140k tok total (~8k-15k tok/turn heuristic) | ADR + M1 spec + M1 Task Record + STATE/PROMPTKIT sync; heuristic, not billing telemetry |
| 2026-09-21 (sync, status, checkpoint) | ~3 | host telemetry unavailable | ~30k tok total (~8k-15k tok/turn heuristic) | Disk sync, CLI status, repository audit, verification, and durable checkpoint; heuristic, not billing telemetry |

- **Running total**: ~32 turns (3 sessions) · ~320k tokens estimated cumulative spend

## Project Closeout (Definition of Done)
- **Completed**: 2026-09-21 · **Scope delivered**: M1 deterministic local task gate, T1–T11 implementation, acceptance, and documentation closeout
- **Measured spend**: not measured (host telemetry unavailable)
- **Estimated spend**: ~320k tokens cumulative across 3 recorded sessions
- **Variance**: not measurable
- **Gates held**: npm typecheck, 90 tests across 11 files, canonical lint, npm build, git diff check, harness security, scope/secret/debug/credential/artifact guards
