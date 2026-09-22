# Task Record: M3 cross-project bounded change gate

<a id="TASK-2026-09-22-m3-cross-project-bounded-change-gate"></a>

## 1. Identity and Authority

- **Record Type**: `Task Record`
- **Task ID**: `TASK-2026-09-22-m3-cross-project-bounded-change-gate`
- **PromptKit Adaptation Profile**: `none`
- **Work Type**: `Code Work`
- **Planning Record Link**: `N/A — M3 CORE-ONLY authority is captured in this Task Record from explicit human authorization`
- **Planning Depth Reference**: `Full`
- **Assumption Record Links**: `None`
- **Specification**: `N/A — no separate M3 specification file exists; this Task Record captures the approved CORE-ONLY contract`
- **External Reference**: `N/A - local tracking remains authoritative`
- **Owner / Actor**: Human authority owns approval; Codex may implement only separately authorized M3 tasks
- **Execution Scope**: M3 CORE-ONLY; one bounded single-file change demonstrated independently on separate Node/TypeScript npm and pnpm project shapes
- **Approval Boundary**: Human authority explicitly authorized M3 CORE-ONLY planning, M3-T1 through M3-T4 implementation/acceptance, T3 and T4 commit/push/remote validation, final documentation reconciliation, PR readiness, normal merge of PR #1, and post-merge main CI observation. Release/deploy and post-M3 feature work remain separately gated.
- **Created**: 2026-09-22 00:00 UTC

## 2. Objective and Boundaries

- **Objective**: Prove the same Sureflow kernel can safely execute one bounded single-file change across separate independent Node/TypeScript npm and pnpm project shapes while preserving policy, authority, state, evidence, verification, bounded execution, and fail-closed behavior.
- **In Scope**:
  - this canonical M3 Task Record and its `docs/STATE.md` projection;
  - accepted M3-T1 closed adapter/kernel boundary and EvidenceRecord v2 contract;
  - accepted M3-T2 narrow pnpm eligibility, fixed dispatch, and read-only public preflight;
  - M3-T3 bounded verification execution, cancellation, runtime EvidenceRecord v2, and input/plan binding;
  - independent npm and pnpm acceptance and M3-T4 local acceptance-only verification;
  - `fixtures/m3-pnpm-node-ts-project/.gitignore`;
  - `fixtures/m3-pnpm-node-ts-project/package.json`;
  - `fixtures/m3-pnpm-node-ts-project/pnpm-lock.yaml`;
  - `fixtures/m3-pnpm-node-ts-project/tsconfig.json`;
  - `fixtures/m3-pnpm-node-ts-project/task.example.json`;
  - `fixtures/m3-pnpm-node-ts-project/src/displayName.ts`;
  - `fixtures/m3-pnpm-node-ts-project/test/displayName.test.ts`;
  - `fixtures/m3-pnpm-node-ts-project/scripts/lint.mjs`;
  - `fixtures/m3-pnpm-node-ts-project/scripts/build.mjs`;
  - `tests/m3T4CrossProjectAcceptance.test.ts`;
  - the 17 reviewed M3-T3 implementation, test, and config files listed under Changed Files;
  - `docs/STATE.md`;
  - `docs/tasks/2026-09-22-m3-cross-project-bounded-change-gate.md`;
  - `src/cli.ts`;
  - `src/evidenceStore.ts`;
  - `src/evidenceV2.ts`;
  - `src/m2Orchestration.ts`;
  - `src/projectChangeVerifier.ts`;
  - `src/redaction.ts`;
  - `src/verificationAdapter.ts`;
  - `src/verificationExecution.ts`;
  - `tests/evidenceStore.test.ts`;
  - `tests/evidenceV2.test.ts`;
  - `tests/m2Acceptance.test.ts`;
  - `tests/m2Orchestration.test.ts`;
  - `tests/m3T2PnpmPreflight.test.ts`;
  - `tests/projectChangeVerifier.test.ts`;
  - `tests/m3T3BoundedVerification.test.ts`;
  - `tests/verifier.test.ts`;
  - `tsconfig.json`;
  - `.github/workflows/ci.yml` for exact Node 24 / pnpm 9.15.4 CI provisioning;
  - the nine-file `fixtures/m3-pnpm-node-ts-project/` independent pnpm fixture;
  - `tests/m3T4CrossProjectAcceptance.test.ts`.
