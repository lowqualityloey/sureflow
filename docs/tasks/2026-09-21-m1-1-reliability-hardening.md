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
- **Execution Scope**: Sureflow M1.1: H1–H3 remain complete; H4 is limited to atomic authoritative state writes, cross-file consistency validation, focused tests, and linked bookkeeping records; H5–H7 remain gated.
- **Approval Boundary**: Every H task, commit, push, and scope expansion require explicit human authorization
- **Created**: 2026-09-21 06:50 UTC

## 2. Objective and Boundaries

- **Objective**: Establish zero-cost reproducible CI, then conduct independently gated reliability hardening without reopening M1.
- **In Scope**: H1–H3 are accepted; H4 is explicitly authorized and active; H5–H7 remain gated.
- **Explicit Non-Goals**: Reopening M1; H5–H7 implementation; mutation locking, event corruption semantics, public installation/docs behavior, paid infrastructure, release, tag, deployment, publication, or repository-setting changes.
- **Dependencies**: M1 complete and accepted at `74408a93f242b94e835af3417e266b8c77a00ce7`; public GitHub repository.
- **Risk**: Medium — CI is an external public integration; use read-only permissions, one standard runner, and human-gated remote acceptance.
- **Verification Condition**: H4 focused and canonical local gates pass; H4 is ready for separate commit authorization. No commit or push is authorized in this turn.

## 3. Task Breakdown and Acceptance Criteria

- [x] **H1**: zero-cost Node 24 verification workflow — accepted / complete at `e1c3e6f04c7585c4947eaa8ae1e1f5d401038c8c`.
  - **AC-H1.1**: One `ubuntu-latest` job runs Node 24 canonical gates on push to `main` and pull requests targeting `main`.
  - **AC-H1.2**: Workflow has `contents: read`, no persisted checkout credentials, no cache, artifacts, matrix, write operations, secrets, paid service, or nonstandard runner.
  - **AC-H1.3**: The actual remote GitHub Actions run against the committed H1 revision is green.
- [x] **H2**: Node 24 type alignment — accepted / complete at `505daa10f43410a6eefb28a5b758af94227c1fbe`.
- [x] **H3**: runtime namespace symlink containment — accepted / complete; committed `d8932eb`, remotely verified by CI run `35577273766`; H4–H7 remain gated.
- [~] **H4**: state interruption safety — authorized / local commit complete; push and remote acceptance pending.
- [ ] **H5**: mutation lock — planned / gated / unauthorized.
- [ ] **H6**: event corruption surfacing — planned / gated / unauthorized.
- [ ] **H7**: public source-install and `init --force` documentation truth — planned / gated / unauthorized.

## 4. Execution Policy

- **Mode**: `Gated Mode`
- **TDD Enforcement Mode**: `disabled`
- **Batch Authorization**: `N/A`
- **Soft Checkpoint**: `N/A - H1 is a bounded configuration task`
- **Hard Checkpoint**: `Before H3 authorization`
- **Event-Driven Checkpoints**: `Commit, push, remote CI result, scope expansion, or task switch`
- **Stop Conditions**: `Private/metered CI, conflicting workflow, failed local or remote gate, scope expansion, or missing human authorization`
- **Host Timer Capability**: `No mechanical timer observed`

## 5. State and Active Ownership

- **Execution State**: `in_progress`
- **Mapped `pk:tasks` Status**: `In progress — H1–H3 accepted; H4 active; H5–H7 gated`
- **Active Task Pointer**: `H4 / TASK-2026-09-21-m1-1-reliability-hardening (local commit complete; remote acceptance pending)`
- **Start Time**: `2026-09-21 06:50 UTC; H4 authorized 2026-09-21`
- **Current Actor**: `Codex, H4 implementation under explicit authorization`
- **Next Action**: `Await separate push authorization for H4; do not begin H5.`

### Transition History

| Previous State | New State | Timestamp | Actor | Reason | Supporting Evidence |
|---|---|---|---|---|---|
| planned | in_progress | 2026-09-21 06:50 UTC | Human authority | H1 explicitly authorized; H2–H7 remain gated | User authorization and local H1 implementation evidence |
| in_progress | completed | 2026-09-21 07:24 UTC | Codex | H1 commit pushed and remote CI passed | `origin/main` = `e1c3e6f04c7585c4947eaa8ae1e1f5d401038c8c`; CI run `35572778970` concluded `success` |
| completed | in_progress | 2026-09-21 | Human authority | H2 explicitly authorized; H3–H7 remain gated | User authorization for Node 24 type alignment only |
| in_progress | completed | 2026-09-21 07:51 UTC | Codex | H2 commit pushed and remote CI passed | `origin/main` = `505daa10f43410a6eefb28a5b758af94227c1fbe`; CI run `35574889277` concluded `success` |
| completed | in_progress | 2026-09-21 | Human authority | H3 explicitly authorized; H4–H7 remain gated | User authorization: `Authorize H3 only` |
| in_progress | completed | 2026-09-21 | Codex | H3 local gates passed and atomic commit created; H4–H7 remain gated | Commit `d8932eb`; full suite and canonical gates passed |
| completed | accepted | 2026-09-21 | Codex | GitHub Actions CI passed for pushed H3 revision; H4–H7 remain gated | Run `35577273766` tested `1d0fed15cb54f938d55115e4a2a75caa9578d8c4` and concluded `success` |
| accepted | in_progress | 2026-09-21 | Human authority | H4 explicitly authorized; H5–H7 remain gated | User authorization for H4 state interruption safety only |
| in_progress | committed | 2026-09-21 | Codex | H4 local verification passed and the authorized seven-file commit was created; push remains unauthorized | Authorized seven-file H4 commit; origin/main remains `e156a8a819fdcddb2cee84a8a5dfb657c3be241e` |

