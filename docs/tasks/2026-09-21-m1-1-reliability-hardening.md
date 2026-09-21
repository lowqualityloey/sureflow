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
- **Execution Scope**: Sureflow M1.1: H1–H7 are accepted / complete; H7 covers truthful source-install and `init --force` documentation/UX; M2 remains gated.
- **Approval Boundary**: Every H task, commit, push, and scope expansion require explicit human authorization
- **Created**: 2026-09-21 06:50 UTC

## 2. Objective and Boundaries

- **Objective**: Establish zero-cost reproducible CI, then conduct independently gated reliability hardening without reopening M1.
- **In Scope**: H1–H7 are accepted / complete after H7 remote CI; M2 remains separately gated.
- **Explicit Non-Goals**: Reopening M1; npm publication; package release; tag/release creation; new installer/updater; migration/recovery/reset systems; event authority, event replay/recovery/repair; package/dependency/CI changes; deployment, publication, or repository-setting changes; M2 implementation.
- **Dependencies**: M1 complete and accepted at `74408a93f242b94e835af3417e266b8c77a00ce7`; public GitHub repository.
- **Risk**: Medium — CI is an external public integration; use read-only permissions, one standard runner, and human-gated remote acceptance.
- **Verification Condition**: H7 focused and canonical local gates pass; the exact committed revision passed the GitHub Actions CI gates and is accepted.

## 3. Task Breakdown and Acceptance Criteria

- [x] **H1**: zero-cost Node 24 verification workflow — accepted / complete at `e1c3e6f04c7585c4947eaa8ae1e1f5d401038c8c`.
  - **AC-H1.1**: One `ubuntu-latest` job runs Node 24 canonical gates on push to `main` and pull requests targeting `main`.
  - **AC-H1.2**: Workflow has `contents: read`, no persisted checkout credentials, no cache, artifacts, matrix, write operations, secrets, paid service, or nonstandard runner.
  - **AC-H1.3**: The actual remote GitHub Actions run against the committed H1 revision is green.
- [x] **H2**: Node 24 type alignment — accepted / complete at `505daa10f43410a6eefb28a5b758af94227c1fbe`.
- [x] **H3**: runtime namespace symlink containment — accepted / complete; committed `d8932eb`, remotely verified by CI run `35577273766`; H4–H7 remain gated.
- [x] **H4**: state interruption safety — accepted / complete at `ce4be6af2326cf8ab6c2237b0234406501a042e0`; GitHub Actions run `35579830623` passed.
- [x] **H5**: mutation lock — accepted / complete at `adbd526617ec82326b3921a4a69e336198412149`; GitHub Actions run `35583342650` passed.
- [x] **H6**: event corruption surfacing — accepted / complete at `99b2e340ceec288982788b16ebaa8620ddb891ed`; GitHub Actions run `35585861754` passed.
- [x] **H7**: public source-install and `init --force` documentation truth — accepted / complete at `9bb55ca42f7ec8801cab4bc908c9be61d5b9b2c0`; GitHub Actions run `35588373963` passed.

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

- **Execution State**: `accepted`
- **Mapped `pk:tasks` Status**: `Complete`
- **Active Task Pointer**: `H7 / TASK-2026-09-21-m1-1-reliability-hardening (accepted)`
- **Start Time**: `2026-09-21 06:50 UTC; H5 authorized 2026-09-21; H6 authorized 2026-09-21`
- **Current Actor**: `Codex, H7 remotely accepted under explicit authorization; H1–H6 accepted; M2 remains gated`
- **Next Action**: `STOP. M1.1 is complete. Do not begin M2.`

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
| committed | accepted | 2026-09-21 | Codex | GitHub Actions passed for the exact pushed H4 revision; H5–H7 remain gated | Run `35579830623` tested `ce4be6af2326cf8ab6c2237b0234406501a042e0` and concluded `success` |
| accepted | in_progress | 2026-09-21 | Human authority | H5 explicitly authorized; H6–H7 remain gated | User authorization for single-project mutation exclusion only |
| in_progress | committed | 2026-09-21 | Codex | H5 local verification passed and the authorized ten-file commit was created | Commit `adbd526617ec82326b3921a4a69e336198412149`; push authorized separately |
| committed | accepted | 2026-09-21 | Codex | GitHub Actions CI passed for the exact pushed H5 revision; H6–H7 remain gated | Run `35583342650` tested `adbd526617ec82326b3921a4a69e336198412149` and concluded `success` |
| accepted | in_progress | 2026-09-21 | Human authority | H6 explicitly authorized; H7 remains gated | User authorization for event-corruption surfacing only |
| in_progress | committed | 2026-09-21 | Codex | H6 local verification passed and the authorized six-file commit was created; push remains unauthorized | H6 commit created after focused 10-test, 25-test focused-file, full 133-test, typecheck, lint, build, diff, reference, harness, and guard gates passed |
| committed | accepted | 2026-09-21 | Codex | GitHub Actions CI passed for the exact pushed H6 revision; H7 remains gated | Run `35585861754` tested `99b2e340ceec288982788b16ebaa8620ddb891ed` and concluded `success` |
| accepted | in_progress | 2026-09-21 | Human authority | H7 explicitly authorized; M2 remains gated | User authorization for public source-install and `init --force` truth only |
| in_progress | completed | 2026-09-21 | Codex | H7 local implementation and verification passed; commit/push/remote acceptance remain separately authorized | Focused init/status suite 25/25; full suite 136/136 across 13 files; typecheck, lint, and build passed |
| completed | accepted | 2026-09-21 | Codex | GitHub Actions CI passed for the exact pushed H7 revision; M1.1 is complete and M2 remains gated | Run `35588373963` tested `9bb55ca42f7ec8801cab4bc908c9be61d5b9b2c0` and concluded `success`; `tests/initStatus.test.ts` executed 25 tests with no skipped tests reported |

