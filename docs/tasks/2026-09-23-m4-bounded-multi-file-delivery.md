# M4 — Bounded Multi-File Delivery — Local Task Record

<a id="TASK-2026-09-23-m4-bounded-multi-file-delivery"></a>

## 1. Authority and planning status

- **Task ID**: `TASK-2026-09-23-m4-bounded-multi-file-delivery`
- **Record Type**: `Task Record`
- **PromptKit Adaptation Profile**: `none`
- **Milestone**: M4 — Bounded Multi-File Delivery
- **Specification**: `docs/specs/2026-09-23-m4-bounded-multi-file-delivery.md`
- **Owner / Actor**: Human authority / Codex
- **Execution Scope**: Documentation-only M4 planning baseline; no implementation
- **Approval Boundary**: M4 direction and these four planning documents only; T1–T6 implementation, commits, pushes, and acceptance are separately gated
- **Created**: `2026-09-23`
- **Objective**: Specify a safe 2–5 existing-tracked-file replacement gate for one supported standalone npm/pnpm project without authorizing its implementation
- **In Scope**:
  - `ROADMAP.md`
  - `docs/STATE.md`
  - `docs/specs/2026-09-23-m4-bounded-multi-file-delivery.md`
  - `docs/tasks/2026-09-23-m4-bounded-multi-file-delivery.md`
- **Explicit Non-Goals**:
  - Runtime, test, fixture, package, dependency, CI, release, or remote mutation in this planning turn
  - Automatic rollback, generalized project mutation, autonomy, providers/MCP/skills, deployment, or PromptKit migration in M4
- **Dependencies**: Accepted M1–M3, closed npm/pnpm adapters, existing lock/containment/replacement/scope/evidence boundaries; no new dependency
- **Risk**: High — partial writes and false-positive acceptance require complete-set preflight and aggregate proof
- **Verification Condition**: Four-file documentation scope, reference/link validation, `git diff --check`, and hygiene checks; no implementation gate claimed
- **Mode**: `Gated Mode`
- **Batch Authorization**: `None — T1–T6 require separate approval`
- **Soft Checkpoint**: At each separately authorized T task completion or human review
- **Hard Checkpoint**: Before each task transition, commit, push, scope expansion, or acceptance decision
- **Event-Driven Checkpoints**: Planning approval, implementation authorization, test failure, review, commit, push, remote CI, scope change, handoff
- **Stop Conditions**: Unapproved code or file scope; authority expansion; weakened evidence/containment; historical schema reinterpretation; transaction/sandbox overclaim; human stop
- **Host Timer Capability**: Live host timing and forced termination are unavailable for this documentation-only planning task; existing runtime verification limits are unchanged
- **Execution State**: `planned`
- **Mapped `pk:tasks` Status**: `To Do`
- **Active Task Pointer**: `None`
- **TDD Enforcement Mode**: `disabled`
- **Start Time**: `N/A — implementation not started`
- **Current Actor**: Human authority / Codex — M4 documentation planning only; no implementation task active.
- **Next Action**: M4-T1 requires separate human authorization; no implementation task is active
- **Changed Files**:
  - `ROADMAP.md`
  - `docs/STATE.md`
  - `docs/specs/2026-09-23-m4-bounded-multi-file-delivery.md`
  - `docs/tasks/2026-09-23-m4-bounded-multi-file-delivery.md`
