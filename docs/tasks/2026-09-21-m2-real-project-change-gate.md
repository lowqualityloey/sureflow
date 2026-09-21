# Task Record: M2 real project change gate

<a id="TASK-2026-09-21-m2-real-project-change-gate"></a>

## 1. Identity and Authority

- **Record Type**: `Task Record`
- **Task ID**: `TASK-2026-09-21-m2-real-project-change-gate`
- **PromptKit Adaptation Profile**: `none`
- **Work Type**: `Planning / Configuration Work`
- **Planning Record Link**: [PLAN-m2-real-project-change-gate](../specs/2026-09-21-m2-real-project-change-gate.md#PLAN-m2-real-project-change-gate)
- **Planning Depth Reference**: `Full`
- **Assumption Record Links**: `None`
- **Specification**: [M2 — Real Project Change Gate](../specs/2026-09-21-m2-real-project-change-gate.md)
- **External Reference**: `N/A - local tracking remains authoritative`
- **Owner / Actor**: Human authority owns approval; Codex may implement only separately authorized M2 tasks
- **Execution Scope**: Sureflow M2 in this repository; one independent Node/TypeScript fixture target; one local worker/project/task
- **Approval Boundary**: Only the three planning files and this atomic planning-baseline commit are authorized in this turn. Each implementation task, scope change, push, pull request, remote action, release, deployment, or rollback requires separate explicit human authorization.
- **Created**: 2026-09-21 10:38 UTC

## 2. Objective and Boundaries

- **Objective**: Prove Sureflow can safely control and deterministically verify one useful bounded code change in an independent realistic Node/TypeScript project beyond the fixed T0 gate.
- **In Scope**:
  - `docs/specs/2026-09-21-m2-real-project-change-gate.md` planning specification;
  - `docs/tasks/2026-09-21-m2-real-project-change-gate.md` canonical Task Record;
  - `docs/STATE.md` living planning projection;
  - human/control-plane-owned `.sureflow/task.json`, immutable run snapshot, and contract digest/provenance;
  - one Node/TypeScript+npm project adapter selected from repository evidence;
  - one existing tracked UTF-8 file replacement whose exact bytes come from the validated task snapshot, with exact path, containment, policy, and preimage checks;
  - fixed `typecheck`, `test`, `lint`, and `build` profile resolution/dispatch;
  - read-only Git-visible tracked/non-ignored-untracked baseline and scope inspection;
  - append-only change/check/scope evidence and deterministic aggregate verification;
  - one generalized run/verify orchestration pipeline with T0 compatibility preserved;
  - independent fixture acceptance and the full negative-test matrix.
- **Explicit Non-Goals**:
  - all items listed in the specification's Non-Goals and Deferred Post-M2 sections;
  - any implementation during this planning turn;
  - commits, pushes, pull requests, releases, or other remote side effects.
- **Dependencies**: Accepted clean baseline `0a1c503fb8a0bc5399b5a28c1cbb2418ab6c8108`; accepted M1/M1.1 contracts; Node 24/npm/Git available locally; approved M2 planning baseline; separate authorization for M2-T1.
- **Risk**: `High` — M2 expands from fixed verification to real source mutation. Mitigation: exact-path/preimage gates, default-deny policy, one closed adapter, clean Git baseline, post-run scope inspection, deterministic evidence, one-task authorization, and hard stop conditions.
- **Verification Condition**: M2 is complete only when AC-M2.1–AC-M2.9 pass, N1–N16 pass, the independent temporary-repository acceptance reaches PASS/accepted, and the complete Sureflow typecheck/test/lint/build/hygiene gates pass without weakening existing tests.

## 3. Dependency-Ordered Task Breakdown

- [ ] **M2-T1 — Contract and acceptance fixture** (`#priority/p1`, `area:backend`, `type:feature`, 3–4 h)
  - Add control-plane authority rules, strict contract types/parser/loader, immutable snapshot/digest, and independent fixture skeleton.
  - Verify exact-field rejection, closed enums, task ID, paths, digest syntax, `.sureflow/**` worker-write refusal, mid-run hash mismatch, and no command/provider/remote fields.
- [ ] **M2-T2 — Project detection** (`#priority/p1`, `area:backend`, `type:feature`, 3–4 h; depends on T1)
  - Detect clean Git + Node/TypeScript/npm support from repository evidence with explicit unsupported outcomes.
- [ ] **M2-T3 — Verification profile resolution and dispatch** (`#priority/p1`, `area:backend`, `type:feature`, 4–5 h; depends on T2)
  - Map snapshot-owned required checks to fixed npm argv in canonical order; reject worker-selected, missing, or unsupported checks; accept no caller executable/argv/shell; document npm-script host trust.
- [ ] **M2-T4 — Bounded replacement** (`#priority/p0`, `area:backend`, `type:feature`, 3–4 h; depends on T1–T2)
  - Apply only snapshot-owned bytes after proving tracked existing-file scope, preimage SHA-256, path/symlink containment, and policy; return before/after digests.
- [ ] **M2-T5 — Scope compliance inspection** (`#priority/p0`, `area:backend`, `type:feature`, 3–4 h; depends on T2/T4)
  - Require no pre-existing tracked or non-ignored untracked project changes outside `.sureflow/**`; classify every unexpected Git-visible path as a terminal violation without claiming ignored-file/outside-repository detection.
- [ ] **M2-T6 — Aggregate evidence verifier** (`#priority/p0`, `area:backend`, `type:feature`, 4–5 h; depends on T1/T3–T5)
  - Reuse append-only evidence and base verifier; require current contract, exact changed paths, compliant scope, and all required checks.
- [ ] **M2-T7 — Single orchestration integration** (`#priority/p0`, `area:backend`, `type:refactor`, 5–7 h; depends on T1–T6)
  - Generalize the one run/verify pipeline; preserve policy, lock, state, event, evidence, CLI, and T0 compatibility invariants.
- [ ] **M2-T8 — End-to-end and negative acceptance** (`#priority/p1`, `area:backend`, `type:test`, 4–6 h; depends on T7)
  - Execute the independent temp-repository flow, N1–N16, full regressions, hygiene/review, and acceptance evidence.

No task may start merely because its predecessor is checked. Each task needs separate human authorization and an event-driven checkpoint before the next task.

## 4. Acceptance Criteria

- [ ] **AC-M2.1 — Project detection**: Repository evidence deterministically resolves the one supported adapter; unsupported or ambiguous projects halt before writes.
  - **Result**: Pending
  - **Evidence**: Focused detector tests and independent fixture acceptance
- [ ] **AC-M2.2 — Contract and authority**: Human/control-plane task bytes become one hashed immutable snapshot; workers cannot write `.sureflow/**`, expand path authority, change content/preimage, or weaken verification; a mid-run disk change halts without changing the active plan.
  - **Result**: Pending
  - **Evidence**: Contract/policy test matrix
- [ ] **AC-M2.3 — Bounded useful write**: Exactly one authorized tracked source file with a matching preimage is atomically replaced; every containment or stale violation is refused, and every unauthorized Git-visible changed path halts.
  - **Result**: Pending
  - **Evidence**: Writer/scope tests and end-to-end changed-path assertion
- [ ] **AC-M2.4 — Closed verification**: Snapshot-owned required profile IDs resolve only to fixed npm argv in canonical order; workers cannot select or weaken them; missing scripts halt; npm script bodies retain host filesystem/network access and are not sandboxed by `shell: false`.
  - **Result**: Pending
  - **Evidence**: Adapter dispatch tests
- [ ] **AC-M2.5 — Change evidence**: Evidence records current contract digest, before/after file digests, actual changed paths, scope result, and every required verification result.
  - **Result**: Pending
  - **Evidence**: Persisted JSONL assertions with redaction checks
- [ ] **AC-M2.6 — Deterministic verdict**: Only complete/current/unambiguous passing evidence yields PASS; missing/corrupt/duplicate/stale evidence yields UNKNOWN and explicit failures yield FAIL.
  - **Result**: Pending
  - **Evidence**: Aggregate verifier matrix and stale-accepted reconciliation tests
- [ ] **AC-M2.7 — Negative paths**: Specification cases N1–N16 pass exactly.
  - **Result**: Pending
  - **Evidence**: Named automated tests mapped to every negative ID
- [ ] **AC-M2.8 — Independent acceptance**: The public CLI changes a disposable copy of `fixtures/m2-node-ts-project/`, never Sureflow's own source tree, and reaches accepted/PASS after real checks.
  - **Result**: Pending
  - **Evidence**: End-to-end acceptance command, state, evidence, Git scope, and CLI assertions
- [ ] **AC-M2.9 — Regression and scope**: Existing M1/M1.1 behavior remains green and no deferred post-M2 subsystem appears.
  - **Result**: Pending
  - **Evidence**: Full suite, typecheck, lint, build, diff, reference, harness, hygiene, changed-file, and architecture review gates

## 5. Execution Policy

- **Mode**: `Gated Mode`
- **TDD Enforcement Mode**: `disabled`
- **Batch Authorization**: `N/A - every M2 task is separately authorized`
- **Soft Checkpoint**: At each M2-T task completion or around 60 minutes, whichever occurs first
- **Hard Checkpoint**: Before crossing from one M2-T task to the next, on scope expansion, or around 90 minutes without completion
- **Event-Driven Checkpoints**: Planning approval, implementation authorization, task completion, test failure, stop-condition trigger, commit, push, remote CI, scope expansion, handoff, compaction, or context drift
- **Stop Conditions**: Authority semantics change; arbitrary shell requirement; second orchestration framework; broad stack leakage into core; multi-agent/provider/MCP scope; non-objective acceptance; failed invariant/gate; missing approval; human stop
- **Host Timer Capability**: Live host timing and forced termination are unavailable; use observed elapsed time plus turn/task boundaries only.

## 6. State and Active Ownership

- **Execution State**: `planned`
- **Mapped `pk:tasks` Status**: `To Do`
- **Active Task Pointer**: `None`
- **Start Time**: `N/A - implementation not started`
- **Current Actor**: Codex under explicit planning-baseline commit authorization; M2-T1 has not started
- **Next Action**: Complete only the authorized three-file planning commit, then STOP. Await separate explicit authorization for M2-T1.

### Transition History

| Previous State | New State | Timestamp | Actor | Reason | Supporting Evidence |
| :--- | :--- | :--- | :--- | :--- | :--- |
| N/A | planned | 2026-09-21 10:38 UTC | Codex under planning authorization | Fresh M2 planning boundary requested; implementation explicitly prohibited | [M2 specification](../specs/2026-09-21-m2-real-project-change-gate.md) |

## 7. Evidence and Completion Gate

- **Changed Files**:
  - `docs/specs/2026-09-21-m2-real-project-change-gate.md` — M2 architecture/specification
  - `docs/tasks/2026-09-21-m2-real-project-change-gate.md` — canonical planned Task Record
  - `docs/STATE.md` — living projection of the planning boundary
- **Scope Change Records**: `None`
- **Checkpoint Records**: `None`
- **Handoff Records**: `None`
- **Verification Evidence**: Planning-only checks for this turn: `git diff --check`; PromptKit reference validation; fixed-scope harness/security preflight; and scope, secret, debug, credential-file, and runtime-artifact guards. The repository-wide execution-control validator remains non-green because of pre-M2 legacy Task Records; no diagnostics apply to this M2 specification, this M2 Task Record, or the current `docs/STATE.md` projection. The raw diagnostic count is not a milestone-quality metric and no legacy repairs were attempted.
- **Behavior IDs**: `N/A - TDD Enforcement Mode disabled`
- **TDD Intent Register**: `N/A - TDD Enforcement Mode disabled`
- **TDD Execution Evidence**: `N/A - TDD Enforcement Mode disabled`
- **TDD Exception Verification**: `N/A - planning work; no implementation`
- **CI Evidence**: `N/A - planning only; no commit or remote action authorized`
- **Review Evidence**: `Human approved the M2 planning baseline and requested the recorded contract clarifications; implementation remains unauthorized`
- **Commit Evidence**: `This authorized planning-baseline commit contains exactly the three planning files; its exact SHA is reported by the commit result. No push is authorized.`
- **Pull Request Evidence**: `N/A before PR; remote action is not authorized`
- **Release Evidence**: `N/A - M2 planning is not a release`
- **Blocker and Resume Condition**: M2 implementation is intentionally gated. Resume only after separate explicit authorization for M2-T1.
- **Completion State**: `Planning baseline complete after the authorized commit; implementation not started`
- **Acceptance Results**: `AC-M2.1–AC-M2.9 pending`
- **Changed-File Summary**: Planning artifacts only; no source, test, fixture, package, runtime, CI, dependency, or remote state changed.
- **Completion Exception**: `None`
- **Completion Decision and Timestamp**: `Planning baseline accepted for M2 task preparation on 2026-09-21; M2-T1 remains separately gated`
