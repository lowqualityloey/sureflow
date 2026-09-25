# Post-M4 Pre-Push Size Remediation — Task Record

<a id="TASK-2026-09-25-post-m4-size-remediation"></a>

## 1. Identity and Authority

- **Record Type**: `Task Record`
- **Task ID**: `TASK-2026-09-25-post-m4-size-remediation`
- **PromptKit Adaptation Profile**: `none`
- **Work Type**: `Code Work`
- **Specification**: `docs/specs/2026-09-23-m4-bounded-multi-file-delivery.md` — completed M4 behavioral/invariant baseline; accepted local M4 boundary `749032864120c32b90d7b8d909b059cd93c89a92`
- **External Reference**: `N/A`
- **Owner / Actor**: Human authority / Codex
- **Execution Scope**: Repository `/home/heyloey/personal/sureflow`, branch `codex/m4-t6`, accepted M4 base HEAD `749032864120c32b90d7b8d909b059cd93c89a92`; exactly the nine paths listed below. M4 remains historically complete.
- **Approval Boundary**: Initial authorization covered only this post-M4 size-compliance remediation in the nine listed paths; commit and push were not then authorized. On 2026-09-25, human acceptance separately authorized exactly one local commit of this accepted nine-file scope after final closeout gates. A later separate authorization published the branch and PR #6 merged it into `main`; this later event is recorded in §7. No M4 reopening, M4-T7, product behavior change, additional path, or next milestone is authorized.
- **Created**: `2026-09-25`

## 2. Objective and Boundaries

- **Objective**: Resolve the three audited programming-workflow size violations by coherent structural extraction only, with all six resulting source/test files below 250 pure LOC and no behavior change.
- **In Scope**:
  - `docs/tasks/2026-09-25-post-m4-size-remediation.md` — this separate post-M4 Task Record.
  - `docs/STATE.md` — minimal projection of this separate task; M4 remains complete.
  - `src/completeTargetSet.ts` — retain complete-set validation and set-level types/outcomes; re-export moved compatibility symbols.
  - `src/m4TargetInspection.ts` — new per-target inspection/apply-time revalidation module.
  - `src/boundedReplacement.ts` — retain bounded-replacement public API, plan/project checks, policy, and replacement orchestration.
  - `src/boundedReplacementTarget.ts` — new single-target precondition/inspection module.
  - `tests/m4T1TaskContract.test.ts` — retain contract behavior and M2/M3 fixture-shape assertions.
  - `tests/m4T1TaskContractLoader.test.ts` — new raw-loader test module preserving existing assertions.
  - `tsconfig.json` — include only the newly authorized source/test paths as required.
- **Audited Over-Limit Files**:
  - `src/completeTargetSet.ts`: 293 pure LOC.
  - `tests/m4T1TaskContract.test.ts`: 275 pure LOC.
  - `src/boundedReplacement.ts`: 324 pure LOC.
- **Explicit Non-Goals**:
  - Any public or runtime behavior change, new product capability, or weakened/removed assertion.
  - Reopening M4, creating M4-T7, or changing the closed M4 Task Record.
  - Changes to `src/singleFileReplacement.ts`, other runtime/test/config files, package manifests, dependencies, fixtures, CLI, orchestration, evidence, locks, task-state semantics, or any M4 task behavior.
  - Addressing either out-of-scope audit observation: (1) T6 does not directly call public `verify` immediately after the deliberately failed final-state write; (2) shared lock-release-integrity failure can leave durable `accepted` state while public `run` returns HALT.
  - At initial authorization, commit, push, release, and remote mutation were excluded. Subsequent human acceptance authorized one local commit of the exact nine-file scope only; push was still unauthorized at that closeout and was later authorized separately as recorded in §7. No release or further milestone is authorized.
- **Dependencies**: M4 completed and accepted at `749032864120c32b90d7b8d909b059cd93c89a92`; the M4 specification is the behavior/invariant reference. No package or dependency changes.
- **Risk**: Medium — extraction crosses existing import boundaries; unchanged public exports and focused M4/M2/M3 regression suites mitigate risk.
- **Verification Condition**: Measure pure LOC with the prescribed AWK rule and require each of the six governed source/test files to be below 250. Preserve all existing assertions and public import paths. Pass focused T1 contract/loader, M4 complete-set/T2/T3, bounded-replacement/single-file/M2/M3 regressions; full `npm test`; typecheck, lint, build, and `git diff --check`; PromptKit references; execution-control validator and fixture harness; fixed-scope/security, secret/credential, debug/probe, unwanted-artifact, and exact-nine-file checks. Use Node `24.20.0` and npm `11.19.0`. Require human acceptance before commit. After acceptance, run final closeout gates and create only the separately authorized exact-nine-file local commit; do not push.

