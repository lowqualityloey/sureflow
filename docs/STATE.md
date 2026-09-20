# Project State & Living Execution Tracker

## 1. Executive Summary & Current Position
- **Project Name**: Sureflow — engineering control plane for AI coding agents
- **Current Milestone / Epic**: M1: Deterministic local task gate (spec APPROVED — implementation planning; code start gated on §9 toolchain)
- **Overall Status**: ACTIVE
- **Target Release / Deadline**: M1 implementation — pending §9 toolchain answers (PM, Node pin, TS strictness, test runner)
- **Current Working Branch**: `main` (no commits yet)
- **Last Updated**: 2026-09-20


---

## 2. Milestone & Task Progress

### Milestone Roadmap
- [x] **M0**: Repository discovery + architecture intake — completed, human-approved 2026-09-20 (M-D1..M-D5 in `docs/adrs/2026-09-20-stack-and-m1-boundary.md`)
- [x] **M1-spec**: Deterministic local task gate — APPROVED 2026-09-20 (`docs/specs/2026-09-20-m1-local-task-gate.md`)
- [/] **M1-build**: T1..T11 implementation (`docs/tasks/2026-09-20-m1-task-breakdown.md`); code start BLOCKED until §9 toolchain answers land

### Active Milestone Task Breakdown

- [x] TASK-2026-09-20-sureflow-discovery-intake: discovery baseline — completed
- [x] TASK-2026-09-20-m1-local-task-gate: M1 spec — approved 2026-09-20
- [/] TASK-2026-09-20-m1-tasks: T1..T11 build plan ready (code start gated on §9 toolchain)
- [!] Open questions §9 (package manager, Node pin, TS strictness, test runner, schemas, exit codes, commit scope) — BLOCKED on human; nothing in T1..T11 starts before answers

---

## 3. Active Working Set
- **Target Workspace / Package (if Monorepo)**: Standalone repository (no packages)
- **Active RFC / Spec**: `docs/specs/2026-09-20-m1-local-task-gate.md` (FINAL FOR REVIEW — DO NOT IMPLEMENT)
- **Active Task Spec**: `docs/tasks/2026-09-20-m1-local-task-gate.md` (awaiting human approval)
- **Key Source Files in Flight**: `docs/specs/2026-09-20-m1-local-task-gate.md`, `docs/tasks/2026-09-20-m1-local-task-gate.md`, `docs/adrs/2026-09-20-stack-and-m1-boundary.md`, `docs/STATE.md`, `PROMPTKIT.md` §§1–2 (zero implementation code by design)
- **Verification Commands (Scoped)**:
  - Unit Tests: N/A — no suite exists (repo is docs-only; `find` confirms zero manifests)
  - Typecheck: N/A — no language adopted
  - Linter: N/A — no language adopted
  - Executed this turn: `find` inventory, `git status`/`git log` (no commits yet), full reads of ARCHITECTURE/README/SECURITY/BENCHMARKS/CONTRIBUTING/CHANGELOG/PROMPTKIT.md/STATE.md, toolchain probe (python3/node present, rustc/go absent — informational only)

---

## 3A. Execution-Control Projection (Optional)

- **Local Task Source**: `docs/tasks/2026-09-20-m1-local-task-gate.md`
- **Task ID**: `TASK-2026-09-20-m1-local-task-gate`
- **Task Record**: `docs/tasks/2026-09-20-m1-local-task-gate.md`
- **Specification**: `docs/specs/2026-09-20-m1-local-task-gate.md`
- **Execution Scope**: `M1 spec for review; writes limited to docs/adrs, docs/tasks, docs/specs, docs/STATE.md, PROMPTKIT.md §§1–2; no implementation code`
- **Execution State**: `in_progress`
- **Mapped `pk:tasks` Status**: `In Progress`
- **Active Task Pointer**: `TASK-2026-09-20-m1-local-task-gate`
- **Owner / Current Actor**: `Cline + human (authority)`
- **Start Time**: `2026-09-20 23:55 UTC`
- **Current Branch**: `main (no commits yet)`
- **Current Revision**: `N/A — no commits yet`
- **Checkpoint Policy**: `Soft checkpoint on M1 spec review delivery`
- **Blockers and Resume Condition**: `M1 spec awaiting human approval
  of AC-1..AC-8 + §9 answers; resume to implementation only on
  explicit approval`