- **Explicit Non-Goals**:
  - skills, skill resolver, providers, MCP, context engines, generalized adapter registry, scheduler, daemon, queue, or multi-agent orchestration;
  - automatic repair, arbitrary shell, deployment, remote Git mutation, package-manager installation, or workspace support;
  - release, publish, deployment, or post-M3 actions; the authorized M3 merge is recorded below.
- **Dependencies**: Accepted M2 baseline `675f433e77fe9bdcc91edd05aa5e64f049fad46e`; accepted M3-T1 through M3-T4 chain integrated by PR #1 normal merge commit `f711876da659bb9c36745b3189eac986f94ba7ea`; Node 24, npm, Git, and the existing permitted-host verification environment.
- **Risk**: `High` — M3 extends deterministic verification across independent project-manager shapes and process lifetimes. Mitigation: closed adapter contracts, fixed execution budgets, direct-child-only ownership, strict evidence binding, physical containment revalidation, and fail-closed verdict/state behavior.
- **Verification Condition**: M3-T1 through M3-T4 were independently accepted on `m3-core`, PR #1 was merged with a normal merge commit, and the resulting main commit passed the recorded focused public-CLI, full-suite, typecheck, lint, build, diff, and cleanliness gates.

## 3. Dependency-Ordered Task Breakdown

- [x] **M3-T1 — Closed adapter/kernel boundary + EvidenceRecord v2 contract** — independently accepted on `m3-core` and integrated into `main` via PR #1; implementation commit `4fbe92d41940db3c7d1965a0124f6b8f9b98a40f`, CI hardening follow-up `46fb1e0cce39105e8b9a55f141204d181a15f955`, GitHub Actions run `35699026135`, `372/372` across 23 files with full gates green.
- [x] **M3-T2 — Narrow pnpm project eligibility + fixed dispatch + read-only public preflight** — independently accepted on `m3-core` and integrated into `main` via PR #1; implementation commit `5b46501eccf146777e6d8b6277700667237df464`, lint-only correction `5bfd27c2a2ea57da8e98d9b2ad6447de4a431418`, GitHub Actions run `35702794992`, `405/405` across 24 files with zero skips and typecheck/lint/build/diff/cleanliness green. The initial test-green/lint-failed result remains recorded as such.
- [x] **M3-T3 — Bounded verification execution + cancellation + runtime EvidenceRecord v2 + input/plan binding** — independently accepted on `m3-core` and integrated into `main` via PR #1 at commit `f6f4bbd8a42df2b038531e065ce7d88241f520f4`; GitHub Actions run `35731683141` passed with `453/453` across 25 files and zero skips reported.
- [x] **M3-T4 — Independent npm + pnpm acceptance / M3 closeout** — independently accepted on `m3-core` and integrated into `main` via PR #1 at `7944b13f0268473606b1b99833f1706d1159a0ab`; GitHub Actions run `35744104235` passed with `460/460` across 26 files and focused T4 `7/7`.

## 4. T3 Contract and Invariants