## 6. Evidence and Completion Gate

- **Changed Files**: The H4 local commit contains exactly `src/atomicStateWrite.ts`, `src/stateWriter.ts`, `src/taskStateStore.ts`, `src/stateReader.ts`, `tests/initStatus.test.ts`, this Task Record, and `docs/STATE.md`; H3 files remain unchanged.
- **Scope Change Records**: `H3 acceptance recorded previously; H4 authorization recorded here and in docs/STATE.md; no H5–H7 scope expansion.`
- **Checkpoint Records**: `docs/tasks/2026-09-21-m1-1-reliability-hardening.checkpoint-1.md` — H1 remote acceptance boundary; `docs/tasks/2026-09-21-m1-1-reliability-hardening.checkpoint-2.md` — H2 remote acceptance boundary
- **Handoff Records**: `None`
- **Verification Evidence**: `H1: npm run typecheck`, npm run lint, npm run build, git diff --check, and the tracked-tree cleanliness check passed locally on 2026-09-21; npm test passed 90 tests across 11 files outside the restricted command sandbox after its initial child-node EPERM. H2: npm ci, npm run typecheck, npm test (91 tests across 11 files), npm run lint, npm run build, git diff --check, npm ls @types/node --depth=0, PromptKit reference validation, and the bounded harness preflight all passed locally on 2026-09-21. H3 focused tests passed 26 tests across 4 files; the final full suite passed 100 tests across 12 files outside the restricted sandbox, with typecheck, lint, build, diff check, PromptKit reference validation, and harness/security checks passing. H4: focused init/status suite passed 32 tests across 2 files; final host-level npm test passed 112 tests across 12 files; npm run typecheck, npm run lint, npm run build, git diff --check, PromptKit reference validation, harness preflight, and scope/secret/debug/credential/artifact guards passed. The H4 local commit was created from the exact seven-file scope; no push performed.`
- **Behavior IDs**: `N/A - TDD Enforcement Mode disabled`
- **TDD Intent Register**: `N/A - TDD Enforcement Mode disabled`
- **TDD Execution Evidence**: `N/A - TDD Enforcement Mode disabled`
- **TDD Exception Verification**: `N/A - exception work type`
- **CI Evidence**: `H1: GitHub Actions CI run 35572778970 (<https://github.com/lowqualityloey/sureflow/actions/runs/35572778970>) tested e1c3e6f04c7585c4947eaa8ae1e1f5d401038c8c and passed. H2: GitHub Actions CI run 35574889277 (<https://github.com/lowqualityloey/sureflow/actions/runs/35574889277>) tested 505daa10f43410a6eefb28a5b758af94227c1fbe and passed; its test job and all steps concluded success.`
- **Review Evidence**: `Human accepted H1 local implementation`
- **Commit Evidence**: `H1: e1c3e6f04c7585c4947eaa8ae1e1f5d401038c8c (chore(ci): add bounded Node 24 verification workflow), pushed non-force to origin/main. H2: 505daa10f43410a6eefb28a5b758af94227c1fbe (chore(toolchain): align Node typings with Node 24), pushed non-force to origin/main. H3: d8932eb (fix(paths): enforce runtime symlink containment) plus 1d0fed1 (docs(m1.1): record H3 commit completion), pushed non-force to origin/main; remote head `1d0fed15cb54f938d55115e4a2a75caa9578d8c4`.`
- **Pull Request Evidence**: `N/A - direct main push explicitly authorized for H1`
- **Release Evidence**: `N/A`
- **Blocker and Resume Condition**: `H4 local commit is complete; push/remote acceptance requires separate authorization. H5–H7 remain gated and unauthorized.`
- **Completion State**: `committed locally — remote acceptance pending`
- **Acceptance Results**: `H1 AC-H1.1, AC-H1.2, and AC-H1.3 passed. H2 local and remote CI verification passed for the exact pushed revision. H3 focused 9-test coverage and full 100-test suite, typecheck, lint, build, diff check, PromptKit reference validation, harness/security checks, and GitHub Actions CI pass for `1d0fed15cb54f938d55115e4a2a75caa9578d8c4` all pass.`
- **Changed-File Summary**: `H1–H3 remain unchanged and accepted. The H4 local commit contains exactly the same-directory atomic state-write helper, state writer/store/reader integration, focused init/status tests, this Task Record, and docs/STATE.md. No CLI, H3 containment, H5–H7 behavior, dependency, CI, or tracked runtime artifact changes.`
- **Completion Exception**: `None`
- **Completion Decision and Timestamp**: `H1 accepted 2026-09-21 07:24 UTC after CI run 35572778970 concluded success. H2 accepted 2026-09-21 07:51 UTC after CI run 35574889277 concluded success.`