- **Scope Change Records**: `None`
- **Checkpoint Records**: `None`
- **Handoff Records**: `None`
- **Verification Evidence**: PromptKit references, relative Markdown links, whitespace, exact four-file scope, and document secret/debug/credential/artifact scans passed. Execution-control validation found zero M4-record findings and remains non-green with 98 historical findings; linked-worktree harness reports `GIT_LAYOUT` incomplete. No runtime verification claimed.
- **CI Evidence**: N/A — no M4 CI run or implementation exists
- **Review Evidence**: Human authority approved one local M4 planning-baseline commit; M4 implementation remains gated.
- **Commit Evidence**: One local planning-baseline commit is authorized on `codex/m4-planning`; its resulting revision is the branch HEAD reported at closeout. No push is authorized.
- **Pull Request Evidence**: None — no PR authorized by this turn
- **Release Evidence**: None — no release authorized
- **Blocker and Resume Condition**: M4 implementation is gated; resume only after separate human T-task authorization
- **Completion State**: `planned`
- **Acceptance Results**: Planning documentation checks passed and the planning baseline is authorized for local commit; no M4 runtime behavior accepted.
- **Changed-File Summary**: Four authorized planning Markdown files only; no code or protected checkout changes
- **Completion Exception**: N/A — implementation has not started
- **Completion Decision and Timestamp**: N/A — no M4 implementation completion decision
- **Branch / Revision**: `codex/m4-planning` from `1106f75c550be467083f7d8408a21de6e389dba9`
- **Planning baseline**: `origin/main` at `1106f75c550be467083f7d8408a21de6e389dba9`

**No M4 implementation task is authorized.**

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
- Canonical bytewise UTF-8 path order controls writes. Revalidate each target
  immediately before writing; a later refusal preserves the completed prefix,
  skips the suffix, halts, and never triggers automatic rollback.
- One existing `repo.write` ALLOW covers only the immutable finite set;
  default-deny and REQUIRE_APPROVAL remain authoritative.
- Every successful target needs one strict per-path `repo.write` observation;
  integrated checks run once after all writes; actual Git-visible changes
  must equal the declared set; only aggregate PASS may accept.
- A partial-write FAIL requires a valid current contract binding and exactly
  the canonical-order success prefix followed by one refusal tuple for the
  next target; no suffix tuple is allowed. Ambiguous ordering is UNKNOWN.
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

Each unchecked item is **planned only**, independently reviewable, and
requires its own human start authorization and bounded file scope.

- [ ] **M4-T1 — Contract v2 and independent acceptance fixture shape.** Strict
  `schemaVersion: 2`/`replace-existing-files` parser, exact 2–5 target and
  closed adapter/profile validation, raw-byte hash, deeply frozen plan, and
  independent npm/pnpm fixture inputs. Preserve version-1 parsing. Prove
  zero/one/six targets, aliases, malformed fields, and immutable authority.
- [ ] **M4-T2 — Complete-set validation and preflight.** Read-only full-set
  path, physical containment, regular-file, trackedness, UTF-8, SHA-256,
  no-op, uniqueness, clean-baseline, and script-availability checks before
  any project write. One invalid target must cause zero target writes.
- [ ] **M4-T3 — Deterministic ordered write coordinator.** Bytewise normalized
  path order, fresh per-target apply-time validation, accepted per-file
  temporary/rename semantics, truthful completed-prefix/failure reporting,
  cleanup only of owned temp files, and no rollback/retry. Exercise first and
  later stale targets plus injected later rename failure.
- [ ] **M4-T4 — Set-based scope and aggregate write-evidence verification.**
  Exact Git-visible set equality; strict one-tuple-per-target successful
  evidence, explicit partial-failure result, duplicate/unexpected/missing/
  corrupt handling, digest and current-contract binding. Keep v1/v2 historical
  readers and existing single-target verifier behavior unchanged.
- [ ] **M4-T5 — Single orchestration integration.** Route v2 separately from
  version 1, hold mutation lock, apply eligibility/policy before writes,
  append observed per-target evidence, run required verification once on the
  integrated result, inspect scope, verify evidence, and accept only PASS.
  Public verify remains project-read-only and may perform only the accepted
  stale-state reconciliation.
- [ ] **M4-T6 — Independent npm/pnpm end-to-end, negative, and regression
  acceptance.** Public CLI disposable-project cases for 2-file npm, 5-file
  npm, and 2-file pnpm; all specified negatives; T0/M2/M3 compatibility;
  full repository gates. Local success is not remote acceptance.