- Fixed execution envelope: 120 seconds per started step, 300 seconds overall, and 5 seconds termination cleanup grace; deadlines use monotonic arithmetic and are not configurable through task, adapter, CLI, project, environment, or user input.
- Sureflow owns only the directly spawned npm/pnpm child. No descendant or process-tree termination guarantee, process groups, supervisor, or tree-kill dependency is introduced.
- Terminal causes are `passed`, `failed:1..255`, `spawn-error`, `terminated:<SIGNAL>`, `timed-out`, `interrupted:SIGINT`, and `interrupted:SIGTERM`. Independently observed child termination is distinct from Sureflow-owned interruption.
- `EvidenceRecord` schema version remains `2`; only started `repo.verify` records use v2. Historical v1 records remain readable, while malformed or unknown v2 records fail closed.
- One strict `repo.read` input-binding record covers exact `package.json`, selected lockfile, `tsconfig.json`, and resolved verification-plan digests. Same-run mixed v1/v2 `repo.verify` evidence is `UNKNOWN` and never manufactures `PASS`.
- Binding inputs are physically revalidated immediately before verification. Late symlink substitution escaping the project root halts before child spawn. Invalid exit observations fail closed and never create invalid `failed:N` evidence.
- No retries or repairs were added. M3 acceptance does not claim hermeticity, descendant isolation, or any capability beyond the bounded npm/pnpm project shapes proven here.

## 4B. T4 Acceptance-Only Contract

- The accepted kernel is exercised through the built public CLI artifact against fresh disposable npm and pnpm Node/TypeScript Git projects; no runtime source module is changed.
- Each positive project exercises public `init`, `preflight <taskId>`, `run <taskId>`, `status`, and `verify <taskId>`; real `npm` or exact `pnpm@9.15.4` verification runs before and after the bounded replacement.
- Each positive project records exactly the four v2 `repo.verify` checks plus one input-binding record, preserves the target-only Git-visible mutation, and keeps public `verify` read-only with no new evidence or project writes.
- Manager mismatch, dual lockfiles, `pnpm-workspace.yaml`, and `package.json` workspaces are rejected before mutation with no successful child/evidence state.
- CI provisions exact `pnpm@9.15.4` after Node 24 setup; no corepack, unversioned pnpm, third-party action, dependency, or runtime-source change is introduced.

## 4C. Final M3 Core-Only Acceptance

- **M3-T1**: Independently accepted on `m3-core` and integrated into `main` via PR #1; implementation `4fbe92d41940db3c7d1965a0124f6b8f9b98a40f`, hardening follow-up `46fb1e0cce39105e8b9a55f141204d181a15f955`, CI run `35699026135`, `372/372` across 23 files.
- **M3-T2**: Independently accepted on `m3-core` and integrated into `main` via PR #1; implementation `5b46501eccf146777e6d8b6277700667237df464`, lint correction `5bfd27c2a2ea57da8e98d9b2ad6447de4a431418`, CI run `35702794992`, `405/405` across 24 files with zero skips.
- **M3-T3**: Independently accepted on `m3-core` and integrated into `main` via PR #1 at commit `f6f4bbd8a42df2b038531e065ce7d88241f520f4`, CI run `35731683141`, `453/453` across 25 files with zero skips reported.
- **M3-T4**: Independently accepted on `m3-core` and integrated into `main` via PR #1 at commit `7944b13f0268473606b1b99833f1706d1159a0ab`, CI run `35744104235`, job `106801107733`, synthetic PR merge SHA `e76b47838af5f94f14613f57c036292cead4c723`, `460/460` across 26 files, focused T4 `7/7`, and no T4 skips reported.

T4 remote gates passed: pinned pnpm installation, pnpm `9.15.4`, `npm ci`, typecheck, full `npm test`, lint, build, `git diff --check`, and tracked-tree cleanliness. Remote warnings were observed but did not fail a gate: deprecated ESLint, two moderate npm audit findings, and an esbuild install-script approval warning. They are not claimed resolved.

The local acceptance toolchain was Node `v24.20.0`, npm `11.19.0`, and pnpm `9.15.4`; pnpm was provisioned outside the repository under an isolated user-local prefix and is not a Sureflow dependency. The official linked-worktree harness remained exit `2` with only `PREFLIGHT|INCOMPLETE|GIT_LAYOUT|.`; the supplemental worktree-compatible metadata check and harness regression tests passed.