## 6. Evidence and Completion Gate

- **Changed Files**: `README.md`, `src/cli.ts`, `tests/initStatus.test.ts`, this Task Record, and `docs/STATE.md`; H1–H6 runtime behavior remains unchanged, including `initRuntimeState()` semantics.
- **Scope Change Records**: `H3/H4/H5/H6 acceptance recorded previously; H7 authorization and local implementation recorded here and in docs/STATE.md; no M2 scope expansion.`
- **Checkpoint Records**: `docs/tasks/2026-09-21-m1-1-reliability-hardening.checkpoint-1.md` — H1 remote acceptance boundary; `docs/tasks/2026-09-21-m1-1-reliability-hardening.checkpoint-2.md` — H2 remote acceptance boundary
- **Handoff Records**: `None`
- **Verification Evidence**: `H1: npm run typecheck`, npm run lint, npm run build, git diff --check, and the tracked-tree cleanliness check passed locally on 2026-09-21; npm test passed 90 tests across 11 files outside the restricted command sandbox after its initial child-node EPERM. H2: npm ci, npm run typecheck, npm test (91 tests across 11 files), npm run lint, npm run build, git diff --check, npm ls @types/node --depth=0, PromptKit reference validation, and the bounded harness preflight all passed locally on 2026-09-21. H3 focused tests passed 26 tests across 4 files; the final full suite passed 100 tests across 12 files outside the restricted sandbox, with typecheck, lint, build, diff check, PromptKit reference validation, and harness/security checks passing. H4: focused init/status suite passed 32 tests across 2 files; GitHub Actions run 35579830623 tested ce4be6af2326cf8ab6c2237b0234406501a042e0 on ubuntu-latest and passed npm ci, typecheck, 112 tests across 12 files, lint, build, git diff --check, and git diff cleanliness; no skips were reported. H5: focused mutation-lock suite passed 11 tests; GitHub Actions run 35583342650 tested adbd526617ec82326b3921a4a69e336198412149 on ubuntu-latest and passed npm ci, typecheck, 123 tests across 13 files including tests/mutationLock.test.ts with 11 tests and no skips, lint, build, git diff --check, and git diff --exit-code cleanliness. H6: the focused H6 selection passed 10 tests in `tests/runTask.test.ts`; the full suite passed 133 tests across 13 files; npm run typecheck, npm run lint, npm run build, git diff --check, PromptKit reference validation, harness preflight, and scope/secret/debug/credential/runtime-artifact guards all passed. H7: focused `tests/initStatus.test.ts` passed 25 tests; the full local suite passed 136 tests across 13 files; `npm run typecheck`, `npm run lint`, and `npm run build` passed. The full-suite initial sandbox attempt hit the existing `spawnSync node EPERM`; the elevated rerun passed 136/136.`
- **H7 Local Verification Addendum**: `git diff --check`, PromptKit reference validation, harness/security preflight, and scope/secret/debug/credential/runtime-artifact guards passed. No dependency, package version, CI, release, or M2 changes were detected.`
- **H7 Remote Acceptance Addendum**: `GitHub Actions run 35588373963 tested 9bb55ca42f7ec8801cab4bc908c9be61d5b9b2c0; the test job 106296927285 and npm ci, typecheck, npm test, lint, build, git diff --check, and cleanliness steps all concluded success. npm test reported 25 tests in tests/initStatus.test.ts and 136 passed tests across 13 files; no H7 tests were skipped. The tested SHA contains the source-install and init --force wording changes.`
- **Behavior IDs**: `N/A - TDD Enforcement Mode disabled`
- **TDD Intent Register**: `N/A - TDD Enforcement Mode disabled`
- **TDD Execution Evidence**: `N/A - TDD Enforcement Mode disabled`
- **TDD Exception Verification**: `N/A - exception work type`
- **CI Evidence**: `H1: GitHub Actions CI run 35572778970 (<https://github.com/lowqualityloey/sureflow/actions/runs/35572778970>) tested e1c3e6f04c7585c4947eaa8ae1e1f5d401038c8c and passed. H2: GitHub Actions CI run 35574889277 (<https://github.com/lowqualityloey/sureflow/actions/runs/35574889277>) tested 505daa10f43410a6eefb28a5b758af94227c1fbe and passed; its test job and all steps concluded success. H4: GitHub Actions CI run 35579830623 (<https://github.com/lowqualityloey/sureflow/actions/runs/35579830623>) tested ce4be6af2326cf8ab6c2237b0234406501a042e0 and passed; its test job and all required steps concluded success. H5: GitHub Actions CI run 35583342650 (<https://github.com/lowqualityloey/sureflow/actions/runs/35583342650>) tested adbd526617ec82326b3921a4a69e336198412149 and passed; its `test` job and all required steps concluded success. H7: GitHub Actions CI run 35588373963 (<https://github.com/lowqualityloey/sureflow/actions/runs/35588373963>) tested 9bb55ca42f7ec8801cab4bc908c9be61d5b9b2c0 and passed; its `test` job 106296927285 (<https://github.com/lowqualityloey/sureflow/actions/runs/35588373963/job/106296927285>) and all required steps concluded success. npm test reported 25 tests in tests/initStatus.test.ts and 136 passed tests across 13 files, with no H7 tests skipped; the tested SHA contains the source-install and init --force wording changes.`
- **Review Evidence**: `Human accepted H1 local implementation`
- **H6 Commit Evidence Addendum**: `H6 implementation commit 99b2e340ceec288982788b16ebaa8620ddb891ed (fix(events): surface corrupt event history) was pushed non-force to origin/main.`
- **H6 CI Evidence Addendum**: `GitHub Actions run 35585861754 (<https://github.com/lowqualityloey/sureflow/actions/runs/35585861754>) tested 99b2e340ceec288982788b16ebaa8620ddb891ed and passed. The remote npm test step/job succeeded, and the committed H6 event-corruption test block contains no skip/only markers. No separately retrieved remote per-test Vitest summary is claimed because the log archive fetch timed out.`
- **Commit Evidence**: `H1: e1c3e6f04c7585c4947eaa8ae1e1f5d401038c8c (chore(ci): add bounded Node 24 verification workflow), pushed non-force to origin/main. H2: 505daa10f43410a6eefb28a5b758af94227c1fbe (chore(toolchain): align Node typings with Node 24), pushed non-force to origin/main. H3: d8932eb (fix(paths): enforce runtime symlink containment) plus 1d0fed1 (docs(m1.1): record H3 commit completion), pushed non-force to origin/main; remote head `1d0fed15cb54f938d55115e4a2a75caa9578d8c4`.`
- **Pull Request Evidence**: `N/A - direct main push explicitly authorized for H1`
- **Release Evidence**: `N/A`
- **Blocker and Resume Condition**: `M1.1 has no blocker; H1–H7 are accepted / complete after H7 remote CI. M2 remains gated and unauthorized.`
- **Completion State**: `accepted — pushed and remotely verified`
- **Acceptance Results**: `H1–H6 remain accepted / complete. H7 corrects source-install guidance, replaces the misleading full-reset wording, documents partial core-state reinitialization and preserved history/evidence/events, and passes focused 25-test coverage, the full 136-test suite, typecheck, lint, build, and remote CI.`
- **Changed-File Summary**: `H7 commit 9bb55ca42f7ec8801cab4bc908c9be61d5b9b2c0 contains exactly README.md, src/cli.ts, tests/initStatus.test.ts, this Task Record, and docs/STATE.md; no dependency, package version, CI, state schema, state-writer behavior, event/evidence behavior, mutation-lock behavior, release machinery, or M2 changes.`
- **Completion Exception**: `None`
- **Completion Decision and Timestamp**: `H1 accepted 2026-09-21 07:24 UTC after CI run 35572778970 concluded success. H2 accepted 2026-09-21 07:51 UTC after CI run 35574889277 concluded success. H4 accepted 2026-09-21 after CI run 35579830623 concluded success. H5 accepted 2026-09-21 after CI run 35583342650 concluded success on adbd526617ec82326b3921a4a69e336198412149. H6 accepted 2026-09-21 after CI run 35585861754 concluded success on 99b2e340ceec288982788b16ebaa8620ddb891ed. H7 accepted 2026-09-21 after CI run 35588373963 concluded success on 9bb55ca42f7ec8801cab4bc908c9be61d5b9b2c0. M1.1 implementation accepted / complete; M2 remains gated.`
