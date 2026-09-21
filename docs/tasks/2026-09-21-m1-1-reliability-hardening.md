# Task Record: M1.1 reliability hardening

<a id="TASK-2026-09-21-m1-1-reliability-hardening"></a>

## 1. Identity and Authority

- **Record Type**: `Task Record`
- **Task ID**: `TASK-2026-09-21-m1-1-reliability-hardening`
- **PromptKit Adaptation Profile**: `none`
- **Work Type**: `Configuration Work`
- **Specification**: [M1.1 Reliability Hardening](../specs/2026-09-21-m1-1-reliability-hardening.md)
- **External Reference**: `N/A`
- **Owner / Actor**: Human authority; Codex implements only explicitly authorized H tasks
- **Execution Scope**: Sureflow M1.1, with H1 limited to `.github/workflows/ci.yml`
- **Approval Boundary**: Every H task, commit, push, and scope expansion require explicit human authorization
- **Created**: 2026-09-21 06:50 UTC

## 2. Objective and Boundaries

- **Objective**: Establish zero-cost reproducible CI, then conduct independently gated reliability hardening without reopening M1.
- **In Scope**: H1–H7 as planned in the linked specification; H1 only is active and implementation-ready.
- **Explicit Non-Goals**: Reopening M1; runtime/product changes in H1; H2–H7 implementation; paid infrastructure; release, tag, deployment, publication, or repository-setting changes.
- **Dependencies**: M1 complete and accepted at `74408a93f242b94e835af3417e266b8c77a00ce7`; public GitHub repository.
- **Risk**: Medium — CI is an external public integration; use read-only permissions, one standard runner, and human-gated remote acceptance.
- **Verification Condition**: Local canonical gates pass; H1 is committed and pushed; its GitHub Actions run is green.

## 3. Task Breakdown and Acceptance Criteria

- [ ] **H1**: zero-cost Node 24 verification workflow — active / implementation ready for commit.
  - **AC-H1.1**: One `ubuntu-latest` job runs Node 24 canonical gates on push to `main` and pull requests targeting `main`.
  - **AC-H1.2**: Workflow has `contents: read`, no persisted checkout credentials, no cache, artifacts, matrix, write operations, secrets, paid service, or nonstandard runner.
  - **AC-H1.3**: The actual remote GitHub Actions run against the committed H1 revision is green.
- [ ] **H2**: Node 24 type alignment — planned / gated / unauthorized.
- [ ] **H3**: runtime namespace symlink containment — planned / gated / unauthorized.
- [ ] **H4**: state interruption safety — planned / gated / unauthorized.
- [ ] **H5**: mutation lock — planned / gated / unauthorized.
- [ ] **H6**: event corruption surfacing — planned / gated / unauthorized.
- [ ] **H7**: public source-install and `init --force` documentation truth — planned / gated / unauthorized.

## 4. Execution Policy

- **Mode**: `Gated Mode`
- **TDD Enforcement Mode**: `disabled`
- **Batch Authorization**: `N/A`
- **Soft Checkpoint**: `N/A - H1 is a bounded configuration task`
- **Hard Checkpoint**: `Before H2 authorization`
- **Event-Driven Checkpoints**: `Commit, push, remote CI result, scope expansion, or task switch`
- **Stop Conditions**: `Private/metered CI, conflicting workflow, failed local or remote gate, scope expansion, or missing human authorization`
- **Host Timer Capability**: `No mechanical timer observed`

## 5. State and Active Ownership

- **Execution State**: `in_progress`
- **Mapped `pk:tasks` Status**: `In Progress`
- **Active Task Pointer**: `H1 / TASK-2026-09-21-m1-1-reliability-hardening`
- **Start Time**: `2026-09-21 06:50 UTC`
- **Current Actor**: `Codex, under explicit H1 authorization`
- **Next Action**: `Commit the verified H1 workflow and bookkeeping records atomically, then push only that commit.`

### Transition History

| Previous State | New State | Timestamp | Actor | Reason | Supporting Evidence |
|---|---|---|---|---|---|
| planned | in_progress | 2026-09-21 06:50 UTC | Human authority | H1 explicitly authorized; H2–H7 remain gated | User authorization and local H1 implementation evidence |

## 6. Evidence and Completion Gate

- **Changed Files**: `.github/workflows/ci.yml`; this task record; linked M1.1 specification; `docs/STATE.md`.
- **Scope Change Records**: `None`
- **Checkpoint Records**: `None`
- **Handoff Records**: `None`
- **Verification Evidence**: `npm run typecheck`, `npm run lint`, `npm run build`, `git diff --check`, and the tracked-tree cleanliness check passed locally on 2026-09-21. `npm test` passed 90 tests across 11 files on an unchanged retry outside the restricted command sandbox after the first attempt's child `node` process was denied with `EPERM`. The bounded PromptKit harness preflight reported no findings in its fixed scope. Remote GitHub Actions remains pending commit/push.
- **Behavior IDs**: `N/A - TDD Enforcement Mode disabled`
- **TDD Intent Register**: `N/A - TDD Enforcement Mode disabled`
- **TDD Execution Evidence**: `N/A - TDD Enforcement Mode disabled`
- **TDD Exception Verification**: `N/A - exception work type`
- **CI Evidence**: `Pending — GitHub Actions run after H1 push`
- **Review Evidence**: `Human accepted H1 local implementation`
- **Commit Evidence**: `Pending`
- **Pull Request Evidence**: `N/A - direct main push explicitly authorized for H1`
- **Release Evidence**: `N/A`
- **Blocker and Resume Condition**: `Remote CI pending; accept H1 only if the run is green.`
- **Completion State**: `awaiting_review`
- **Acceptance Results**: `AC-H1.1 and AC-H1.2 locally verified; AC-H1.3 pending remote CI.`
- **Changed-File Summary**: `.github/workflows/ci.yml` adds the bounded H1 workflow; the linked M1.1 specification, this Task Record, and `docs/STATE.md` record its approved scope and execution evidence. No runtime, test, fixture, package, or H2-H7 implementation files changed.
- **Completion Exception**: `None`
- **Completion Decision and Timestamp**: `Pending remote CI result`
