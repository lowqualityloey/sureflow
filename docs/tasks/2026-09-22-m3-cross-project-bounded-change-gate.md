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
- **Approval Boundary**: Human authority explicitly authorized M3 CORE-ONLY planning, M3-T1 and M3-T2 implementation/acceptance, M3-T3 implementation/remediation/local verification, and this documentation reconciliation. T3 commit, push, remote acceptance, T4, merge, and release remain separately gated.
- **Created**: 2026-09-22 00:00 UTC

## 2. Objective and Boundaries

- **Objective**: Prove the same Sureflow kernel can safely execute one bounded single-file change across separate independent Node/TypeScript npm and pnpm project shapes while preserving policy, authority, state, evidence, verification, bounded execution, and fail-closed behavior.
- **In Scope**:
  - this canonical M3 Task Record and its `docs/STATE.md` projection;
  - accepted M3-T1 closed adapter/kernel boundary and EvidenceRecord v2 contract;
  - accepted M3-T2 narrow pnpm eligibility, fixed dispatch, and read-only public preflight;
  - M3-T3 bounded verification execution, cancellation, runtime EvidenceRecord v2, and input/plan binding;
  - independent npm and pnpm acceptance and M3 closeout as the separately gated M3-T4;
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
  - `tsconfig.json`.
- **Explicit Non-Goals**:
  - skills, skill resolver, providers, MCP, context engines, generalized adapter registry, scheduler, daemon, queue, or multi-agent orchestration;
  - automatic repair, arbitrary shell, deployment, remote Git mutation, package-manager installation, or workspace support;
  - T4 real npm/pnpm acceptance before separate authorization;
  - M3 merge, release, publish, or deployment actions.
- **Dependencies**: Accepted M2 baseline `675f433e77fe9bdcc91edd05aa5e64f049fad46e`; accepted M3-T1 and M3-T2 commits on `m3-core`; Node 24, npm, Git, and the existing permitted-host verification environment.
- **Risk**: `High` — M3 extends deterministic verification across independent project-manager shapes and process lifetimes. Mitigation: closed adapter contracts, fixed execution budgets, direct-child-only ownership, strict evidence binding, physical containment revalidation, and fail-closed verdict/state behavior.
- **Verification Condition**: M3-T3 is ready for local commit review only after its focused and full permitted-host evidence, typecheck, lint, build, diff, PromptKit, harness, and hygiene checks remain green; M3-T4 requires separate acceptance authorization.

## 3. Dependency-Ordered Task Breakdown

- [x] **M3-T1 — Closed adapter/kernel boundary + EvidenceRecord v2 contract** — accepted on `m3-core`, not merged into `main`; implementation commit `4fbe92d41940db3c7d1965a0124f6b8f9b98a40f`, CI hardening follow-up `46fb1e0cce39105e8b9a55f141204d181a15f955`, GitHub Actions run `35699026135`, `372/372` across 23 files with full gates green.
- [x] **M3-T2 — Narrow pnpm project eligibility + fixed dispatch + read-only public preflight** — accepted on `m3-core`, not merged into `main`; implementation commit `5b46501eccf146777e6d8b6277700667237df464`, lint-only correction `5bfd27c2a2ea57da8e98d9b2ad6447de4a431418`, GitHub Actions run `35702794992`, `405/405` across 24 files with zero skips and typecheck/lint/build/diff/cleanliness green. The initial test-green/lint-failed result remains recorded as such.
- [~] **M3-T3 — Bounded verification execution + cancellation + runtime EvidenceRecord v2 + input/plan binding** — implementation, remediation, authority/security audit, and local verification complete on `m3-core`; awaiting separate local commit authorization.
- [ ] **M3-T4 — Independent npm + pnpm acceptance / M3 closeout** — not started and not authorized.

## 4. T3 Contract and Invariants

- Fixed execution envelope: 120 seconds per started step, 300 seconds overall, and 5 seconds termination cleanup grace; deadlines use monotonic arithmetic and are not configurable through task, adapter, CLI, project, environment, or user input.
- Sureflow owns only the directly spawned npm/pnpm child. No descendant or process-tree termination guarantee, process groups, supervisor, or tree-kill dependency is introduced.
- Terminal causes are `passed`, `failed:1..255`, `spawn-error`, `terminated:<SIGNAL>`, `timed-out`, `interrupted:SIGINT`, and `interrupted:SIGTERM`. Independently observed child termination is distinct from Sureflow-owned interruption.
- `EvidenceRecord` schema version remains `2`; only started `repo.verify` records use v2. Historical v1 records remain readable, while malformed or unknown v2 records fail closed.
- One strict `repo.read` input-binding record covers exact `package.json`, selected lockfile, `tsconfig.json`, and resolved verification-plan digests. Same-run mixed v1/v2 `repo.verify` evidence is `UNKNOWN` and never manufactures `PASS`.
- Binding inputs are physically revalidated immediately before verification. Late symlink substitution escaping the project root halts before child spawn. Invalid exit observations fail closed and never create invalid `failed:N` evidence.
- No retries or repairs were added. T4 real independent npm/pnpm acceptance remains separately gated.

