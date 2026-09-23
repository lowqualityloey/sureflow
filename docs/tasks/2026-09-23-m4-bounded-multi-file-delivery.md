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
- **Approval Boundary**: M4 direction and original four-file planning baseline only; this separate correction is limited to this Task Record and its linked specification; T1–T6 implementation, later commits, pushes, and acceptance remain separately gated
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
- **Corrective Documentation Scope**: Linked M4 specification and this Task Record only; original four-file baseline scope above is historical
- **Scope Change Records**: `None`
- **Checkpoint Records**: `None`
- **Handoff Records**: `None`
- **Verification Evidence**: PromptKit references, relative Markdown links, whitespace, exact four-file scope, and document secret/debug/credential/artifact scans passed. Execution-control validation found zero M4-record findings and remains non-green with 98 historical findings; linked-worktree harness reports `GIT_LAYOUT` incomplete. No runtime verification claimed.
- **CI Evidence**: N/A — no M4 CI run or implementation exists
- **Review Evidence**: The read-only baseline review found five blocking wording ambiguities. Human authority approved this two-document correction; re-review is required before push. M4 implementation remains gated.
- **Commit Evidence**: The original local planning-baseline commit is retained; one separate corrective documentation commit is authorized on `codex/m4-planning`. No amend or push is authorized.
- **Pull Request Evidence**: None — no PR authorized by this turn
- **Release Evidence**: None — no release authorized
- **Blocker and Resume Condition**: M4 implementation is gated; resume only after separate human T-task authorization
- **Completion State**: `planned`
- **Acceptance Results**: Original baseline documentation checks passed; corrected planning wording remains subject to re-review before push. No M4 runtime behavior is accepted.
- **Changed-File Summary**: Original baseline changed four planning Markdown files; this correction changes only its specification and Task Record. No code or protected checkout change is authorized.
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

Each unchecked item is **planned only**, independently reviewable, and
requires its own human start authorization and bounded file scope.

- [ ] **M4-T1 — Contract v2 and independent acceptance fixture shape.** Strict
  `schemaVersion: 2`/`replace-existing-files` parser, exact 2–5 target and
  closed adapter/profile validation, duplicate-key-aware raw JSON validation
  for top-level and target members before authority is accepted, raw-byte
  hash distinct from parsed meaning, and deeply frozen plan. Preserve
  version-1 parsing. Reuse the existing disposable independent npm/pnpm
  fixture patterns with only the extra tracked files needed for M4; do not
  create a fixture framework. Prove zero/one/six targets, lexical duplicates,
  duplicate raw keys, malformed fields, and immutable authority. T1 does not
  implement T2 preflight, T3 writes, T4 verification, or T5 orchestration.
- [ ] **M4-T2 — Complete-set validation and preflight.** Read-only full-set
  path/physical containment, canonical realpath and usable `(device, inode)`
  uniqueness, regular-file, version-2 literal exact Git trackedness, UTF-8,
  SHA-256, no-op, clean-baseline, and script-availability checks before any
  project write. Refuse unavailable required identity. Current project
  detection carries a single-`targetPath` coupling; T2 may adapt it for the
  version-2 set while preserving version-1 behavior. One invalid target must
  cause zero target writes.
- [ ] **M4-T3 — Deterministic ordered write coordinator.** Bytewise normalized
  path order, fresh per-target apply-time validation against its frozen
  physical identity and literal trackedness, accepted per-file temporary/
  rename semantics, truthful completed-prefix/first-refusal reporting using
  the closed `refused:<code>` set, cleanup only of owned temp files, and no
  rollback/retry. Exercise first/later stale or identity-changed targets
  plus injected later rename failure.
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

**Task transition rule:** T1 through T6 remain unauthorized until separately
approved. A completed task does not automatically authorize the next task.
Commit, push, PR, merge, release, and any scope enlargement each require the
separate approval applicable at that point.

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
| planned | planned | 2026-09-23 | Human authority / Codex | Five review blockers corrected in the specification and Task Record only; separate re-review remains required before push or implementation authorization |