## 3. Acceptance Criteria

- [x] **AC-1**: The complete-target-set and bounded-replacement splits move only the authorized existing responsibilities, preserve old public import paths and all stated T1/T2/T3 and v1/M2/M3 invariants, and add no runtime behavior.
  - **Result**: `Met`
  - **Evidence**: Existing public exports and single-file APIs remain in their original modules; focused T1/M4/M2/M3 regression selection passed 259/259, and the full suite passed 583/583.
- [x] **AC-2**: The raw-loader test cases move intact to `tests/m4T1TaskContractLoader.test.ts`; no existing assertion is deleted or weakened, and Vitest discovers the new file without changing Vitest configuration.
  - **Result**: `Met`
  - **Evidence**: T1 contract coverage passed 28/28 and the moved loader coverage passed 10/10; `vitest.config.ts` is unchanged.
- [x] **AC-3**: All six governed resulting source/test files measure below 250 pure LOC; the final changed-file set is exactly the nine authorized paths.
  - **Result**: `Met`
  - **Evidence**: `completeTargetSet.ts` 83; `m4TargetInspection.ts` 217; `boundedReplacement.ts` 162; `boundedReplacementTarget.ts` 162; `m4T1TaskContract.test.ts` 173; `m4T1TaskContractLoader.test.ts` 134 pure LOC. Exact-nine-file scope confirmed.
- [x] **AC-4**: All specified local verification and control/security/artifact gates pass, with zero findings attributable to this remediation or M4; the pre-existing 98 unrelated execution-control findings are not modified.
  - **Result**: `Met`
  - **Evidence**: Recorded local verification and hygiene results in Section 6; execution-control findings remain limited to the unrelated historical baseline.

## 4. Execution Policy

- **Mode**: `Gated Mode`
- **TDD Enforcement Mode**: `disabled` — behavior is explicitly frozen; existing assertions are preserved and used as regression evidence, with no new product behavior authorized.
- **Batch Authorization**: `None`
- **Soft Checkpoint**: After each of the three splits and before final verification.
- **Hard Checkpoint**: Before any scope transition, human acceptance handoff, commit, or push.
- **Event-Driven Checkpoints**: Control-state transition, split completion, size-gate result, verification failure, scope issue, and human acceptance handoff.
- **Stop Conditions**: Any behavior change, missing existing test/assertion, any governed file at or above 250 pure LOC, any new required path, failed gate not repairable within the exact scope, or request to push. Do not weaken a gate or touch unrelated findings. One local commit of the exact accepted nine-file scope is explicitly authorized after the final closeout gates.
- **Host Timer Capability**: Live host timing and forced termination are unavailable; checkpoints are manual.

## 5. State and Active Ownership

- **Execution State**: `completed`
- **Mapped `pk:tasks` Status**: `Done`
- **Active Task Pointer**: `None`
- **Start Time**: `2026-09-24 18:56 UTC`
- **Current Actor**: Human authority / Codex — remediation complete and integrated into `main` through PR #6; PR #7 merged the final STATE reconciliation.
- **Next Action**: None. The accepted remediation is complete, published, and integrated into `main` through PR #6. No further milestone work is authorized.

### Transition History

| Previous State | New State | Timestamp | Actor | Reason | Supporting Evidence |
|---|---|---|---|---|---|
| N/A | planned | 2026-09-25 | Human authority / Codex | Separate post-M4 size-compliance work authorized; M4 stays complete and push remains unauthorized. | Accepted size-remediation discovery and explicit nine-file authorization. |
| planned | ready | 2026-09-25 | Human authority / Codex | Exact objective, acceptance criteria, boundaries, verification, and stop conditions recorded before runtime edits. | This Task Record and accepted M4 specification. |
| ready | in_progress | 2026-09-24 18:56 UTC | Human authority / Codex | Begin the separately authorized remediation at the recorded M4 base revision. | `docs/STATE.md` projection; HEAD `749032864120c32b90d7b8d909b059cd93c89a92`. |
| in_progress | awaiting_review | 2026-09-25 | Codex | Completed the three authorized structural splits and all local verification; stop for human acceptance before any commit or push. | Focused 259/259; full suite 583/583 across 40 files; typecheck, lint, build, size, scope, and hygiene evidence below. |
| awaiting_review | completed | 2026-09-25 | Human authority / Codex | Accepted the behavior-preserving remediation and authorized its exact nine-file local commit; push remains unauthorized. | Human acceptance and commit authorization; final closeout gates and accepted verification evidence below. |

## 6. Evidence and Completion Gate