- **Verification Status**: `Spec + records written 2026-09-20; no
  test suite exists yet; no implementation files added`
- **CI Evidence**: `N/A — no host-project CI`
- **Changed-File Summary**: `ADR + M1 spec + M1 Task Record (new);
  M0 record (completed), STATE.md + PROMPTKIT.md §§1–2 (updated)`
- **Latest Checkpoint**: `None yet`
- **Latest Handoff**: `None`
- **Next Action**: `Human approves M1 spec AC-1..AC-8 + §9 answers`

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
  - M1 spec review: AC-1..AC-8 + §9 (package manager, Node pin, TS strictness, test runner, schemas, exit codes, commit scope) — owner: human; resume: explicit approval, then implementation may start.
- **Architectural Questions**:
  - Remaining from M0: C1 router/topology contract; C4 evidence schema key finalization + UNKNOWN transition table; C6 cost-gate units (deferred post-M1); C7 capability-filter before MCP (deferred post-M1); C8 stack-agnostic verify-adapter interface (M1 avoids via fixture-local verify). C2/C3/C5 closed by M-D4/M-D3. Full text: `docs/specs/2026-09-20-sureflow-discovery-intake.md` §5.
- **Technical Debt & Risks**:
  - R1 stack-by-default — CLOSED by explicit human M-D1 (+ ADR). R2 full-core-at-once — mitigated by binding M1 non-goals. R3/R4/R5 standing. No code debt exists (zero implementation files).

---

## 6. Recent Architectural Decisions (ADR Log)
| Date | Title & Scope | Decision Summary | ADR File |
| :--- | :--- | :--- | :--- |
| 2026-09-20 | M1 stack/tracking/protection/state/fixture (M-D1..M-D5) | TS+Node; local tracking; 5 protected ops + 1 retry then HALT; `.sureflow/state/` authoritative; `fixtures/t0-basic/` | `docs/adrs/2026-09-20-stack-and-m1-boundary.md` |

---

## 7. Next Immediate Actions (Queued)
1. Human approves (or amends) M1 spec AC-1..AC-8 + §9 answers (`docs/specs/2026-09-20-m1-local-task-gate.md`).
2. On approval: decide package manager, Node pin, TS strictness, test runner — then implementation may start (still gated).
3. Decide initial-commit scope via `pk:commit` (human approval; tree still uncommitted, no HEAD yet).

---

## 8. Session Continuity Log
Compact record of pairing sessions to enable instant chat resumption:
<!-- Table Invariant: Keep rows strictly contiguous without blank lines; escape literal pipes as \|; use <br> for multi-line cells -->

| Date | Engineer / Agent | Milestone / Focus | Key Changes & Artifacts |
| :--- | :--- | :--- | :--- |
| 2026-09-20 | Cline | M0 discovery intake | Read ARCH/README/SECURITY/BENCHMARKS/CONTRIBUTING/CHANGELOG/PROMPTKIT/STATE; confirmed 0% implemented, no stack adopted; created Task Record + discovery spec; synced STATE.md §§1–5,7,3A |
| 2026-09-20 | Cline | M1 spec for review | Recorded human M-D1..M-D5 in ADR; closed M0; wrote M1 spec (AC-1..AC-8 + §9) + M1 Task Record; updated PROMPTKIT.md §§1-2 + STATE.md; zero code |

---

## 9. Session Spend Ledger
<!-- Table Invariant: Keep rows strictly contiguous without blank lines; escape literal pipes as \|; use <br> for multi-line cells -->

| Session | Turns | Measured in/out | Estimated payload | Note |
| :--- | :--- | :--- | :--- | :--- |
| 2026-09-20 (M0 discovery) | ~15 | host telemetry unavailable | ~150k tok total (~8k-15k tok/turn heuristic) | Discovery reads of 8 docs + Task Record + spec + STATE.md sync; heuristic per checkpoint protocol, not billing telemetry |
| 2026-09-20 (M1 spec) | ~14 | host telemetry unavailable | ~140k tok total (~8k-15k tok/turn heuristic) | ADR + M1 spec + M1 Task Record + STATE/PROMPTKIT sync; heuristic, not billing telemetry |

- **Running total**: ~29 turns (2 sessions) - ~290k tokens estimated cumulative spend
