# M4 — Bounded Multi-File Delivery — Local Task Record

<a id="TASK-2026-09-23-m4-bounded-multi-file-delivery"></a>

## 1. Authority and planning status

> The planning authorization and scope history below preserves the initial 2026-09-23 documentation-only state. Current execution fields were reconciled on 2026-09-24; §1.1 and the transition history preserve subsequent task chronology.

- **Task ID**: `TASK-2026-09-23-m4-bounded-multi-file-delivery`
- **Record Type**: `Task Record`
- **PromptKit Adaptation Profile**: `none`
- **Milestone**: M4 — Bounded Multi-File Delivery
- **Specification**: `docs/specs/2026-09-23-m4-bounded-multi-file-delivery.md`
- **Owner / Actor**: Human authority / Codex
- **Execution Scope**: M4-T4 read-only post-write certification is authorized in exactly 12 runtime/test/config paths: `src/projectScope.ts`, `src/projectChangeVerifier.ts`, `tests/projectScope.test.ts`, new `tests/m4T4ProjectChangeVerifier.test.ts`, `tsconfig.json`, new `src/projectScopeGitStatus.ts`, `src/projectEvidenceEvaluation.ts`, `src/m4OrderedEvidence.ts`, `src/m4ProjectChangeVerifier.ts`, `tests/projectScopeGitStatus.test.ts`, `tests/m4T4OrderedEvidence.test.ts`, and `tests/helpers/projectScope.ts`. The only additional authorized closeout paths are this Task Record and `docs/STATE.md`, for exactly 14 files total. No other path is authorized; T5/T6 and push are unauthorized. Human authority authorized the local T4 commit after final closeout gates pass.
- **Approval Boundary**: The M4 planning baseline was initially documentation-only. T1, T2, and T3 were subsequently authorized, completed, accepted, and committed. T4 implementation was explicitly authorized in the revised 12 paths, accepted as implementation-complete, and is limited at closeout to those paths plus the two control-state documents. The local T4 commit is explicitly authorized after the final gates; T5/T6 and push remain unauthorized.
- **Created**: `2026-09-23`
- **Objective**: Implement a read-only post-write certification layer for M4-T4 that checks Git-visible changed-set and ordered evidence against the immutable M4 contract, while preserving closed target authority and separating T4 certification from T5 orchestration.
- **Initial Planning In Scope (2026-09-23)**:
  - `ROADMAP.md`
  - `docs/STATE.md`
  - `docs/specs/2026-09-23-m4-bounded-multi-file-delivery.md`
  - `docs/tasks/2026-09-23-m4-bounded-multi-file-delivery.md`
- **In Scope**:
  - `src/projectScope.ts`
  - `src/projectChangeVerifier.ts`
  - `tests/projectScope.test.ts`
  - `tests/m4T4ProjectChangeVerifier.test.ts`
  - `tsconfig.json`
  - `src/projectScopeGitStatus.ts`
  - `src/projectEvidenceEvaluation.ts`
  - `src/m4OrderedEvidence.ts`
  - `src/m4ProjectChangeVerifier.ts`
  - `tests/projectScopeGitStatus.test.ts`
  - `tests/m4T4OrderedEvidence.test.ts`
  - `tests/helpers/projectScope.ts`
  - `docs/tasks/2026-09-23-m4-bounded-multi-file-delivery.md`
  - `docs/STATE.md`
- **Explicit Non-Goals**:
  - Runtime, test, fixture, package, dependency, CI, release, or remote mutation in this planning turn
  - Automatic rollback, generalized project mutation, autonomy, providers/MCP/skills, deployment, or PromptKit migration in M4
- **Dependencies**: Accepted M1–M3, closed npm/pnpm adapters, existing lock/containment/replacement/scope/evidence boundaries; no new dependency
- **Risk**: High — partial writes and false-positive acceptance require complete-set preflight and aggregate proof
- **Verification Condition**: Preserve v1 behavior and run the T4 runtime gates and Level-2 closeout checks recorded in Verification Evidence. For this documentation-only closeout, inspect the exact 14-file diff, run diff/reference/execution-control/fixture/security/scope/secret/debug/artifact/LOC checks, then stage and commit exactly those 14 files. Do not implement T5/T6 or push.
- **Mode**: `Gated Mode`
- **Batch Authorization**: None. T1–T3 were separately authorized and accepted. T4 runtime implementation was limited to the revised 12 exact paths recorded by `SCOPE-2026-09-24-m4-t4-size-split`; this Task Record and `docs/STATE.md` are the only two separately authorized closeout files. Human authority authorized one local commit of exactly the resulting 14-file T4 scope after the final gates. No other path, T5/T6, or push is authorized.
- **Soft Checkpoint**: At each separately authorized T task completion or human review
- **Hard Checkpoint**: Before each task transition, commit, push, scope expansion, or acceptance decision
- **Event-Driven Checkpoints**: Planning approval, implementation authorization, test failure, review, commit, push, remote CI, scope change, handoff
- **Stop Conditions**: Unapproved code or file scope; authority expansion; weakened evidence/containment; historical schema reinterpretation; transaction/sandbox overclaim; human stop
- **Host Timer Capability**: Live host timing and forced termination remain unavailable; Git-backed fixture tests ran under approved host execution.
- **Execution State**: `in_progress`
- **Planning Baseline Status**: Accepted and integrated by PR #4; at that time implementation had not started. Subsequent T1/T2 execution is recorded below.
- **Mapped `pk:tasks` Status**: `In Progress`
- **Active Task Pointer**: `TASK-2026-09-23-m4-bounded-multi-file-delivery`
- **TDD Enforcement Mode**: `disabled`
- **Start Time**: `2026-09-24; M4-T4 control-state transition (time not recorded)`
- **Current Actor**: Human authority / Codex — M4-T4 implementation and verification are accepted and closed by this exact 14-file local commit. T5/T6 and push are not authorized.
- **Next Action**: Stop at the accepted T4 boundary. Do not start T5/T6 or push without separate authorization.
- **Initial Planning Changed Files**:
  - `ROADMAP.md`
  - `docs/STATE.md`
  - `docs/specs/2026-09-23-m4-bounded-multi-file-delivery.md`
  - `docs/tasks/2026-09-23-m4-bounded-multi-file-delivery.md`