M3 CORE-ONLY implementation, acceptance, and main integration are complete. PR #1 was merged by normal merge commit `f711876da659bb9c36745b3189eac986f94ba7ea`; post-merge main CI run `35750536825` passed. M3 does not claim hermetic verification, descendant process-tree isolation, workspace or multi-file mutation support, package-manager installation as a product capability, automatic repair/retry, or provider/skills/MCP orchestration.

## 4A. Acceptance Criteria

- **AC-M3.1**: M3-T1 through M3-T4 were independently accepted on `m3-core` and are integrated into `main` through PR #1's normal merge commit.
- **AC-M3.2**: M3-T3 bounded execution, cancellation, v2 evidence, strict input/plan binding, containment revalidation, and fail-closed behavior are covered by the recorded local evidence without claiming descendant isolation.
- **AC-M3.3**: T3 and T4 commit, push, and remote validation remained distinct approval events; after those independent acceptances, PR #1 was merged normally into `main`.
- **AC-M3.4**: M3-T4 acceptance is proven by the public-CLI focused suite, full permitted-host and GitHub-hosted suites, fixture pre-change failures, fixture post-run checks, required CI gates, negative pre-mutation cases, and the resulting main merge commit's green CI without claiming release.

## 5. Execution Policy

- **Mode**: `Gated Mode`
- **TDD Enforcement Mode**: `disabled`
- **Batch Authorization**: `N/A - every M3 task is separately authorized`
- **Soft Checkpoint**: At each M3 task completion or around 60 minutes, whichever occurs first
- **Hard Checkpoint**: Before each M3 task transition, commit, push, scope expansion, or around 90 minutes without completion
- **Event-Driven Checkpoints**: Planning approval, implementation authorization, task completion, test failure, stop-condition trigger, commit, push, remote CI, scope expansion, handoff, compaction, or context drift
- **Stop Conditions**: Authority semantics change; arbitrary shell requirement; generalized registry/provider/MCP scope; multi-agent orchestration; failed invariant or gate; work outside the acceptance-only T4 authorization; human stop
- **Host Timer Capability**: Live host timing and forced termination are unavailable; the bounded controller uses observed monotonic elapsed time and direct-child signals within its configured execution window.

## 6. State and Active Ownership

- **Execution State**: `completed`
- **Mapped `pk:tasks` Status**: `Done`
- **Active Task Pointer**: `None`
- **Active Review Task**: `None`
- **Start Time**: `2026-09-22`
- **Current Actor**: Human authority / Codex — M3 integrated and post-merge validated; no active M3 implementation task.
- **Next Action**: No further M3 implementation action. Branch/worktree cleanup and any future milestone planning remain separately authorized.
- **Branch / Revision**: M3 integrated code baseline: main merge commit `f711876da659bb9c36745b3189eac986f94ba7ea`. Original accepted M3 head: `6f51237d68d8b20193a2924fbeb6a2d90801299f`. Local `m3-core` remains retained; remote `m3-core` is absent. No cause is asserted and no recreation/remediation occurred.
- **Changed Files**:
  - `docs/STATE.md`
  - `docs/tasks/2026-09-22-m3-cross-project-bounded-change-gate.md`
  - `src/cli.ts`
  - `src/evidenceStore.ts`
  - `src/evidenceV2.ts`
  - `src/m2Orchestration.ts`
  - `src/projectChangeVerifier.ts`
  - `src/redaction.ts`
  - `src/verificationAdapter.ts`
  - `src/verificationExecution.ts`
  - `tests/evidenceStore.test.ts`
  - `tests/evidenceV2.test.ts`
  - `tests/m2Acceptance.test.ts`
  - `tests/m2Orchestration.test.ts`
  - `tests/m3T2PnpmPreflight.test.ts`
  - `tests/projectChangeVerifier.test.ts`
  - `tests/m3T3BoundedVerification.test.ts`
  - `tests/verifier.test.ts`
  - `tsconfig.json`
  - `.github/workflows/ci.yml`
  - `fixtures/m3-pnpm-node-ts-project/.gitignore`
  - `fixtures/m3-pnpm-node-ts-project/package.json`
  - `fixtures/m3-pnpm-node-ts-project/pnpm-lock.yaml`
  - `fixtures/m3-pnpm-node-ts-project/tsconfig.json`
  - `fixtures/m3-pnpm-node-ts-project/task.example.json`
  - `fixtures/m3-pnpm-node-ts-project/src/displayName.ts`
  - `fixtures/m3-pnpm-node-ts-project/test/displayName.test.ts`
  - `fixtures/m3-pnpm-node-ts-project/scripts/lint.mjs`
  - `fixtures/m3-pnpm-node-ts-project/scripts/build.mjs`
  - `tests/m3T4CrossProjectAcceptance.test.ts`