**Task transition rule:** T1 through T6 remain unauthorized until separately
approved. A completed task does not automatically authorize the next task.
Commit, push, PR, merge, release, and any scope enlargement each require the
separate approval applicable at that point.

## 4. Acceptance and verification contract

- **AC-M4.1 Contract:** Version-2 authority is exact, immutable, hashed from
  raw bytes, 2–5 unique targets, and does not widen version 1 or accept
  worker-supplied commands/paths. Negative contract/path cases in the spec
  are proven without project mutation.
- **AC-M4.2 Preflight:** Every declared target passes the full set of safety,
  trackedness, preimage, and non-no-op checks before first write; any one
  invalid target, dirty baseline, missing required script, non-ALLOW policy,
  or held lock prevents target writes.
- **AC-M4.3 Apply:** Writes occur in deterministic path order with fresh
  revalidation. A stale first or later target and an injected later rename
  failure halt without attempting subsequent targets or rolling back prior
  successes. Partial outcome is truthful and never accepted.
- **AC-M4.4 Evidence/scope:** One exact before/after tuple per target plus
  current contract, exact-set scope, input binding, and complete required
  verification evidence are necessary for PASS. Missing, duplicate,
  unexpected, stale, corrupt, wrong-digest, subset, and superset cases never
  PASS. A partial FAIL requires an ordered complete success prefix and one
  explicit refusal at the next target, with no suffix records. Valid explicit
  failure is FAIL; unavailable/ambiguous proof is UNKNOWN.
- **AC-M4.5 Integration:** The supported npm/pnpm public CLI paths verify the
  combined result once, accept only aggregate PASS, preserve project files
  during public verify, and preserve existing exit/state semantics.
- **AC-M4.6 Compatibility:** Existing T0 and M2/M3 single-target npm/pnpm
  flows, v1/v2 evidence meaning, schema-version-1 tasks, and command surface
  pass unchanged. No test is skipped or weakened for acceptance.

**Verification condition for this planning baseline:** The four authorized
Markdown files alone contain the approved decisions, acceptance mapping,
dependency-ordered task chain, and explicit implementation gate; documentation
reference validation, `git diff --check`, and fixed-scope hygiene checks pass.
Implementation acceptance is **not** claimed by a planning document.

**Future implementation verification:** Focused task tests, positive and
negative independent public-CLI acceptance, full permitted-host and remote CI
tests, typecheck, lint, build, diff check, cleanliness, and scope/security
guards. The restricted-host `spawnSync node EPERM` observation is environment
evidence, not proof of a Sureflow runtime defect. Historical pre-M2
execution-control diagnostics remain outside M4 acceptance and their count is
not a milestone-quality metric.

## 5. State, checkpoints, and stop conditions

- **Current actor**: Human authority / Codex, planning only.
- **Current task**: None; M4-T1 is not started.
- **Current revision**: Accepted `origin/main` baseline
  `1106f75c550be467083f7d8408a21de6e389dba9`.
- **Current implementation evidence**: None; no M4 runtime, test, fixture,
  package, or CI file is authorized in this planning turn.
- **Checkpoint**: Before each T task start, completion, commit, push,
  acceptance, scope change, or human handoff; no automatic transition.
- **Stop conditions**: Any request to broaden 2–5 existing tracked files,
  authorize dynamic targets, add arbitrary commands/dependencies, weaken
  default-deny or evidence requirements, claim transaction/rollback/sandbox
  guarantees, change historical v1/v2 semantics, or cross an unapproved task
  boundary. Stop and seek explicit human authority.
- **Next action**: M4-T1 remains separately gated; no M5+ work is authorized.

## 6. Transition history

| Previous State | New State | Date | Actor | Reason |
| :--- | :--- | :--- | :--- | :--- |
| N/A | planned | 2026-09-23 | Human authority / Codex | M4-A selected for documentation-only planning; T1–T6 remain gated |