- **Changed Files**:
  - `src/projectScope.ts`
  - `src/projectChangeVerifier.ts`
  - `tests/projectScope.test.ts`
  - `tests/m4T4ProjectChangeVerifier.test.ts`
  - `tsconfig.json`
  - `src/projectScopeGitStatus.ts`
  - `src/projectEvidenceEvaluation.ts`
  - `src/m4OrderedEvidence.ts`
  - `src/m4ProjectChangeVerifier.ts`
  - `tests/projectScopeGitStatus.test.ts`
  - `tests/m4T4OrderedEvidence.test.ts`
  - `tests/helpers/projectScope.ts`
  - `docs/tasks/2026-09-23-m4-bounded-multi-file-delivery.md`
  - `docs/STATE.md`
- **Historical Corrective Documentation Scope**: The prior hardening correction touched the linked M4 specification and this Task Record; the post-merge factual reconciliation touched only `docs/STATE.md` and this Task Record. The original four-file baseline scope above is historical.
- **Scope Change Records**: [SCOPE-2026-09-24-m4-t2-closeout-1](#SCOPE-2026-09-24-m4-t2-closeout-1), [SCOPE-2026-09-24-m4-t2-closeout-2](#SCOPE-2026-09-24-m4-t2-closeout-2), [SCOPE-2026-09-24-m4-t3-transition](#SCOPE-2026-09-24-m4-t3-transition), [SCOPE-2026-09-24-m4-t3-implementation](#SCOPE-2026-09-24-m4-t3-implementation), [SCOPE-2026-09-24-m4-t4-transition](#SCOPE-2026-09-24-m4-t4-transition), [SCOPE-2026-09-24-m4-t4-implementation](#SCOPE-2026-09-24-m4-t4-implementation)
- **Checkpoint Records**: `None`
- **Handoff Records**: `None`
- **Verification Evidence**: M4-T2 focused tests passed `15/15`; full `npm test` passed `513/513` across 29 files. `npm run typecheck`, `npm run lint`, `npm run build`, and `git diff --check` passed. The execution-control validator resolved all five M4-specific findings and retained 98 unrelated historical findings across six records; its 23-contract fixture harness and PromptKit reference validation passed. Harness, scope, secret/credential, debug/probe, and unwanted-artifact checks passed. Runtime: Node `24.20.0`, npm `11.19.0`. The default sandbox returned `spawnSync git EPERM` for disposable fixtures; focused/full tests passed unchanged under approved host execution. Preflight remains read-only. Repository-root `.sureflow/` was pre-existing ignored state, untouched by T2; `.sureflow/task.json` is absent, and acceptance uses isolated temporary roots. `package.json` and `package-lock.json` are unchanged. M4-T3 focused tests passed `16/16`, bounded-replacement regressions `30/30`, and full `npm test` passed `529/529` across 30 files; typecheck, lint, and build passed with Node `24.20.0` / npm `11.19.0`. M4-T3 was accepted and committed at `70efa30aac32e77e845a53a6a1b6bda2567a2b89`. Its transition checks passed with zero M4-specific findings, 98 unrelated historical findings, 23 fixture contracts, PromptKit reference validation, fixed-scope/security checks, and diff check. M4-T4 transition gates passed on `2026-09-24`: execution-control validation reported 98 unrelated historical findings across six records and zero M4-specific findings; PromptKit validated 240 Markdown files with no broken references; the execution-control fixture harness passed 23 isolated contracts; fixed-scope/security preflight reported no findings; and `git diff --check` passed. The read-only runtime scope discovery and exact-path authorization are recorded below; later T4 acceptance is recorded in the dated closeout addendum.
- **CI Evidence**: Planning-only PR #4 CI run `35815585170` succeeded. Post-merge main CI run `35816292161`, job `107038411878`, tested canonical merge SHA `4ae37149c0d0516499088f0ffd746d13e6bb1fde` and succeeded: Node 24, pnpm `9.15.4`, npm ci, typecheck, `460/460` tests across 26 files including focused M3-T4 `7/7`, lint, build, `git diff --check`, and tracked-tree cleanliness passed. Deprecated ESLint, two moderate npm audit findings, and the esbuild install-script approval warning were non-blocking. This is planning/integration regression CI, not M4 runtime acceptance.
- **Review Evidence**: The initial planning review and corrective re-review are recorded below and remain historical. The T2 implementation report and T3 implementation/verification report were reviewed and accepted by the user. The T4 implementation and verification report was reviewed and accepted as implementation-complete, subject to this final Level-2 closeout and commit gate; no independent code review is claimed.
- **Commit Evidence**: Planning commits `05904b3949297b54779c04720e2b5f8020b3b9a1` and `3cd51bcbd2e5adee67491bc794af7b58df35f997` were integrated through PR #4 at `4ae37149c0d0516499088f0ffd746d13e6bb1fde`. M4-T1 was accepted at `f7b1fd2306ede49ebe8b2012db0b94a509f14e05`. M4-T2 was accepted and committed at `79f149996523b9104c3071a2c151cd289e805e07` (`feat(m4): add complete-set preflight`). M4-T3 was accepted and committed at `70efa30aac32e77e845a53a6a1b6bda2567a2b89` (`feat(m4): add bounded multi-file write coordinator`). This exact 14-file local T4 closeout commit closes T4; its full revision is in local Git history and the final report, not embedded in this self-referential record. Nothing has been pushed.
- **Pull Request Evidence**: [PR #4 — docs(m4): plan bounded multi-file delivery](https://github.com/lowqualityloey/sureflow/pull/4) merged by normal merge commit at `2026-09-23 03:56:03 UTC`; head `3cd51bcbd2e5adee67491bc794af7b58df35f997`, merge commit `4ae37149c0d0516499088f0ffd746d13e6bb1fde`. It contained planning documents only.
- **Release Evidence**: None — no release authorized
- **Blocker and Resume Condition**: The initial five-path authorization was paused because three existing files exceeded the 250-line ceiling. Human authority accepted the split discovery and added seven paths solely for the size-compliant responsibility split; that blocker is resolved. T4 implementation and verification are accepted, and the exact 14-file local closeout commit is authorized after final gates. T5/T6 and push remain unauthorized.
- **Completion State**: M4 is not complete. T1–T4 are accepted and locally committed. T4 closes only its own task boundary; T5/T6 remain not started / unauthorized.
- **Acceptance Results**: The initial planning baseline was accepted and integrated. M4-T1 was completed, verified, accepted, and committed at the recorded SHA. M4-T2 passed the evidence in Verification Evidence and was accepted and committed at `79f149996523b9104c3071a2c151cd289e805e07`. M4-T3 implementation and verification were accepted and committed at `70efa30aac32e77e845a53a6a1b6bda2567a2b89`. M4-T4's implementation and verification report was reviewed and accepted as implementation-complete; final Level-2 closeout gates passed, and this exact 14-file local commit closes T4. M4 as a whole is not complete.
- **Changed-File Summary**: T4 changed exactly the 12 authorized runtime/test/config paths listed above, plus this Task Record and `docs/STATE.md`; no other path is authorized for this closeout.
- **Completion Exception**: M4 remains incomplete because T5/T6 have not started; T4 alone is closed by this local commit.
- **Completion Decision and Timestamp**: M4 remains incomplete. On 2026-09-24, T4 implementation and verification were accepted as implementation-complete, final closeout gates passed, and the exact 14-file T4 closeout was committed locally; nothing was pushed.
- **Branch / Revision**: `codex/m4-t4`; the T4 closeout commit is the local revision descended from accepted T3 commit `70efa30aac32e77e845a53a6a1b6bda2567a2b89`. Nothing has been pushed.
- **Planning baseline**: PR #4 normal merge commit `4ae37149c0d0516499088f0ffd746d13e6bb1fde` is a stable historical anchor, not a claim about the live `main` HEAD

**At the initial planning baseline, no M4 implementation task was authorized.**

### 1.1 Subsequent execution reconciliation (2026-09-24)

M4 was initially created in the documentation-only planning state recorded above. Implementation was later authorized task by task:

- **M4-T1:** Completed, verified, accepted, and committed at `f7b1fd2306ede49ebe8b2012db0b94a509f14e05` on `2026-09-23` (`feat(m4): add v2 task contract support`).
- **M4-T2:** Subsequently explicitly authorized, completed, accepted, and committed at `79f149996523b9104c3071a2c151cd289e805e07`. No push is authorized.
- **M4 status:** Not complete. T1–T3 are accepted and committed. T4 read-only post-write certification is accepted as implementation-complete in the revised 12 runtime/test/config paths recorded below; its 14-file local closeout commit is authorized after final gates. T5 and T6 remain not started / not authorized.

### M4-T3 authorization and control-state transition (2026-09-24)

M4-T3 was explicitly authorized after M4-T2 was accepted and committed at `79f149996523b9104c3071a2c151cd289e805e07`. The active transition is limited to this Task Record and `docs/STATE.md`. Its objective is deterministic bounded multi-file mutation for an already-eligible schema-v2 complete target set, preserving T1/T2 authority and read-only complete-set preflight. The canonical T3 plan describes behavior but does not identify exact implementation paths; runtime implementation remains unstarted pending separate exact-path authorization. T4–T6 remain not started / not authorized, M4 remains incomplete, and nothing has been pushed.

### M4-T3 implementation authorization (2026-09-24)

After the control-state transition, human authority explicitly authorized M4-T3 implementation in exactly these six runtime/test/config paths: `src/completeTargetSet.ts`, `src/boundedReplacement.ts`, new `src/singleFileReplacement.ts`, new `src/m4WriteCoordinator.ts`, new `tests/m4T3WriteCoordinator.test.ts`, and `tsconfig.json`. The Task Record and `docs/STATE.md` remain authorized only for M4-T3 scope/state/evidence reconciliation. Preserve M2 behavior; revalidate each target against its frozen T2 observation; execute in canonical normalized-path order; stop on first refusal or write failure; report completed prefix, failed target, and unattempted suffix; do not rollback, retry, persist state/evidence, invoke project verification, or claim multi-file atomicity. T4+ and push remain unauthorized. No additional path may be edited without explicit scope expansion.

**M4-T3 implementation and local verification (2026-09-24; pending human review/acceptance):** The focused coordinator suite passed `16/16`, including 2- and 5-target success, bytewise UTF-8 ordering, stale first/later target refusals, identity/canonical/trackedness refusal, thrown trackedness-probe fail-closed behavior, later rename failure with owned-temp cleanup and no rollback/suffix write, mode preservation, callback ordering/failure, and no project verification. Existing `tests/boundedReplacement.test.ts` passed `30/30`. Full `npm test` passed `529/529` across 30 files, covering M4-T1/T2 and relevant M2/M3 regressions. `npm run typecheck`, `npm run lint`, and `npm run build` passed with Node `24.20.0` / npm `11.19.0`. Disposable Git fixture tests returned `spawnSync git EPERM` before assertions in the default sandbox, then passed unchanged through the previously approved host execution path. An initial parallel broad regression run timed out two existing M2 CLI fixture tests under fixture contention; the isolated full-suite rerun passed both. Final closeout checks passed `git diff --check`, PromptKit reference validation over 240 Markdown files, the 23-contract execution-control fixture harness, and fixed-scope harness-security scan; the execution-control validator reported 98 unrelated historical findings across six records and no finding for this M4 record/projection. Targeted credential-pattern and debug/probe scans found no matches. Exact-scope inspection found only the six authorized runtime/test/config paths plus the Task Record and `docs/STATE.md`; package manifests were unchanged. Repository-root `.sureflow/` was pre-existing ignored state, not created or modified by T3; `.sureflow/task.json` is absent, disposable project tests use system temporary roots, and `.omo/` is absent. `dist/` is the ignored build output. No T4+ behavior was implemented; no package/dependency/fixture changes were made; no commit or push occurred.

**M4-T3 acceptance and closeout authorization (2026-09-24):** Human authority reviewed and accepted the T3 implementation and verification report as implementation-complete, authorized the local closeout commit of exactly the six runtime/test/config paths plus the two control-state files after the specified gates pass, and directed that work stop afterward. M4 remains incomplete; T4–T6 and push remained unauthorized at that transition.

### M4-T4 control-state transition and scope discovery (2026-09-24)

After M4-T3 was accepted and committed at `70efa30aac32e77e845a53a6a1b6bda2567a2b89`, human authority authorized this Task Record and `docs/STATE.md` for the T4 state transition and later evidence closeout, plus read-only implementation-scope discovery. T4's objective is post-write changed-set and evidence certification after successful completion of every T3 target. This authorization does not include T4 runtime/test/config edits: report the exact required paths and stop for explicit path authorization. T5 (orchestration, integration, persistence, lock ownership, public routing, and project-command execution) and T6 remain not started / unauthorized. M4 remains incomplete; nothing has been pushed.

**M4-T4 transition verification (2026-09-24):** Passed before runtime scope discovery: execution-control validator reported zero M4-specific findings (98 unrelated historical findings across six records remain); PromptKit reference validation passed for 240 Markdown files; execution-control fixture harness passed 23 isolated contracts; fixed-scope/security preflight reported no findings; and `git diff --check` passed. Runtime scope discovery is authorized read-only; no implementation path is authorized.

**M4-T4 read-only scope discovery (2026-09-24; proposal only, not implementation authorization):** The smallest recommended T4 runtime/test path set is `src/projectScope.ts`, `src/projectChangeVerifier.ts`, `tests/projectScope.test.ts`, and new `tests/m4T4ProjectChangeVerifier.test.ts`. The scope oracle should compare the fresh Git-visible changed path set with every normalized `plan.targets[].path`, rejecting missing/extra paths, rename/copy structure, and unavailable/invalid observations while preserving the existing schema-v1 single-target API and semantics. The aggregate verifier should add M4-specific ordered set evidence rules (contract pre-write/terminal binding, one success tuple per declared target on full success, or canonical successful prefix plus one closed refusal and no suffix; strict hashes, scope, required verification, and FAIL versus UNKNOWN), without changing the existing v1 verifier meaning. No EvidenceRecord schema/store change is required: the existing v1 envelope carries read/write facts and the existing v2 envelope remains for verification execution.

Fresh per-target post-write bytes and their actual SHA-256 are a T5 production responsibility, not a T4 pure-verifier responsibility: canonical evidence ordering requires observation and append after each completed rename and before the next target attempt. T3's `afterSha256` is derived from the planned replacement buffer, not a fresh disk read, so T5 must not treat it as observed postimage proof. T5 should obtain the current contained regular-file bytes in its per-target outcome callback, hash those bytes, and persist the result; exact T5 implementation paths are not authorized or selected here. The authorized T4 path set excludes CLI/orchestration, locking, evidence persistence, verification dispatch, and mutation code.

### M4-T4 runtime implementation authorization (2026-09-24)

After the read-only scope-discovery report was accepted, human authority explicitly authorized T4 implementation in exactly these five runtime/test/config paths: `src/projectScope.ts`, `src/projectChangeVerifier.ts`, `tests/projectScope.test.ts`, new `tests/m4T4ProjectChangeVerifier.test.ts`, and `tsconfig.json`. This Task Record and `docs/STATE.md` remain authorized for T4 scope/evidence reconciliation. Implement only read-only post-write certification, preserve v1 behavior, and distinguish T3 planned replacement hashes from actual observed postimage evidence. Do not produce or persist post-write observations, execute project verification commands, acquire a mutation lock, add public M4 routing, or implement T5/T6. No additional path, commit, or push is authorized.

**M4-T4 pre-implementation pause (2026-09-24):** Baseline `tests/projectScope.test.ts` and `tests/projectChangeVerifier.test.ts` passed `61/61` with Node `24.20.0` / npm `11.19.0`. Before runtime edits, the required programming workflow's 250-line ceiling was measured: the three existing files T4 must extend are already over the ceiling. A safe responsibility split would require additional source/test paths outside the exact authorization. T4 runtime and test files remain unmodified pending explicit scope resolution.

### M4-T4 size-split authorization (2026-09-24)

Human authority accepted the read-only size-compliant split discovery and expanded the prior five-path T4 authorization by exactly seven paths, solely to satisfy the programming workflow's 250-pure-LOC gate. The active runtime/test/config scope is exactly these 12 paths: `src/projectScope.ts`, `src/projectChangeVerifier.ts`, `tests/projectScope.test.ts`, `tests/m4T4ProjectChangeVerifier.test.ts`, `tsconfig.json`, `src/projectScopeGitStatus.ts`, `src/projectEvidenceEvaluation.ts`, `src/m4OrderedEvidence.ts`, `src/m4ProjectChangeVerifier.ts`, `tests/projectScopeGitStatus.test.ts`, `tests/m4T4OrderedEvidence.test.ts`, and `tests/helpers/projectScope.ts`. The original five-path authorization remains historical chronology. The Task Record and `docs/STATE.md` are separately authorized for T4 scope/evidence reconciliation. T5/T6, commit, and push remain unauthorized.

**M4-T4 implementation and local verification (2026-09-24; report status before later acceptance):** The size-safe split preserved the existing version-1 M2/M3 verifier and project-scope behavior. T4 adds read-only complete-set Git scope classification and a pure aggregate verifier for canonical ordered writes, pre-write/terminal contract bindings, exact changed-set agreement, required verification evidence/input binding, and caller-supplied per-target observed-postimage proofs. A well-formed observed digest mismatch is FAIL; planned-only, missing, malformed, contradictory, or unavailable proof is UNKNOWN as applicable. Valid canonical prefix/refusal evidence is FAIL; partial scope remains diagnostic only. T4 does not read target bytes or produce/persist postimage proof, run Git from the aggregate verifier, write project files, execute project checks, acquire a lock, route a CLI command, or implement T5/T6; the supplied proof producer/persistence handoff remains T5.

Focused T4 certification/scope and v1 verifier selection passed `87/87` across five files. The selected T1–T4, M2/M3, and bounded-write regression command passed `201/201` across 11 files. Full `npm test` passed `555/555` across 33 files. `npm run typecheck`, `npm run lint`, `npm run build`, and `git diff --check` passed on Node `24.20.0` / npm `11.19.0`. PromptKit reference validation passed for 240 Markdown files; the execution-control fixture harness passed 23 isolated contracts; fixed-scope harness security reported no findings; the execution-control validator reported zero M4-specific findings and 98 unrelated historical findings across six records. Targeted changed-file secret/credential and debug/probe scans had no matches. All 12 runtime/test/config files satisfy the 250-pure-LOC limit (largest: `tests/helpers/projectScope.ts`, 248; next largest: `tests/projectScope.test.ts`, 247). The broad regression suite initially hit default-sandbox `spawnSync git EPERM` in fixture setup before assertions; the identical selection passed unchanged under approved host execution, as did the full suite. Repository-root `.sureflow/` is ignored local state; `.sureflow/task.json` is absent. T4 code and fixture tests do not create, modify, or depend on repository-root `.sureflow/`; build output `dist/` is ignored. The TypeScript LSP server is unavailable and was not installed; compiler, lint, and build gates passed. No T4 commit or push occurred.

**M4-T4 acceptance and local closeout authorization (2026-09-24):** Human authority reviewed and accepted the implementation and verification report as implementation-complete, subject to the final Level-2 closeout and commit gate. The accepted runtime/test/config scope remains exactly 12 paths; the only two control-state paths are this Task Record and `docs/STATE.md`, for exactly 14 files total. Accepted runtime evidence is focused T4 `87/87` across five files; selected T1–T4/M2/M3/bounded-write regressions `201/201` across 11 files; full suite `555/555` across 33 files; typecheck, lint, build, and diff check passed. PromptKit references passed for 240 Markdown files; the execution-control fixture harness passed 23 contracts; zero M4-specific validator findings remained alongside 98 unrelated historical findings; fixed-scope/security, secret/credential, debug/probe, and artifact checks had no findings. Runtime was Node `24.20.0` / npm `11.19.0`. The default sandbox returned `spawnSync git EPERM` during Git fixture setup; identical focused/regression tests passed unchanged under approved host execution. The TypeScript LSP was unavailable and was not installed. Because closeout changes only the two control-state documents, the accepted runtime gates are not being repeated. T4 remains read-only and consumes supplied postimage proof; it does not produce or persist readback evidence. No T5/T6 behavior was implemented. Repository-root `.sureflow/` was pre-existing ignored state and untouched; `.sureflow/task.json` and `.omo/` are absent; `package.json` and `package-lock.json` are unchanged. Human authority authorized one local commit of exactly the 14-file T4 scope after final closeout gates; nothing has been pushed.

<a id="SCOPE-2026-09-24-m4-t4-transition"></a>

**SCOPE-2026-09-24-m4-t4-transition:** Human authority authorized exactly this Task Record and `docs/STATE.md` for the M4-T4 task transition, active scope/state projection, and later T4 evidence bookkeeping. Read-only implementation-scope discovery was authorized; T4 runtime paths were not authorized at that transition. T5/T6 and push remained unauthorized.
<a id="SCOPE-2026-09-24-m4-t4-implementation"></a>

**SCOPE-2026-09-24-m4-t4-implementation:** Human authority subsequently authorized exactly `src/projectScope.ts`, `src/projectChangeVerifier.ts`, `tests/projectScope.test.ts`, new `tests/m4T4ProjectChangeVerifier.test.ts`, and `tsconfig.json` for read-only post-write certification, plus this Task Record and `docs/STATE.md` for T4 scope/evidence reconciliation. T3, T2, and T1 behavior must remain unchanged. No T5/T6, additional paths, commit, or push are authorized.
<a id="SCOPE-2026-09-24-m4-t4-size-split"></a>

**SCOPE-2026-09-24-m4-t4-size-split:** Human authority accepted the read-only size-compliant split discovery and explicitly added only `src/projectScopeGitStatus.ts`, `src/projectEvidenceEvaluation.ts`, `src/m4OrderedEvidence.ts`, `src/m4ProjectChangeVerifier.ts`, `tests/projectScopeGitStatus.test.ts`, `tests/m4T4OrderedEvidence.test.ts`, and `tests/helpers/projectScope.ts` to the previous five-path T4 implementation scope. This expansion is solely for the programming workflow's 250-pure-LOC responsibility split and T4 certification. Together with the original five paths, the exact runtime/test/config scope is 12 paths. This Task Record and `docs/STATE.md` remain separately authorized for T4 scope/evidence reconciliation. No T5/T6 behavior, commit, or push is authorized.
<a id="SCOPE-2026-09-24-m4-t2-closeout-1"></a>

**SCOPE-2026-09-24-m4-t2-closeout-1:** Human authority separately approved adding only this Task Record to the accepted eight-file T2 implementation scope. The complete closeout scope is exactly the nine files listed under `In Scope`; the runtime implementation is unchanged.
  - `src/cli.ts`
  - `src/preflight.ts`
  - `src/projectDetection.ts`
  - `src/taskContract.ts`
  - `src/completeTargetSet.ts`
  - `tests/m4CompleteTargetSet.test.ts`
  - `tests/m4T2Preflight.test.ts`
  - `tsconfig.json`
  - `docs/tasks/2026-09-23-m4-bounded-multi-file-delivery.md`
- **SCOPE-2026-09-24-m4-t2-closeout-2:** Human authority subsequently approved adding only `docs/STATE.md` as the tenth T2 closeout file. Its change is limited to M4 projection/revision reconciliation; the accepted eight-file runtime implementation and prior nine-file scope remain unchanged.
- **T2 closeout scope:** Exactly the ten files listed under `In Scope`; no other file is authorized.
- **T2 verification:** Focused tests passed `15/15`; full suite passed `513/513` across 29 files; `npm run typecheck`, `npm run lint`, `npm run build`, and `git diff --check` passed. Harness, scope, secret/credential, debug/probe, and unwanted-artifact checks passed. Runtime was Node `24.20.0` and npm `11.19.0`. `package.json` and `package-lock.json` are unchanged.
- **Execution environment:** The focused and full fixture tests needed approved host execution because default-sandbox Git subprocesses returned `spawnSync git EPERM`. The tests passed unchanged under the qualified host environment.
- **Preflight boundary:** Preflight remains read-only; no M4-T3 or later behavior was implemented.
- **Repository-local `.sureflow/`:** It was pre-existing ignored state and was not created or modified by T2; repository-root `.sureflow/task.json` is absent. T2 acceptance used isolated temporary project roots and does not rely on repository-root `.sureflow/` contents. The preflight loader reads the task contract under the root supplied by its caller; it does not write project files.
<a id="SCOPE-2026-09-24-m4-t3-transition"></a>

**SCOPE-2026-09-24-m4-t3-transition:** Human authority explicitly authorized the T3 task transition and active scope representation in exactly `docs/tasks/2026-09-23-m4-bounded-multi-file-delivery.md` and `docs/STATE.md`. The canonical T3 plan does not list exact implementation paths, so none are inferred or included in this authorization; request explicit file-scope authorization before runtime edits. T4–T6 and push remain unauthorized.

<a id="SCOPE-2026-09-24-m4-t3-implementation"></a>

**SCOPE-2026-09-24-m4-t3-implementation:** Human authority subsequently authorized M4-T3 implementation in exactly `src/completeTargetSet.ts`, `src/boundedReplacement.ts`, `src/singleFileReplacement.ts`, `src/m4WriteCoordinator.ts`, `tests/m4T3WriteCoordinator.test.ts`, and `tsconfig.json`. The previously authorized Task Record and `docs/STATE.md` remain limited to T3 control-state/scope/evidence reconciliation. No other path, T4+ behavior, commit outside the canonical T3 commit gate, or push is authorized.

## 2. Objective and scope

**Objective:** Extend the accepted single-target control-plane gate so one
immutable, human-supplied schema-version-2 task may replace exact bytes in
2–5 declared, existing tracked UTF-8 files in one supported standalone npm
or narrow pnpm project. All target authority is established before any
project write; each write is revalidated; integrated project verification,
exact Git-visible set comparison, and aggregate evidence determine acceptance.

**In-scope planning files:** `ROADMAP.md`, `docs/STATE.md`, this Task Record,
and the linked M4 specification. Later implementation file scopes are not
pre-authorized by naming components here.

**Dependencies:** Accepted M1–M3 runtime and state/evidence contracts; the
closed npm/pnpm project adapter; existing single-file safe replacement,
mutation lock, Git-visible scope oracle, evidence store, and public run/verify
routes. No new dependency or package manager is selected.

**Risk:** High for partial mutation and false-positive acceptance. The
required controls are finite pre-authorized targets, complete-set preflight,
deterministic order, apply-time revalidation, no rollback fiction, strict
per-path evidence, exact changed-path set, and non-PASS on incomplete or
ambiguous outcomes.

**Locked invariants:**

- Schema-version-1 single-target tasks, T0, M2/M3 npm/pnpm behavior, state
  meanings, EvidenceRecord v1/v2 history, CLI commands and exit meanings stay
  compatible; no historical reinterpretation.
- Version-2 operation is exactly `replace-existing-files` with 2–5 frozen,
  unique normalized targets. Replacement bytes are supplied by the task;
  model/provider output is outside scope.
- Every target passes complete-set preflight before any target write. Any
  failure means zero target writes and controlled HALT.
- Complete-set uniqueness rejects equal normalized paths, canonical
  realpaths, and usable `(device, inode)` identities; unavailable required
  identity refuses the M4 set. Version-2 Git trackedness is literal and exact,
  without changing the historical version-1 probe.
- Canonical bytewise UTF-8 path order controls writes. Revalidate each target
  immediately before writing against its frozen physical identity; a later
  refusal preserves the completed prefix, skips the suffix, halts, and never
  triggers automatic rollback.
- Reject duplicate raw JSON keys in version-2 top-level and target objects
  before accepting authority bytes. Raw source bytes are hashed separately
  from their strict interpreted execution meaning.
- One existing `repo.write` ALLOW covers only the immutable finite set;
  default-deny and REQUIRE_APPROVAL remain authoritative.
- After the continuous mutation lock, complete-set preflight, and required
  policy ALLOW, persist the unique pre-write contract binding before the first
  target attempt. A failed append means zero target writes and non-PASS.
  Recheck source bytes against the frozen hash at the terminal checkpoint;
  observed drift never retargets a write or becomes PASS.
- Every successful target needs one strict per-path `repo.write` observation;
  integrated checks run once after all writes; actual Git-visible changes
  must equal the declared set; only aggregate PASS may accept.
- A partial-write FAIL requires a valid current contract binding and exactly
  the canonical-order success prefix followed by one refusal tuple for the
  next target; the prefix may be empty for a first-target refusal. No suffix
  tuple is allowed. Duplicate, contradictory, malformed, or missing write
  proof is UNKNOWN. Partial scope observation is diagnostic only, and no
  normal integrated verification runs after a refusal.
- Version-2 checks execute, digest, bind, and verify in fixed
  `typecheck`, `test`, `lint`, `build` order filtered by the selected set;
  declaration order changes neither execution nor resolved-plan meaning.
- The write set is not atomic and has no crash rollback, power-loss durability,
  ignored-file enforcement, process-tree isolation, or OS sandbox guarantee.

**Explicit non-goals:** New-file creation; deletion; rename/move;
dependency/package mutation; package installation; dynamic target discovery;
investigation/context engine; automatic repair, retries, rollback, recovery,
or auto-resume; multi-file transaction; workspaces/monorepos; arbitrary shell;
providers/models; MCP; skills/JIT knowledge runtime; sequential autonomy;
parallel workers; scheduler, queue, daemon; Git commit/push/PR automation;
deployment, publication, cloud services; telemetry platform; Human
Presentation Layer implementation; PromptKit workflow/template migration.

## 3. Gated dependency-ordered implementation chain

At the initial planning baseline, each unchecked item was **planned only**,
independently reviewable, and required its own human start authorization and
bounded file scope. T1–T3 were subsequently authorized and accepted. T4 was
first authorized for the control-state transition and read-only
implementation-scope discovery recorded in §1, then separately authorized for
the exact runtime paths recorded below.

- [x] **M4-T1 — Contract v2 and independent acceptance fixture shape.** Strict
  `schemaVersion: 2`/`replace-existing-files` parser, exact 2–5 target and
  closed adapter/profile validation, duplicate-key-aware raw JSON validation
  for top-level and target members before authority is accepted, raw-byte
  hash distinct from parsed meaning, and deeply frozen plan. Preserve
  version-1 parsing. Reuse the existing disposable independent npm/pnpm
  fixture patterns with only the extra tracked files needed for M4; do not
  create a fixture framework. Prove zero/one/six targets, lexical duplicates,
  duplicate raw keys, malformed fields, and immutable authority. T1 does not
  implement T2 preflight, T3 writes, T4 verification, or T5 orchestration.
  **Status:** Completed, verified, accepted, and committed at
  `f7b1fd2306ede49ebe8b2012db0b94a509f14e05`.
- [x] **M4-T2 — Complete-set validation and preflight.** Read-only full-set
  path/physical containment, canonical realpath and usable `(device, inode)`
  uniqueness, regular-file, version-2 literal exact Git trackedness, UTF-8,
  SHA-256, no-op, clean-baseline, and script-availability checks before any
  project write. Refuse unavailable required identity. Current project
  detection carries a single-`targetPath` coupling; T2 may adapt it for the
  version-2 set while preserving version-1 behavior. One invalid target must
  cause zero target writes. **Status:** Implementation complete and accepted;
  the authorized closeout is local only, and no push is authorized.
- [x] **M4-T3 — Deterministic ordered write coordinator.** Bytewise normalized
  path order, fresh per-target apply-time validation against its frozen
  physical identity and literal trackedness, accepted per-file temporary/
  rename semantics, truthful completed-prefix/first-refusal reporting using
  the closed `refused:<code>` set, cleanup only of owned temp files, and no
  rollback/retry. Exercise first/later stale or identity-changed targets
  plus injected later rename failure. **Status:** Implementation and verification
  accepted and committed at
  `70efa30aac32e77e845a53a6a1b6bda2567a2b89`.
- [x] **M4-T4 — Set-based scope and aggregate write-evidence verification.**
  Exact Git-visible set equality; strict one-tuple-per-target successful
  evidence, empty-or-longer success prefix plus one first refusal and zero
  suffix observations, duplicate/contradictory/unexpected/missing/corrupt
  handling, pre-write and terminal contract binding, canonical resolved-plan
  digest, and diagnostic-only partial scope. Keep v1/v2 historical readers
  and existing single-target verifier and binding meanings unchanged.
  **Initial authorization:** the five paths named in
  `SCOPE-2026-09-24-m4-t4-implementation` remain historical chronology.
  **Current authorization:** the revised 12 runtime/test/config paths named
  in `SCOPE-2026-09-24-m4-t4-size-split`; this Task Record and `docs/STATE.md`
  remain limited to T4 scope/evidence reconciliation. T5/T6 remain
  unauthorized. **Status:** Implementation and verification accepted; the
  exact 14-file local closeout commit is authorized after final gates.
- [ ] **M4-T5 — Single orchestration integration.** Route v2 separately from
  version 1, hold one mutation lock from before contract loading through the
  final state transition, apply eligibility/policy, append the unique
  pre-write binding before any target attempt, append observed per-target
  evidence, and persist the terminal contract-integrity observation. Run
  required verification once only after every write succeeds; inspect exact
  scope, verify evidence, and accept only PASS. A failed binding append writes
  zero targets; a refusal skips all later targets and normal verification.
  Public verify remains project-read-only and may perform only the accepted
  stale-state reconciliation.
- [ ] **M4-T6 — Independent npm/pnpm end-to-end, negative, and regression
  acceptance.** Public CLI disposable-project cases for 2-file npm, 5-file
  npm, and 2-file pnpm; all specified negatives, including duplicate raw
  keys, literal Git metacharacters, realpath/hard-link identity collisions,
  unavailable identity, malformed/duplicate/contradictory/suffix refusal
  evidence, verification spawn error, SIGINT/SIGTERM, relevant final
  state-write failure, and different valid check declaration orders;
  T0/M2/M3 compatibility and full repository gates. Local success is not
  remote acceptance.

**Task transition rule:** Each T task requires separate approval. T1, T2, and
T3 are accepted and committed. T4 implementation and verification are
accepted in the revised 12 paths named in
`SCOPE-2026-09-24-m4-t4-size-split`; this Task Record and `docs/STATE.md` are
authorized for the exact 14-file closeout and local commit after its final
gates. T5 and T6 remain not started / unauthorized. A completed task does not
automatically authorize the next task. Push, PR,
merge, release, and any further scope enlargement each require the separate
approval applicable at that point.

## 4. Acceptance and verification contract

- **AC-M4.1 Contract:** Version-2 authority is exact, immutable, hashed from
  accepted raw bytes after duplicate-key rejection, 2–5 unique targets,
  and does not widen version 1 or accept worker-supplied commands/paths.
  Different valid declaration orders may have different source hashes but
  resolve to the same canonical execution meaning. Negative contract/path
  cases in the spec are proven without project mutation.
- **AC-M4.2 Preflight:** Every declared target passes the full set of safety,
  physical uniqueness, literal exact trackedness, preimage, and non-no-op
  checks before first write; any one invalid target, unavailable identity,
  dirty baseline, missing required script, non-ALLOW policy, held lock, or
  failed pre-write binding append prevents target writes.
- **AC-M4.3 Apply:** Writes occur in deterministic path order with fresh
  identity/trackedness/preimage revalidation. A stale first or later target
  and an injected later rename failure halt without attempting subsequent
  targets or rolling back prior successes. The frozen authority survives
  contract drift; partial outcome is truthful and never accepted.
- **AC-M4.4 Evidence/scope:** One exact before/after tuple per target plus
  unique pre-write and terminal current contract observations, exact-set
  scope, canonical input binding, and complete required verification evidence
  are necessary for PASS. Missing, duplicate, contradictory, unexpected,
  stale, corrupt, wrong-digest, subset, and superset cases never PASS. A
  partial FAIL permits an empty success prefix for first-target refusal or
  an ordered completed prefix followed by one explicit closed refusal at the
  next target, with zero suffix write observations. Partial scope is
  diagnostic only. Valid explicit failure is FAIL; unavailable/ambiguous
  proof is UNKNOWN.
- **AC-M4.5 Integration:** The supported npm/pnpm public CLI paths verify the
  combined result once after all writes, run no normal acceptance checks
  after a refusal, accept only aggregate PASS, preserve project files during
  public verify, and preserve existing exit/state semantics.
- **AC-M4.6 Compatibility:** Existing T0 and M2/M3 single-target npm/pnpm
  flows, v1/v2 evidence meaning, schema-version-1 tasks, and command surface
  pass unchanged. No test is skipped or weakened for acceptance.

**Verification condition for this planning baseline:** The four authorized
Markdown files alone contain the approved decisions, acceptance mapping,
dependency-ordered task chain, and explicit implementation gate; documentation
reference validation, `git diff --check`, and fixed-scope hygiene checks pass.
The original planning baseline did not claim implementation acceptance; the subsequent T1/T2 evidence is recorded in §1.1.

**Future implementation verification:** Focused task tests, positive and
negative independent public-CLI acceptance, full permitted-host and remote CI
tests, typecheck, lint, build, diff check, cleanliness, and scope/security
guards. The restricted-host `spawnSync node EPERM` observation is environment
evidence, not proof of a Sureflow runtime defect. Historical pre-M2
execution-control diagnostics remain outside M4 acceptance and their count is
not a milestone-quality metric.

## 5. State, checkpoints, and stop conditions

- **Current actor**: Human authority / Codex, T4 implementation and verification are accepted and closed by the exact 14-file local commit. T5/T6 and push remain unauthorized.
- **Current task**: M4-T4 read-only post-write certification is complete and accepted; this local closeout commit closes T4 only. T5/T6 remain not started / unauthorized.
- **Current revision**: `codex/m4-t4`; this local T4 closeout revision descends from accepted M4-T3 commit `70efa30aac32e77e845a53a6a1b6bda2567a2b89`. Nothing has been pushed.
- **Current implementation evidence**: T1–T3 are implemented, verified,
  accepted, and committed as recorded above. T4 is implemented and locally
  verified in the revised 12 runtime/test/config paths; its certification is
  read-only and consumes supplied postimage proof. Human acceptance is recorded;
  T5 and T6 remain unstarted / unauthorized.
- **Checkpoint**: Before each T task start, completion, commit, push,
  acceptance, scope change, or human handoff; no automatic transition.
- **Stop conditions**: Any request to broaden 2–5 existing tracked files,
  authorize dynamic targets, add arbitrary commands/dependencies, weaken
  default-deny or evidence requirements, claim transaction/rollback/sandbox
  guarantees, change historical v1/v2 semantics, or cross an unapproved task
  boundary. Stop and seek explicit human authority.
- **Next action**: Stop at the accepted T4 boundary. Do not start T5/T6 or
  push without separate authorization.

## 6. Transition history

| Previous State | New State | Date | Actor | Reason |
| :--- | :--- | :--- | :--- | :--- |
| N/A | planned | 2026-09-23 | Human authority / Codex | M4-A selected for documentation-only planning; T1–T6 remain gated |
| planned | ready | Not recorded | Human authority | M4-T1 received separate explicit authorization after the planning baseline |
| ready | in_progress | Not recorded | Human authority / Codex | T1 implementation started; the M4 Task Record remains in progress across separately gated T tasks |

**Planning-only event (2026-09-23; no state change):** Five review blockers were corrected in the specification and Task Record; execution remained `planned`.

**M4-T3 authorization event (2026-09-24; execution state unchanged):** After M4-T2 was accepted and committed at `79f149996523b9104c3071a2c151cd289e805e07`, human authority authorized the M4-T3 control-state transition in the exact two-document scope recorded above. The canonical plan does not identify T3 implementation paths; code implementation remains unstarted pending separate exact-path authorization.

**Later task events while M4 remained `in_progress`:** T1 was completed, verified, accepted, and committed on 2026-09-23. T2 was subsequently authorized, completed, accepted, and committed at `79f149996523b9104c3071a2c151cd289e805e07` on 2026-09-24. T3 was first authorized for the two-file control-state transition, then separately authorized for exactly the six runtime/test/config paths recorded above; implementation and local verification completed, were accepted, and were committed at `70efa30aac32e77e845a53a6a1b6bda2567a2b89` on 2026-09-24. T4 was authorized for control-state transition and read-only scope discovery, then explicitly authorized for the five runtime/test/config paths recorded above. T5/T6 and push remain unauthorized.

**M4-T4 acceptance event (2026-09-24; M4 execution state remains `in_progress`):** Human authority accepted the T4 implementation and verification report as implementation-complete and authorized final closeout in the exact 12 runtime/test/config paths plus the Task Record and STATE projection. The accepted runtime evidence is recorded above. One local commit is authorized only after final Level-2 closeout gates pass; T5/T6 and push remain unauthorized.

**M4-T4 local closeout event (2026-09-24):** Final closeout gates passed and this exact 14-file local commit closes T4 with message `feat(m4): add post-write evidence certification`. The full SHA is supplied by local Git history and the final report rather than embedded in this self-referential record. Nothing was pushed; T5/T6 remain not started / unauthorized.