- **Scope Change Records**: `None`
- **Checkpoint Records**: `None`
- **Handoff Records**: `None`
- **Verification Evidence**: T3 focused set `131/131`; full permitted-host suite `453/453` across 25 files; root T3 typecheck, lint, build, and diff check passed. T4 focused public-CLI suite passed `7/7`; full permitted-host and GitHub-hosted suites passed `460/460` across 26 files; both npm and pnpm disposable projects exercised `init`, `preflight`, `run`, `status`, and `verify`; pre-change fixture tests failed nonzero, post-run typecheck/lint/build and bounded replacement passed, and all four structural negatives halted before mutation. PromptKit kit reference validation and harness regression tests passed; direct linked-worktree preflight reported only `PREFLIGHT|INCOMPLETE|GIT_LAYOUT|.`; current M3 diagnostics are `0`, while 98 historical pre-M2 diagnostics remain outside M3 acceptance.
- **CI Evidence**: T1 run `35699026135` passed with `372/372` across 23 files. T2 run `35702794992` passed with `405/405` across 24 files and zero skips. T3 run `35731683141` passed with `453/453` across 25 files and zero skips reported. T4 run `35744104235`, job `106801107733`, tested branch head `7944b13f0268473606b1b99833f1706d1159a0ab` with synthetic PR merge SHA `e76b47838af5f94f14613f57c036292cead4c723`; it passed pinned pnpm setup/version, npm ci, typecheck, npm test `460/460` across 26 files, lint, build, diff check, and cleanliness. Post-merge main run `35750536825`, job `106823643297`, tested merge commit `f711876da659bb9c36745b3189eac986f94ba7ea`; pnpm `9.15.4`, npm ci, typecheck, npm test `460/460` across 26 files, focused T4 `7/7`, lint, build, diff check, and tracked-tree cleanliness all passed.
- **Review Evidence**: Read-only authority/security audit passed. Official PromptKit harness remains exit `2` with only `PREFLIGHT|INCOMPLETE|GIT_LAYOUT|.` because this is a linked worktree; supplemental Git-resolved worktree metadata checks passed.
- **Commit Evidence**: T4 commit `7944b13f0268473606b1b99833f1706d1159a0ab` is present on `m3-core` with exactly the authorized 14 paths; no additional commit was created.
- **Pull Request Evidence**: PR #1 `MERGED`; title `M3: complete cross-project bounded change gate`; original head `6f51237d68d8b20193a2924fbeb6a2d90801299f`; previous base `675f433e77fe9bdcc91edd05aa5e64f049fad46e`; normal merge commit `f711876da659bb9c36745b3189eac986f94ba7ea`; merged at `2026-09-22T15:55:01Z`.
- **Release Evidence**: `N/A — release and deployment are outside M3 CORE-ONLY scope`
- **Blocker and Resume Condition**: `No M3 implementation blocker remains. M3 is integrated and post-merge validated. Branch cleanup and any post-M3 work remain separately authorized.`
- **Completion State**: `completed`
- **Acceptance Results**: M3-T1 through M3-T4 were independently accepted on `m3-core`; PR #1 then merged them into `main` with normal merge commit `f711876da659bb9c36745b3189eac986f94ba7ea`. Post-merge main CI run `35750536825` passed `460/460` across 26 files with focused T4 `7/7` and all required gates green.
- **Changed-File Summary**: T4 committed exactly the authorized 14 paths; post-merge record reconciliation was limited to this Task Record and `docs/STATE.md`; no runtime, tests, fixtures, CI, packages, dependencies, or post-M3 implementation were changed.
- **Completion Exception**: `N/A — M3 CORE-ONLY implementation, acceptance, closeout, and main integration are complete.`
- **Completion Decision and Timestamp**: `M3 T1-T4 integrated into main by PR #1 normal merge commit f711876da659bb9c36745b3189eac986f94ba7ea; post-merge CI run 35750536825 passed at 460/460 across 26 files with focused T4 7/7.`

