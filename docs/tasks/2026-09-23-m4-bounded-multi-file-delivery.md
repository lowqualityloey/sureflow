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
- **Execution Scope**: M4-T3 implementation in exactly six runtime/test/config paths: `src/completeTargetSet.ts`, `src/boundedReplacement.ts`, `src/singleFileReplacement.ts`, `src/m4WriteCoordinator.ts`, `tests/m4T3WriteCoordinator.test.ts`, and `tsconfig.json`; the previously authorized control-state paths remain this Task Record and `docs/STATE.md`.
- **Approval Boundary**: The M4 planning baseline was initially documentation-only. T1 and T2 were subsequently authorized, completed, accepted, and committed. T3 implementation was explicitly authorized only in the exact six runtime/test/config paths listed above, alongside the already-authorized control-state documents. T3 is now implementation-complete and accepted; its local closeout commit is explicitly authorized subject to the canonical T3 commit gate. T4–T6 and push remain unauthorized.
- **Created**: `2026-09-23`
- **Objective**: Implement deterministic bounded multi-file mutation for an already-eligible schema-v2 complete target set, preserving T1/T2 authority and read-only preflight invariants; report truthful partial-write refusal without rollback, retry, or transaction claims.
- **Initial Planning In Scope (2026-09-23)**:
  - `ROADMAP.md`
  - `docs/STATE.md`
  - `docs/specs/2026-09-23-m4-bounded-multi-file-delivery.md`
  - `docs/tasks/2026-09-23-m4-bounded-multi-file-delivery.md`
- **In Scope**:
  - `src/cli.ts`
  - `src/preflight.ts`
  - `src/projectDetection.ts`
  - `src/taskContract.ts`
  - `src/completeTargetSet.ts`
  - `tests/m4CompleteTargetSet.test.ts`
  - `tests/m4T2Preflight.test.ts`
  - `tsconfig.json`
  - `docs/tasks/2026-09-23-m4-bounded-multi-file-delivery.md`
  - `docs/STATE.md`
- **Explicit Non-Goals**:
  - Runtime, test, fixture, package, dependency, CI, release, or remote mutation in this planning turn
  - Automatic rollback, generalized project mutation, autonomy, providers/MCP/skills, deployment, or PromptKit migration in M4
- **Dependencies**: Accepted M1–M3, closed npm/pnpm adapters, existing lock/containment/replacement/scope/evidence boundaries; no new dependency
- **Risk**: High — partial writes and false-positive acceptance require complete-set preflight and aggregate proof
- **Verification Condition**: Exact six-path T3 runtime/test/config scope plus the two authorized control-state files; focused T3 and M2/M4 regression tests, full `npm test`, typecheck, lint, build, diff check, PromptKit/reference validation, M4 execution-control and fixed-scope harness checks, secret/probe/artifact scans, and final exact-scope inspection pass. No T4+ behavior; commit only if the canonical T3 commit gate is satisfied.
- **Mode**: `Gated Mode`
- **Batch Authorization**: None; T1 and T2 were separately authorized and accepted. T3 is separately authorized only for its exact six runtime/test/config paths and the two previously authorized control-state documents; no T4+ or push authorization.
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
- **Start Time**: `2026-09-24; T3 control-state transition (time not recorded)`
- **Current Actor**: Human authority / Codex — authorized M4-T3 closeout in exactly the six runtime/test/config paths and two control-state documents; no T4+ or push authority.
- **Next Action**: Complete the canonical T3 closeout gates, commit exactly the eight authorized files if they pass, then stop. Do not begin T4+ or push.
- **Initial Planning Changed Files**:
  - `ROADMAP.md`
  - `docs/STATE.md`
  - `docs/specs/2026-09-23-m4-bounded-multi-file-delivery.md`
  - `docs/tasks/2026-09-23-m4-bounded-multi-file-delivery.md`
- **Changed Files**:
  - `src/cli.ts`
  - `src/preflight.ts`
  - `src/projectDetection.ts`
  - `src/taskContract.ts`
  - `src/completeTargetSet.ts`
  - `tests/m4CompleteTargetSet.test.ts`
  - `tests/m4T2Preflight.test.ts`
  - `tsconfig.json`
  - `docs/tasks/2026-09-23-m4-bounded-multi-file-delivery.md`
  - `docs/STATE.md`