## 4A. Acceptance Criteria

- **AC-M3.1**: M3-T1 and M3-T2 remain accepted on `m3-core` only and are not represented as merged into `main`.
- **AC-M3.2**: M3-T3 bounded execution, cancellation, v2 evidence, strict input/plan binding, containment revalidation, and fail-closed behavior are covered by the recorded local evidence without claiming descendant isolation.
- **AC-M3.3**: T3 commit authorization, T3 remote acceptance, and M3-T4 remain separate human decisions; no T4 work begins from this reconciliation.

## 5. Execution Policy

- **Mode**: `Gated Mode`
- **TDD Enforcement Mode**: `disabled`
- **Batch Authorization**: `N/A - every M3 task is separately authorized`
- **Soft Checkpoint**: At each M3 task completion or around 60 minutes, whichever occurs first
- **Hard Checkpoint**: Before each M3 task transition, commit, push, scope expansion, or around 90 minutes without completion
- **Event-Driven Checkpoints**: Planning approval, implementation authorization, task completion, test failure, stop-condition trigger, commit, push, remote CI, scope expansion, handoff, compaction, or context drift
- **Stop Conditions**: Authority semantics change; arbitrary shell requirement; generalized registry/provider/MCP scope; multi-agent orchestration; failed invariant or gate; missing approval; T4 work before authorization; human stop
- **Host Timer Capability**: Live host timing and forced termination are unavailable; the bounded controller uses observed monotonic elapsed time and direct-child signals within its configured execution window.

## 6. State and Active Ownership

- **Execution State**: `awaiting_review`
- **Mapped `pk:tasks` Status**: `In Review`
- **Active Task Pointer**: `None`
- **Active Review Task**: `M3-T3`
- **Start Time**: `2026-09-22`
- **Current Actor**: Human authority / Codex under separately gated M3-T3 authorization
- **Next Action**: Obtain separate authorization for the 19-file M3-T3 local commit review; do not push or begin M3-T4.
- **Branch / Revision**: `m3-core @ 5bfd27c2a2ea57da8e98d9b2ad6447de4a431418`; `origin/main` remains `675f433e77fe9bdcc91edd05aa5e64f049fad46e`
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
- **Scope Change Records**: `None`
- **Checkpoint Records**: `None`
- **Handoff Records**: `None`
- **Verification Evidence**: Focused T3 set `131/131`; full permitted-host suite `453/453` across 25 files; Linux symlink tests executed with zero skips; root typecheck, lint, build, and diff check passed; fixture pre-change application test intentionally remained `0/1`, with fixture typecheck/lint/build passing; PromptKit references and scope/secret/debug/credential/runtime-artifact guards passed.
- **CI Evidence**: T1 run `35699026135` passed with `372/372` across 23 files. T2 run `35702794992` passed with `405/405` across 24 files and zero skips. T3 has no remote acceptance yet.
- **Review Evidence**: Read-only authority/security audit passed. Official PromptKit harness remains exit `2` with only `PREFLIGHT|INCOMPLETE|GIT_LAYOUT|.` because this is a linked worktree; supplemental Git-resolved worktree metadata checks passed.
- **Commit Evidence**: Not yet authorized; separate local commit authorization remains required.
- **Pull Request Evidence**: PR #1 remains open and unmerged; no PR mutation was performed.
- **Release Evidence**: `N/A — release and deployment are outside M3 CORE-ONLY scope`
- **Blocker and Resume Condition**: T3 local implementation and verification are complete; resume with separate human authorization for the exact 19-file local commit review. T4 remains not authorized.
- **Completion State**: `not completed`
- **Acceptance Results**: M3-T1 and M3-T2 are accepted on `m3-core` only. M3-T3 local evidence is complete and ready for commit review, not remotely accepted. M3-T4 is not started.
- **Changed-File Summary**: The eventual T3 commit scope is exactly the 17 reviewed implementation/test/config files plus this Task Record and `docs/STATE.md`; no package, dependency, CI, M2 historical, Laya, or Kilo files are included.
- **Completion Exception**: `N/A — M3 is not complete`
- **Completion Decision and Timestamp**: `Pending separate T3 commit and remote acceptance decisions`

## 7. Transition History

| Previous State | New State | Timestamp | Actor | Reason | Supporting Evidence |
| :--- | :--- | :--- | :--- | :--- | :--- |
| N/A | planned | 2026-09-22 | Human authority / Codex | M3 CORE-ONLY authority record created before T3 commit review | This Task Record |
| planned | ready | 2026-09-22 | Human authority | M3-T1 through M3-T3 direction and separate T3 authorization boundary established | This Task Record |
| ready | in_progress | 2026-09-22 | Codex | M3-T3 implementation and remediation started under explicit authorization | T3 implementation scope |
| in_progress | awaiting_review | 2026-09-23 | Codex | T3 implementation, remediation, authority audit, and local verification complete; local commit remains separately gated | Focused and full local evidence above |