## 7. Transition History

| Previous State | New State | Timestamp | Actor | Reason | Supporting Evidence |
| :--- | :--- | :--- | :--- | :--- | :--- |
| N/A | planned | 2026-09-22 | Human authority / Codex | M3 CORE-ONLY authority record created before T3 commit review | This Task Record |
| planned | ready | 2026-09-22 | Human authority | M3-T1 through M3-T3 direction and separate T3 authorization boundary established | This Task Record |
| ready | in_progress | 2026-09-22 | Codex | M3-T3 implementation and remediation started under explicit authorization | T3 implementation scope |
| in_progress | awaiting_review | 2026-09-23 | Codex | T3 implementation, remediation, authority audit, and local verification complete; local commit remains separately gated | Focused and full local evidence above |
| awaiting_review | completed | 2026-09-23 | Human authority / Codex | M3 CORE-ONLY T1-T4 acceptance completed on `m3-core`; main integration was subsequently completed through PR #1 | T1-T4 remote evidence above; integration events below |

Event milestones supporting the final transition:

- T3 local commit `f6f4bbd8a42df2b038531e065ce7d88241f520f4` was created, pushed, and remotely accepted on `m3-core` by GitHub Actions run `35731683141`.
- T4 acceptance-only implementation and local verification completed with focused `7/7` and permitted-host `460/460` evidence.
- T4 local commit `7944b13f0268473606b1b99833f1706d1159a0ab` was created, pushed, and remotely accepted by GitHub Actions run `35744104235`, job `106801107733`.
- The final milestone execution state became `completed` on `m3-core`; PR #1 was later marked ready and merged normally into `main`.
- PR #1 was marked ready after final metadata reconciliation, then merged by normal merge commit `f711876da659bb9c36745b3189eac986f94ba7ea` with original head `6f51237d68d8b20193a2924fbeb6a2d90801299f` and previous base `675f433e77fe9bdcc91edd05aa5e64f049fad46e`.
- Resulting `origin/main` post-merge CI run `35750536825`, job `106823643297`, tested `f711876da659bb9c36745b3189eac986f94ba7ea` and passed `460/460` across 26 files, focused T4 `7/7`, pinned pnpm `9.15.4`, npm ci, typecheck, lint, build, diff check, and tracked-tree cleanliness.
- After merge, remote `m3-core` was observed absent while local `m3-core` remained. No recreation or remediation was performed, and all accepted M3 commits remain preserved in `main` ancestry.

## 8. Post-Merge Integration Observation

- **Integrated Revision**: `main @ f711876da659bb9c36745b3189eac986f94ba7ea`
- **PR**: `#1 — M3: complete cross-project bounded change gate — MERGED`
- **Post-Merge CI**: Run `35750536825`, job `106823643297`, `SUCCESS`; `460/460` across 26 files; focused T4 `7/7`; pinned pnpm `9.15.4`; npm ci, typecheck, lint, build, diff check, and tracked-tree cleanliness passed.
- **Warnings**: Deprecated ESLint, two moderate npm audit findings, and an esbuild install-script warning remained non-blocking and are not claimed resolved.
- **Branch Observation**: Remote `m3-core` is absent; local `m3-core` remains; no branch recreation or remediation was performed. This is an observed repository fact, not an M3 acceptance failure, and no cause is asserted.
- **Boundary**: No release, deployment, M4, or other post-M3 feature work is authorized by this record.
