# Distribution / First-Use Readiness - Local Task Record

<a id="TASK-2026-09-25-distribution-first-use-readiness"></a>

## 1. Identity and authority

- **Record Type**: `Task Record`
- **Task ID**: `TASK-2026-09-25-distribution-first-use-readiness`
- **PromptKit Adaptation Profile**: `none`
- **Work Type**: `Planning / Release Configuration Work`
- **Planning Record Link**: [PLAN-distribution-first-use-readiness](../specs/2026-09-25-distribution-first-use-readiness.md#PLAN-distribution-first-use-readiness)
- **Planning Depth Reference**: `Full`
- **Assumption Record Links**: `None`
- **Specification**: [Distribution / First-Use Readiness](../specs/2026-09-25-distribution-first-use-readiness.md)
- **External Reference**: `N/A - local planning records remain authoritative`
- **Owner / Actor**: Human authority owns execution and publication decisions. T1 is complete and merged. Human authority selected `sureflow` as the intended package identity after the authenticated read-only preflight; Codex is recording that decision and the current state only.
- **Execution Scope**: This reconciliation and its local commit are limited to exactly `docs/specs/2026-09-25-distribution-first-use-readiness.md`, this Task Record, and `docs/STATE.md`. Baseline: `main` / `c20df15798723da168bbca26eaff0b4b1ad8dc36`; local documentation branch: `docs/distribution-package-identity`. No T2 implementation path is included.
- **Approval Boundary**: The current authorization is documentation/control-state reconciliation and one local commit only. It records intended package identity `sureflow`, but E404 and authenticated account identity do not reserve the name or guarantee publication rights. T1 is complete and merged via PR #12 normal merge commit `c20df15798723da168bbca26eaff0b4b1ad8dc36`; no push is authorized for this reconciliation. T2 is READY FOR SEPARATE AUTHORIZATION and has not started. `package.json`, `package-lock.json`, runtime, tests, build configuration, CI, README, ROADMAP, npm configuration, dogfood repositories, npm pack, publication/tag mutation, T3-T6 implementation, and M5 are outside this scope.
- **Created**: 2026-09-25

## 2. Objective and boundaries

- **Objective**: Implement the identity-independent deterministic package build/bin contract authorized for T1 without changing package metadata or expanding the accepted M1-M4 product boundary.
- **In Scope**:
  - Production-only TypeScript compilation, fixed cleanup of `dist/src`, preservation of the CLI shebang, focused deterministic build/bin verification, and minimal T1 status projection.
  - No package name/version/tag assumptions; T0 decisions and downstream gates remain as recorded below.
- **Explicit Non-Goals**:
  - Any path outside the exact eight-file T1 execution scope above; no changes to `package.json` or `package-lock.json`.
  - Final package identity, npm authentication, name claiming, package/version/tag mutation, npm pack, tarball installation, publication, or release automation.
  - Task-authoring wizard, interactive generator, autonomous task creation, new mutation capability, adapter expansion, M5, or another milestone.
  - Rewriting M1-M4 history or changing their accepted behavior.
- **Dependencies**: M1-M4 and post-M4 remediation complete; ROADMAP Distribution / First-Use gate OPEN; Node 24/npm 11/Linux evidence baseline; intended package identity `sureflow` selected, without any reservation or publication-right guarantee; separate T2 authorization; dogfood selection before T5; separate publication authority before T6.
- **Risk**: `High` - this work eventually changes a public executable/package contract and may perform irreversible registry operations. Gated tasks, exact-artifact identity, independent acceptance, and separate publication/tag authority mitigate the risk.
- **Verification Condition**: Historical T1 verification passed on its accepted implementation. For this decision reconciliation, exactly the three authorized documentation paths change; the authenticated preflight facts and human choice are recorded without claiming reservation/publication rights. Package metadata remains unchanged; T2 is READY FOR SEPARATE AUTHORIZATION but not started, T3-T6 unauthorized, and the readiness gate OPEN.

## 3. Gated dependency-ordered task breakdown

- [x] **T0 - Distribution decision preflight**: Complete. Human decisions resolve intended package identity `sureflow`, planned version `0.1.0`, initial `next` tag and separate authorization for later `latest` promotion, and the initial Linux / Node 24 / npm 11 / Git support baseline. Authenticated read-only evidence observed username `lowqualityloey`, public npm registry, and E404 for both candidate names; these results do not reserve `sureflow` or guarantee future publication rights. Dogfood remains deferred until before T5; publication is reserved for separately authorized T6. No metadata, dogfood, publication, or tag mutation occurred.
- [x] **T1 - Deterministic package/bin contract**: Implementation and local verification were committed as `23f1b702e2a22a2dae01a9d24aceb00b5cffd867`, reviewed through PR #12, and merged into `main` by normal merge commit `c20df15798723da168bbca26eaff0b4b1ad8dc36`. T1 is complete; merged topic-branch cleanup is complete. Its accepted scope was production-only clean build, stale `dist/src` prevention, first-line Node shebang, and focused build/bin verification. T1 did not change package metadata or publish a package.
- [ ] **T2 - Bounded package manifest**: READY FOR SEPARATE AUTHORIZATION; not started. Under a separate authorization, apply package name `sureflow`, planned version `0.1.0`, required metadata, positive package-content allowlist, and lockfile root synchronization. This record does not authorize T2 implementation, dependency additions, or `npm pack`.
- [ ] **T3 - Exact-tarball acceptance (not started / unauthorized)**: `npm pack`, complete content inspection, hash/integrity capture, exact-tarball installation, and installed-bin smoke tests.
- [ ] **T4 - Independent first-use acceptance (not started / unauthorized)**: Installed-tarball help/init, schema-v2 accepted flow, fail-closed flow, and target-root correctness.
- [ ] **T5 - Dogfood and release-readiness reconciliation (not started / unauthorized)**: Select an approved external project only after the required read-only compatibility check, then perform separately authorized dogfood and current-facing documentation/evidence preparation; no publication.
- [ ] **T6 - Separately authorized publication and registry proof (not started / unauthorized)**: Publish only the exact accepted tarball after explicit authority; prove version-qualified invocation; separately authorize tag promotion; prove unversioned invocation if documented; reconcile the ROADMAP gate only after complete evidence.

Each task needs separate explicit scope/authority. Completion of one task never
authorizes the next, and T6 is not implicitly authorized by T1-T5.

## 4. Acceptance criteria

- [ ] **AC-1 - Authority and decisions**: T0 records human-selected identity `sureflow`, planned version `0.1.0`, initial `next` tag with separately authorized later `latest` promotion, and initial platform baseline. E404 is not a reservation or publication-right guarantee. T2 needs separate implementation authorization; dogfood selection is required before T5; separate publication authority is required before T6. T1 is complete and did not change package metadata.
- [ ] **AC-2 - Deterministic bounded package**: A clean package-only build emits the required runtime with a valid Node shebang, no stale modules, no source-checkout dependency, and a positive content allowlist excluding internal/development material and secrets.
- [ ] **AC-3 - Exact artifact**: One tarball is fully inspected and identified by path/name, SHA-256, and npm integrity when available; every later acceptance, dogfood, and publication action consumes those exact bytes. Any rebuild invalidates acceptance.
- [ ] **AC-4 - Installed-package first use**: An independent runner installs the exact tarball and its installed `.bin` completes `--help -> init -> task creation -> preflight -> run -> status -> verify` against a separate supported project.
- [ ] **AC-5 - Fail-closed behavior**: Invalid-task and/or stale-preimage acceptance proves non-success, no target mutation, no undeclared path, and no false successful-run evidence.
- [ ] **AC-6 - Independent dogfood**: A human-approved external project uses the exact accepted tarball for a schema-v2 two-target accepted change and one fail-closed case, with baseline, shape, targets, checks, changed set, and limitations recorded.
- [ ] **AC-7 - Publication and registry proof**: Separate authority publishes the exact accepted tarball under the approved non-default validation tag; version-qualified invocation passes; separate authority controls promotion to `latest`; unversioned invocation passes if documented.
- [ ] **AC-8 - Truthful closeout**: Current-facing docs and release evidence match observed behavior and supported platforms; only then does ROADMAP move Distribution / First-Use from OPEN to satisfied. M5 remains separately selected and authorized, if ever.

## 5. Execution policy

- **Mode**: `Gated Mode`
- **TDD Enforcement Mode**: `disabled` - dependency-ordered packaging and acceptance tasks are planned; no Red/Green/Refactor sequence is activated.
- **Batch Authorization**: `None`
- **Soft Checkpoint**: After each separately authorized T task and before presenting evidence for human review.
- **Hard Checkpoint**: Before metadata/version changes, external-project mutation, commit, push, npm authentication, package publication, dist-tag mutation, ROADMAP gate closure, or transition to another T task.
- **Event-Driven Checkpoints**: Identity/permission result, scope discovery, package-content discrepancy, artifact rebuild/hash change, installed-bin failure, first-use failure, dogfood decision/failure, publication request, registry/tag result, or scope expansion.
- **Stop Conditions**: T2 implementation without its separate authorization; missing dogfood selection/authority before T5; missing separate publication authority or verified current publication eligibility before T6; unexpected baseline/scope; required path not authorized; dependency addition without justification; stale or leaking artifact; checkout-dependent execution; unsupported platform claim; artifact rebuild after acceptance; failed gate requiring broader scope; any M5 work. The selected identity and E404 observations do not guarantee reservation or publication rights.
- **Host Timer Capability**: Live host timing and forced termination are unavailable; checkpoints are manual.

## 6. State and active ownership

- **Execution State**: `awaiting_review`
- **Mapped `pk:tasks` Status**: `In Review`
- **Active Task Pointer**: `None`
- **Start Time**: `2026-09-26 - T1 implementation authorization`
- **Current Actor**: Human authority / Codex - T1 is complete and merged; package identity is human-selected as `sureflow`; T2 is ready but awaits separate implementation authorization.
- **Next Action**: Obtain separate T2 authorization before changing package metadata or implementation. Do not begin T2 yet, run `npm pack`, publish, mutate tags, mutate a dogfood project, or begin M5.

### Transition history

| Previous State | New State | Timestamp | Actor | Reason | Supporting Evidence |
| :--- | :--- | :--- | :--- | :--- | :--- |
| N/A | planned | 2026-09-25 | Human authority / Codex | Read-only investigation accepted and exact three-file planning/control scope authorized; implementation and publication remain unauthorized. | [Planning specification](../specs/2026-09-25-distribution-first-use-readiness.md) |
| planned | ready | 2026-09-26 | Human authority / Codex | T0 reconciliation recorded T1 as ready for separate authorization; implementation had not started. | T0 decision reconciliation and separate-authorization boundary |
| ready | in_progress | 2026-09-26 | Human authority / Codex | Explicitly authorized T1 deterministic production build/bin contract on `codex/distribution-t1`; T2 remains identity-blocked and T3-T6 unauthorized. | T1 authorization; exact seven-path scope in Section 1 |
| in_progress | awaiting_review | 2026-09-27 | Codex | T1 implementation and local verification complete; the final diff remains uncommitted and awaits human review. | Focused 5/5, full 588/588 across 41 files, typecheck/lint/build, package-output audit, and applicable local gates |

### T0 decision update (2026-09-26)

Human authority approved version `0.1.0`, the initial `next` tag, separate
authorization for promotion of the exact accepted version to `latest`, and the
Linux / Node 24 / npm 11 / Git baseline. On 2026-09-28, human authority selected
`sureflow` after a read-only preflight (`npm whoami` = `lowqualityloey`, public
registry, and E404 for both candidate names); these facts do not reserve the
name or guarantee publication rights. T0 is complete. T1 is complete and
merged. T2 is READY FOR SEPARATE AUTHORIZATION and not started; T3-T6 remain
unauthorized. Dogfood remains deferred, and publication remains reserved for
separately authorized T6.

## 7. Decision status and remaining human decisions

1. The intended package identity is resolved by human decision as `sureflow`; the existing binary remains `sureflow`. The read-only preflight observed `npm whoami` = `lowqualityloey`, registry `https://registry.npmjs.org/`, and E404 for both `sureflow` and `@lowqualityloey/sureflow`. This does not reserve the unscoped name or guarantee future publication rights. Never store or expose passwords, OTPs, tokens, or `.npmrc` credentials.
2. First planned public version: approved as `0.1.0`.
3. Tag policy: first separately authorized publication uses `next`; version-qualified acceptance follows; promoting that exact version to `latest` requires separate explicit authorization. Document unversioned `npx` only after `latest` behavior is proven.
4. Initial support baseline approved as Linux / Node 24 / npm 11 / Git / currently supported standalone Node/TypeScript project shapes. macOS and Windows remain unclaimed until installed-package acceptance exists.
5. Dogfood project remains unselected and mutation authority is absent. `fast-jev-compaction` is not selected because write authority is not established. `job-tracker` remains a candidate; before selection, require a separately authorized read-only compatibility check, especially whether the fixed `npm test` path exits deterministically.
6. Publication is reserved exclusively for separately authorized T6.

Registry E404 and authenticated account identity do not establish reservation
or future publication rights. Dogfood, publication execution, and any tag
mutation remain separate decisions/authorities; no package has been published.

## 8. Later implementation scope, not authorization

The completed T1 implementation used the historical exact eight-path set
recorded in its acceptance evidence. The following candidates describe later
gated work only and do not authorize it. T2 is READY FOR SEPARATE AUTHORIZATION,
not started.

- T2 package metadata/runtime, under separate authorization: `package.json`
  (`name: sureflow`, planned `version: 0.1.0`, required package metadata and
  positive package-content allowlist) and `package-lock.json` root
  synchronization. No dependency, pack, publication, or tag mutation is
  authorized by this record.
- Later acceptance: exact-tarball and first-use tests plus only separately authorized helpers.
- Possible package-only CI: `.github/workflows/ci.yml`.
- Later current-facing docs/evidence: `README.md`, `ARCHITECTURE.md`, `SECURITY.md`, `CHANGELOG.md`, `ROADMAP.md` only when gate truth changes, new `docs/releases/<date>-distribution-first-use-acceptance.md`, and `docs/STATE.md`.
- Not expected: fixture changes, M2-M4 redesign, dependency additions, daemon, scheduler, release platform, M5.

## 9. Evidence and completion gate

- **Changed Files**: Historical T1 implementation used its accepted exact eight-path scope; this identity-decision reconciliation is exactly the three documentation/control paths listed in Section 1.
- **Scope Change Records**: 2026-09-27 human-authorized lint-boundary addition of `eslint.config.js`; 2026-09-27 human-authorized test-local `15_000ms` timeout for the deterministic two-build case. On 2026-09-28, human authority authorized this three-document package-identity decision reconciliation and one local commit only; no T2 implementation was authorized.
- **Checkpoint Records**: `None`
- **Handoff Records**: `None`
- **Verification Evidence**: Node `24.20.0`, npm `11.20.0` (compatible with the approved npm 11 baseline). Focused T1 suite passed `5/5`; deterministic two-build case took `4.426s` focused and `10.089s` in the full run, below its test-local `15_000ms` cap. Full `npm test` passed `588/588` across 41 files. `npm run typecheck`, `npm run lint`, and `npm run build` passed. After the full suite, local cleanup plus `tsc -p tsconfig.package.json` emitted 53 JavaScript modules matching all 53 current `src` modules; stale probe and test output were absent and `dist/src/cli.js` retained the exact Node shebang. PromptKit reference validation passed 240 Markdown files; the execution-control fixture harness passed 23 isolated contracts; fixed-scope harness security reported no findings; changed Markdown local links, credential scan, debug-instrumentation scan, file-size, scope, protected-path, and diff-hygiene checks passed. The repository-root `.sureflow/` directory is pre-existing ignored state (mtime 2026-09-22), was not modified, and `.sureflow/task.json` is absent. The default sandbox previously returned child-process `EPERM`; focused/full suites passed under approved host execution. Final execution-control validation retained only the 98 unrelated historical findings and reported no T1-specific findings. The prior T0 control-record validation remains historical evidence, not a T1 gate result.
- **Decision Reconciliation Evidence (2026-09-28)**: `git diff --check` passed; PromptKit reference validation passed across 240 Markdown files; changed-document local links passed; execution-control Bash fixture harness passed 23 isolated contracts; fixed-scope harness security reported no findings; credential-pattern and debug/probe scans had zero matches; exact three-file scope and protected-path checks passed; `package.json` and `package-lock.json` are unchanged. The execution-control validator returned the 98 unrelated historical findings and zero findings for this Distribution Task Record/STATE projection. Product tests were not rerun because this was documentation/control-state-only. No npm authentication, `npm pack`, publication/tag mutation, dogfood mutation, or M5 work occurred in this reconciliation.
- **Behavior IDs**: `N/A - TDD Enforcement Mode disabled`
- **TDD Intent Register**: `N/A - TDD Enforcement Mode disabled`
- **TDD Execution Evidence**: `N/A - implementation not authorized`
- **TDD Exception Verification**: Documentation/control planning uses link, reference, scope, and diff validation.
- **CI Evidence**: `N/A - no CI change or run authorized`
- **Review Evidence**: T1 is complete and was merged through PR #12 by normal merge commit `c20df15798723da168bbca26eaff0b4b1ad8dc36`; the merged T1 topic branch was cleaned up. Human authority selected `sureflow` as the intended package identity after authenticated read-only preflight. This reconciliation does not authorize T2, publication, or tag mutation.
- **Commit Evidence**: T1 implementation commit `23f1b702e2a22a2dae01a9d24aceb00b5cffd867` — `feat(distribution): establish deterministic package build`; sole parent `8100c61f0222bd56a8c2f96989da818db940438a`; exactly the eight authorized T1 paths. Published and reviewed through PR #12, then merged with the `main` parent by normal merge commit `c20df15798723da168bbca26eaff0b4b1ad8dc36`. This history is separate from the authorized local documentation commit for the current identity reconciliation.
- **Pull Request Evidence**: PR #12 — `feat(distribution): establish deterministic package build`; T1 head `bdad40a6783757de806e0044c187188c155991bb` merged into `main` by normal merge commit `c20df15798723da168bbca26eaff0b4b1ad8dc36`.
- **Release Evidence**: `N/A - publication and tag changes not authorized`
- **Blocker and Resume Condition**: T1 is complete and merged. Package identity is selected as `sureflow`, but E404 and account identity do not reserve the name or guarantee publication rights. T2 is READY FOR SEPARATE AUTHORIZATION and not started; T3-T6 remain unauthorized. Dogfood remains unselected, publication remains reserved for T6, and the Distribution / First-Use readiness gate remains OPEN.
- **Branch / Revision**: Current reconciliation branch `docs/distribution-package-identity`, based on `main` at `c20df15798723da168bbca26eaff0b4b1ad8dc36`; the exact three-document local commit is authorized, not pushed. T1's merged history is recorded above.
- **Completion State**: `awaiting_review`
- **Acceptance Results**: `T1 is complete and merged. The authenticated read-only identity preflight and explicit human selection of sureflow are recorded. T2 is ready for separate authorization but has not started.`
- **Changed-File Summary**: `Current identity decision reconciliation is limited to this Task Record, the planning specification, and docs/STATE.md. No package metadata, runtime, tests, dependencies, or CI changed.`
- **Completion Exception**: `N/A - the Distribution / First-Use workstream remains open; later gated tasks and publication are incomplete and unauthorized.`
- **Completion Decision and Timestamp**: `On 2026-09-28 human authority selected sureflow based on authenticated read-only evidence and authorized this three-document reconciliation plus one local commit. T2 remains not started and separately gated; the workstream gate remains OPEN.`