- **Changed Files**:
  - `docs/tasks/2026-09-25-post-m4-size-remediation.md` — separate post-M4 record and verification evidence.
  - `docs/STATE.md` — minimal projection of the separate remediation; M4 remains complete.
  - `src/completeTargetSet.ts`, `src/m4TargetInspection.ts`, `src/boundedReplacement.ts`, `src/boundedReplacementTarget.ts`.
  - `tests/m4T1TaskContract.test.ts`, `tests/m4T1TaskContractLoader.test.ts`, `tsconfig.json`.
- **Scope Change Records**: `None`
- **Checkpoint Records**: `None`
- **Handoff Records**: `None`
- **Verification Evidence**: Node `24.20.0` / npm `11.19.0`. Focused selection (`tests/m4T1TaskContract.test.ts`, `tests/m4T1TaskContractLoader.test.ts`, M4 complete-set/T2/T3, bounded replacement, M2 orchestration/acceptance, and M3 T1-T4 regressions) passed 259/259 across 12 files; T1 contract/loader contributed 38/38, M4 complete-set/T2/T3 31/31, bounded replacement 30/30, M2 77/77, and M3 83/83. Full `npm test` passed 583/583 across 40 files. `npm run typecheck`, `npm run lint`, `npm run build`, and `git diff --check` passed. All six governed pure-LOC results are below 250: 83, 217, 162, 162, 173, and 134 respectively. PromptKit references validated 240 Markdown files; execution-control fixture harness passed 23 isolated contracts; fixed-scope/security preflight reported no findings; manual credential-shaped assignment and debug/probe scans returned no matches; `.sureflow/task.json` and `.omo/` are absent, and `dist/` is ignored build output. Default and strict execution-control validation retain only historical unrelated findings (98 / 105), with no findings attributable to this remediation or M4. Focused/full Git-backed fixture runs required the previously approved host route after sandbox `spawnSync git EPERM`; tests passed unchanged on host. Package manifests, fixtures, and dependency state are unchanged.
- **Behavior IDs**: `N/A - TDD Enforcement Mode disabled`
- **TDD Intent Register**: `N/A - TDD Enforcement Mode disabled`
- **TDD Execution Evidence**: `N/A - TDD Enforcement Mode disabled`
- **TDD Exception Verification**: `N/A - Code Work`
- **CI Evidence**: `N/A - no remote CI run authorized`
- **Review Evidence**: `Human authority accepted the behavior-preserving structural remediation and authorized one local commit of exactly this nine-file scope; no independent review is claimed.`
- **Commit Evidence**: `At remediation closeout, a local commit was authorized with message refactor(m4): satisfy pre-push size limits; full SHA is recorded in local history. Push was not authorized at that time; later publication is recorded in §7.`
- **Pull Request Evidence**: `No PR was authorized at remediation closeout. A later separate authorization published codex/m4-t6 and PR #6 merged it into main at 3400af5d8bccde510dc1b48835f4f1b0eab31d4c; PR #7 merged the final STATE reconciliation.`
- **Release Evidence**: `N/A - policy-compliance remediation only; no release authorized`
- **Blocker and Resume Condition**: `None; accepted remediation is complete and integrated. No further milestone work is authorized.`
- **Branch / Revision**: The remediation was completed on `codex/m4-t6` and integrated into `main` by PR #6 merge commit `3400af5d8bccde510dc1b48835f4f1b0eab31d4c`; PR #7 later merged the final STATE reconciliation at `1c5ecc37c641897bbdd2b416fd1505bf4ebf22f5`.
- **Completion State**: `completed`
- **Acceptance Results**: `AC-1 through AC-4 met and human-accepted; exact scope and required local gates passed.`
- **Changed-File Summary**: `Exact nine-file remediation scope in a separate structural/policy commit; three over-limit responsibilities split with no intentional behavior change.`
- **Completion Exception**: `None`
- **Completion Decision and Timestamp**: `Human acceptance and exact local commit authorization received 2026-09-25; push was not authorized at closeout and was later separately authorized and completed as recorded in §7.`

## 7. Post-closeout publication and integration update (2026-09-25)

At remediation closeout, the accepted nine-file commit was local and push was
not authorized. Human authority later separately authorized publication of
`codex/m4-t6`; PR #6 merged the completed M4 and remediation branch into
`main` at `3400af5d8bccde510dc1b48835f4f1b0eab31d4c`. Merge-commit CI run
`36096310188` passed. PR #7 then merged the final STATE reconciliation at
`1c5ecc37c641897bbdd2b416fd1505bf4ebf22f5`. M4 and the remediation remain
complete; no next milestone is authorized.