- **Historical Corrective Documentation Scope**: The prior hardening correction touched the linked M4 specification and this Task Record; the post-merge factual reconciliation touched only `docs/STATE.md` and this Task Record. The original four-file baseline scope above is historical.
- **Scope Change Records**: [SCOPE-2026-09-24-m4-t2-closeout-1](#SCOPE-2026-09-24-m4-t2-closeout-1), [SCOPE-2026-09-24-m4-t2-closeout-2](#SCOPE-2026-09-24-m4-t2-closeout-2), [SCOPE-2026-09-24-m4-t3-transition](#SCOPE-2026-09-24-m4-t3-transition), [SCOPE-2026-09-24-m4-t3-implementation](#SCOPE-2026-09-24-m4-t3-implementation)
- **Checkpoint Records**: `None`
- **Handoff Records**: `None`
- **Verification Evidence**: M4-T2 focused tests passed `15/15`; full `npm test` passed `513/513` across 29 files. `npm run typecheck`, `npm run lint`, `npm run build`, and `git diff --check` passed. The execution-control validator resolved all five M4-specific findings and retained 98 unrelated historical findings across six records; its 23-contract fixture harness and PromptKit reference validation passed. Harness, scope, secret/credential, debug/probe, and unwanted-artifact checks passed. Runtime: Node `24.20.0`, npm `11.19.0`. The default sandbox returned `spawnSync git EPERM` for disposable fixtures; focused/full tests passed unchanged under approved host execution. Preflight remains read-only. Repository-root `.sureflow/` was pre-existing ignored state, untouched by T2; `.sureflow/task.json` is absent, and acceptance uses isolated temporary roots. `package.json` and `package-lock.json` are unchanged. The M4-T3 control-state transition checks on `2026-09-24` passed: execution-control validation emitted no M4-specific findings (98 unrelated historical findings across six records remain), PromptKit reference validation passed, `git diff --check` passed, the Bash execution-control fixture harness passed 23 isolated contracts, and the fixed-scope harness-security scan reported no findings.
- **CI Evidence**: Planning-only PR #4 CI run `35815585170` succeeded. Post-merge main CI run `35816292161`, job `107038411878`, tested canonical merge SHA `4ae37149c0d0516499088f0ffd746d13e6bb1fde` and succeeded: Node 24, pnpm `9.15.4`, npm ci, typecheck, `460/460` tests across 26 files including focused M3-T4 `7/7`, lint, build, `git diff --check`, and tracked-tree cleanliness passed. Deprecated ESLint, two moderate npm audit findings, and the esbuild install-script approval warning were non-blocking. This is planning/integration regression CI, not M4 runtime acceptance.
- **Review Evidence**: The initial planning review and corrective re-review are recorded below and remain historical. The T2 implementation report was subsequently reviewed and accepted by the user. The T3 read-only scope-discovery report was accepted before implementation; the completed T3 implementation and verification report has now been reviewed and accepted by the user. No independent code review is claimed.
- **Commit Evidence**: Planning commits `05904b3949297b54779c04720e2b5f8020b3b9a1` and `3cd51bcbd2e5adee67491bc794af7b58df35f997` were integrated through PR #4 at `4ae37149c0d0516499088f0ffd746d13e6bb1fde`. M4-T1 was accepted at `f7b1fd2306ede49ebe8b2012db0b94a509f14e05`. M4-T2 was accepted and committed at `79f149996523b9104c3071a2c151cd289e805e07` (`feat(m4): add complete-set preflight`). M4-T3 closeout commit is explicitly authorized by the 2026-09-24 acceptance, conditional on the canonical gates; Git supplies its SHA, which is not embedded in this self-referential record. Nothing has been pushed.
- **Pull Request Evidence**: [PR #4 — docs(m4): plan bounded multi-file delivery](https://github.com/lowqualityloey/sureflow/pull/4) merged by normal merge commit at `2026-09-23 03:56:03 UTC`; head `3cd51bcbd2e5adee67491bc794af7b58df35f997`, merge commit `4ae37149c0d0516499088f0ffd746d13e6bb1fde`. It contained planning documents only.
- **Release Evidence**: None — no release authorized
- **Blocker and Resume Condition**: No T3 implementation-path blocker remains; implementation and runtime verification are complete and accepted within the six exact paths. The local T3 closeout commit is authorized only after the specified gates pass. Stop after that commit; T4–T6 remain not started / not authorized.
- **Completion State**: M4 is not complete; T1 and T2 are accepted and committed, M4-T3 implementation and local verification are accepted and its authorized local closeout commit closes this task boundary, and T4–T6 remain not started / not authorized.
- **Acceptance Results**: The initial planning baseline was accepted and integrated. M4-T1 was completed, verified, accepted, and committed at the recorded SHA. M4-T2 passed the evidence in Verification Evidence and was accepted and committed at `79f149996523b9104c3071a2c151cd289e805e07`. M4-T3 implementation and verification were accepted on `2026-09-24`; its local closeout commit is authorized subject to the recorded gates. M4 as a whole is not complete.
- **Changed-File Summary**: The completed T2 closeout contained exactly the ten files under Changed Files. The active T3 scope is exactly the six runtime/test/config paths in Execution Scope plus this Task Record and `docs/STATE.md`; no other file is authorized.
- **Completion Exception**: None; this is a completed T2 subtask, not M4 completion.
- **Completion Decision and Timestamp**: M4 remains incomplete; T2 was accepted and committed, and M4-T3 implementation/verification was accepted on `2026-09-24`; this authorized local closeout commit closes T3 only.
- **Branch / Revision**: `codex/m4-t3`, from accepted T2 boundary `79f149996523b9104c3071a2c151cd289e805e07`; the T3 closeout revision is reported by Git and not embedded in this commit. Nothing has been pushed.
- **Planning baseline**: PR #4 normal merge commit `4ae37149c0d0516499088f0ffd746d13e6bb1fde` is a stable historical anchor, not a claim about the live `main` HEAD

**At the initial planning baseline, no M4 implementation task was authorized.**

### 1.1 Subsequent execution reconciliation (2026-09-24)

M4 was initially created in the documentation-only planning state recorded above. Implementation was later authorized task by task:

- **M4-T1:** Completed, verified, accepted, and committed at `f7b1fd2306ede49ebe8b2012db0b94a509f14e05` on `2026-09-23` (`feat(m4): add v2 task contract support`).
- **M4-T2:** Subsequently explicitly authorized, completed, accepted, and committed at `79f149996523b9104c3071a2c151cd289e805e07`. No push is authorized.
- **M4 status:** Not complete. M4-T3 implementation is explicitly authorized in the exact six runtime/test/config paths recorded below, implemented, locally verified, and accepted; its local closeout commit is authorized subject to the gates. M4-T4 through M4-T6 remain not started and unauthorized.

### M4-T3 authorization and control-state transition (2026-09-24)

M4-T3 was explicitly authorized after M4-T2 was accepted and committed at `79f149996523b9104c3071a2c151cd289e805e07`. The active transition is limited to this Task Record and `docs/STATE.md`. Its objective is deterministic bounded multi-file mutation for an already-eligible schema-v2 complete target set, preserving T1/T2 authority and read-only complete-set preflight. The canonical T3 plan describes behavior but does not identify exact implementation paths; runtime implementation remains unstarted pending separate exact-path authorization. T4–T6 remain not started / not authorized, M4 remains incomplete, and nothing has been pushed.

### M4-T3 implementation authorization (2026-09-24)

After the control-state transition, human authority explicitly authorized M4-T3 implementation in exactly these six runtime/test/config paths: `src/completeTargetSet.ts`, `src/boundedReplacement.ts`, new `src/singleFileReplacement.ts`, new `src/m4WriteCoordinator.ts`, new `tests/m4T3WriteCoordinator.test.ts`, and `tsconfig.json`. The Task Record and `docs/STATE.md` remain authorized only for M4-T3 scope/state/evidence reconciliation. Preserve M2 behavior; revalidate each target against its frozen T2 observation; execute in canonical normalized-path order; stop on first refusal or write failure; report completed prefix, failed target, and unattempted suffix; do not rollback, retry, persist state/evidence, invoke project verification, or claim multi-file atomicity. T4+ and push remain unauthorized. No additional path may be edited without explicit scope expansion.

**M4-T3 implementation and local verification (2026-09-24; pending human review/acceptance):** The focused coordinator suite passed `16/16`, including 2- and 5-target success, bytewise UTF-8 ordering, stale first/later target refusals, identity/canonical/trackedness refusal, thrown trackedness-probe fail-closed behavior, later rename failure with owned-temp cleanup and no rollback/suffix write, mode preservation, callback ordering/failure, and no project verification. Existing `tests/boundedReplacement.test.ts` passed `30/30`. Full `npm test` passed `529/529` across 30 files, covering M4-T1/T2 and relevant M2/M3 regressions. `npm run typecheck`, `npm run lint`, and `npm run build` passed with Node `24.20.0` / npm `11.19.0`. Disposable Git fixture tests returned `spawnSync git EPERM` before assertions in the default sandbox, then passed unchanged through the previously approved host execution path. An initial parallel broad regression run timed out two existing M2 CLI fixture tests under fixture contention; the isolated full-suite rerun passed both. Final closeout checks passed `git diff --check`, PromptKit reference validation over 240 Markdown files, the 23-contract execution-control fixture harness, and fixed-scope harness-security scan; the execution-control validator reported 98 unrelated historical findings across six records and no finding for this M4 record/projection. Targeted credential-pattern and debug/probe scans found no matches. Exact-scope inspection found only the six authorized runtime/test/config paths plus the Task Record and `docs/STATE.md`; package manifests were unchanged. Repository-root `.sureflow/` was pre-existing ignored state, not created or modified by T3; `.sureflow/task.json` is absent, disposable project tests use system temporary roots, and `.omo/` is absent. `dist/` is the ignored build output. No T4+ behavior was implemented; no package/dependency/fixture changes were made; no commit or push occurred.

**M4-T3 acceptance and closeout authorization (2026-09-24):** Human authority reviewed and accepted the T3 implementation and verification report as implementation-complete, authorized the local closeout commit of exactly the six runtime/test/config paths plus the two control-state files after the specified gates pass, and directed that work stop afterward. M4 remains incomplete; T4–T6 and push remain unauthorized.
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

Each unchecked item remains **planned only**, independently reviewable, and
requires its own human start authorization and bounded file scope. T1 and T2
are marked complete below; this does not authorize T3 or later work.

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
  accepted; the authorized local closeout commit completes T3 only.
- [ ] **M4-T4 — Set-based scope and aggregate write-evidence verification.**
  Exact Git-visible set equality; strict one-tuple-per-target successful
  evidence, empty-or-longer success prefix plus one first refusal and zero
  suffix observations, duplicate/contradictory/unexpected/missing/corrupt
  handling, pre-write and terminal contract binding, canonical resolved-plan
  digest, and diagnostic-only partial scope. Keep v1/v2 historical readers
  and existing single-target verifier and binding meanings unchanged.
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

**Task transition rule:** Each T task requires separate approval. T1 and T2
are accepted and committed; T3 implementation is explicitly authorized in the
exact six runtime/test/config paths recorded in §1 plus the two control-state
documents for T3 reconciliation. T3 implementation and runtime verification
are complete and accepted; this local T3 closeout commit is explicitly
authorized subject to the canonical gates. T4–T6 remain unauthorized. A
completed task does not automatically authorize the next task. Push, PR,
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

- **Current actor**: Human authority / Codex, authorized M4-T3 closeout in the six exact paths listed in §1 plus this Task Record and `docs/STATE.md`; no T4+ or push authority.
- **Current task**: M4-T3 implementation and runtime verification accepted; the explicitly authorized local closeout commit is gated on final checks. T4–T6 remain unauthorized.
- **Current revision**: Accepted M4-T2 commit `79f149996523b9104c3071a2c151cd289e805e07` on `codex/m4-t3`; nothing has been pushed.
- **Current implementation evidence**: T1 and T2 status and T2 verification
  evidence are recorded in §1.1 and the implementation chain above. T3 is
  implemented, runtime-verified, and accepted in the exact paths recorded in
  §1. T4–T6 remain unstarted and unauthorized.
- **Checkpoint**: Before each T task start, completion, commit, push,
  acceptance, scope change, or human handoff; no automatic transition.
- **Stop conditions**: Any request to broaden 2–5 existing tracked files,
  authorize dynamic targets, add arbitrary commands/dependencies, weaken
  default-deny or evidence requirements, claim transaction/rollback/sandbox
  guarantees, change historical v1/v2 semantics, or cross an unapproved task
  boundary. Stop and seek explicit human authority.
- **Next action**: Pass the canonical T3 closeout gates, commit exactly the
  authorized eight files, then stop. T4+ and push are unauthorized.

## 6. Transition history

| Previous State | New State | Date | Actor | Reason |
| :--- | :--- | :--- | :--- | :--- |
| N/A | planned | 2026-09-23 | Human authority / Codex | M4-A selected for documentation-only planning; T1–T6 remain gated |
| planned | ready | Not recorded | Human authority | M4-T1 received separate explicit authorization after the planning baseline |
| ready | in_progress | Not recorded | Human authority / Codex | T1 implementation started; the M4 Task Record remains in progress across separately gated T tasks |

**Planning-only event (2026-09-23; no state change):** Five review blockers were corrected in the specification and Task Record; execution remained `planned`.

**M4-T3 authorization event (2026-09-24; execution state unchanged):** After M4-T2 was accepted and committed at `79f149996523b9104c3071a2c151cd289e805e07`, human authority authorized the M4-T3 control-state transition in the exact two-document scope recorded above. The canonical plan does not identify T3 implementation paths; code implementation remains unstarted pending separate exact-path authorization.

**Later task events while M4 remained `in_progress`:** T1 was completed, verified, accepted, and committed on 2026-09-23. T2 was subsequently authorized, completed, accepted, and committed at `79f149996523b9104c3071a2c151cd289e805e07` on 2026-09-24. T3 was first authorized for the two-file control-state transition, then separately authorized for exactly the six runtime/test/config paths recorded above; implementation and local verification completed and were accepted on 2026-09-24. This local closeout commit closes T3 only; T4–T6 and push remain unauthorized.
