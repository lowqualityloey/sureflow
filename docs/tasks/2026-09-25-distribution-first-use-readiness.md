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
- **Owner / Actor**: Human authority owns every execution and publication decision; Codex is authorized for the bounded T1 package/bin implementation and its local verification only.
- **Execution Scope**: Exactly `src/cli.ts`, `tsconfig.json` (add only `tests/distributionT1PackageBuild.test.ts` to normal typechecking), `tsconfig.package.json`, `scripts/clean-package-output.mjs`, `tests/distributionT1PackageBuild.test.ts`, `eslint.config.js`, this Task Record, and `docs/STATE.md`. Baseline: `main` / `8100c61f0222bd56a8c2f96989da818db940438a`; implementation branch: `codex/distribution-t1`.
- **Approval Boundary**: T1 alone is authorized: deterministic clean production compilation, stale `dist/src` prevention, the public Node CLI shebang, focused build/bin tests, and these two control-record updates. `package.json`, `package-lock.json`, package identity/version/tags, npm configuration/authentication, README, CI, ROADMAP, dogfood repositories, and all other paths are outside scope. T2 remains blocked on authenticated package identity; T3-T6, package/tarball installation, npm pack/publication, commits, pushes, and M5 remain unauthorized.
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
- **Dependencies**: M1-M4 and post-M4 remediation complete; ROADMAP Distribution / First-Use gate OPEN; Node 24/npm 11/Linux evidence baseline; authenticated package identity before T2/T6; dogfood selection before T5; separate publication authority before T6.
- **Risk**: `High` - this work eventually changes a public executable/package contract and may perform irreversible registry operations. Gated tasks, exact-artifact identity, independent acceptance, and separate publication/tag authority mitigate the risk.
- **Verification Condition**: Exact eight-path T1 scope; package-only build emits only current `src` JavaScript under `dist/src`, removes stale output, preserves the first-line Node shebang, runs `--help`, and produces identical sorted path/hash representations across two clean builds. Focused tests, typecheck, lint, build, full tests, and applicable scope/control/security gates pass. Package metadata remains unchanged; T2 stays blocked, T3-T6 unauthorized, and the readiness gate OPEN.

## 3. Gated dependency-ordered task breakdown

- [x] **T0 - Distribution decision preflight**: Complete as a decision preflight. Version `0.1.0`, the `next` then separately authorized `latest` policy, and the initial Linux / Node 24 / npm 11 / Git support baseline are resolved. Package identity is blocked pending authenticated npm evidence; dogfood is deferred until before T5; publication is reserved for separately authorized T6. No authentication, metadata mutation, dogfood mutation, or publication occurred.
- [ ] **T1 - Deterministic package/bin contract**: Implementation and local verification are complete on `codex/distribution-t1`, pending human review. Scope is limited to the exact paths in Section 1: production-only clean build, stale `dist/src` prevention, first-line Node shebang, and focused build/bin verification. No package metadata, npm authentication, pack, tarball installation, or publication.
- [ ] **T2 - Bounded package manifest**: BLOCKED until package identity is resolved through a human-controlled authenticated npm check; then apply the approved identity/version, metadata, positive package-content allowlist, and lockfile synchronization. No dependency additions without separate justification and authority.
- [ ] **T3 - Exact-tarball acceptance (not started / unauthorized)**: `npm pack`, complete content inspection, hash/integrity capture, exact-tarball installation, and installed-bin smoke tests.
- [ ] **T4 - Independent first-use acceptance (not started / unauthorized)**: Installed-tarball help/init, schema-v2 accepted flow, fail-closed flow, and target-root correctness.
- [ ] **T5 - Dogfood and release-readiness reconciliation (not started / unauthorized)**: Select an approved external project only after the required read-only compatibility check, then perform separately authorized dogfood and current-facing documentation/evidence preparation; no publication.
- [ ] **T6 - Separately authorized publication and registry proof (not started / unauthorized)**: Publish only the exact accepted tarball after explicit authority; prove version-qualified invocation; separately authorize tag promotion; prove unversioned invocation if documented; reconcile the ROADMAP gate only after complete evidence.

Each task needs separate explicit scope/authority. Completion of one task never
authorizes the next, and T6 is not implicitly authorized by T1-T5.

## 4. Acceptance criteria

- [ ] **AC-1 - Authority and decisions**: T0 records approved version, dist-tag policy, and initial platform baseline, plus the identity blocker, deferred dogfood decision, and T6 publication boundary. Authenticated identity is required before T2/T6; dogfood selection is required before T5; separate publication authority is required before T6. T1 does not change package metadata and may be separately authorized independently.
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
- **Stop Conditions**: Missing authenticated identity before T2/T6; missing dogfood selection/authority before T5; missing separate publication authority before T6; unexpected baseline/scope; required path not authorized; dependency addition without justification; stale or leaking artifact; checkout-dependent execution; unsupported platform claim; artifact rebuild after acceptance; failed gate requiring broader scope; any M5 work. These downstream blockers do not themselves block an independently authorized T1 that makes no package metadata changes.
- **Host Timer Capability**: Live host timing and forced termination are unavailable; checkpoints are manual.

## 6. State and active ownership

- **Execution State**: `awaiting_review`
- **Mapped `pk:tasks` Status**: `In Review`
- **Active Task Pointer**: `None`
- **Start Time**: `2026-09-26 - T1 implementation authorization`
- **Current Actor**: Codex - T1 implementation and local verification complete; human review is pending
- **Next Action**: Human review of the exact local diff. Do not begin T2, authenticate to npm, change package metadata, mutate a dogfood project, pack/install/publish a tarball, push, or begin M5.

### Transition history

| Previous State | New State | Timestamp | Actor | Reason | Supporting Evidence |
| :--- | :--- | :--- | :--- | :--- | :--- |
| N/A | planned | 2026-09-25 | Human authority / Codex | Read-only investigation accepted and exact three-file planning/control scope authorized; implementation and publication remain unauthorized. | [Planning specification](../specs/2026-09-25-distribution-first-use-readiness.md) |
| planned | ready | 2026-09-26 | Human authority / Codex | T0 reconciliation recorded T1 as ready for separate authorization; implementation had not started. | T0 decision reconciliation and separate-authorization boundary |
| ready | in_progress | 2026-09-26 | Human authority / Codex | Explicitly authorized T1 deterministic production build/bin contract on `codex/distribution-t1`; T2 remains identity-blocked and T3-T6 unauthorized. | T1 authorization; exact seven-path scope in Section 1 |
| in_progress | awaiting_review | 2026-09-27 | Codex | T1 implementation and local verification complete; the final diff remains uncommitted and awaits human review. | Focused 5/5, full 588/588 across 41 files, typecheck/lint/build, package-output audit, and applicable local gates |

### T0 decision update (2026-09-26)

Human authority approved version `0.1.0`, the `next` then separately authorized
`latest` policy, and the Linux / Node 24 / npm 11 / Git baseline. T0 is complete
as a decision preflight with identity blocked, dogfood deferred, and publication
reserved for T6. T1 is separately authorized and active; T2 remains blocked and
T3-T6 remain unauthorized.

## 7. Decision status and remaining human decisions

1. Authenticated npm identity and final package name remain unresolved: preferred `sureflow`; fallback `@lowqualityloey/sureflow`. Before T2, the maintainer must authenticate personally; after separate authorization, a read-only check must verify `npm whoami`, the authenticated username, registry visibility of `sureflow`, the authenticated user's scope, and whether the fallback matches that namespace. Never store or expose passwords, OTPs, tokens, or `.npmrc` credentials. Registry E404 is not ownership evidence.
2. First planned public version: approved as `0.1.0`.
3. Tag policy: first separately authorized publication uses `next`; version-qualified acceptance follows; promoting that exact version to `latest` requires separate explicit authorization. Document unversioned `npx` only after `latest` behavior is proven.
4. Initial support baseline approved as Linux / Node 24 / npm 11 / Git / currently supported standalone Node/TypeScript project shapes. macOS and Windows remain unclaimed until installed-package acceptance exists.
5. Dogfood project remains unselected and mutation authority is absent. `fast-jev-compaction` is not selected because write authority is not established. `job-tracker` remains a candidate; before selection, require a separately authorized read-only compatibility check, especially whether the fixed `npm test` path exits deterministically.
6. Publication is reserved exclusively for separately authorized T6.

Registry 404 does not settle ownership. No open decision may be silently treated
as approved.

## 8. Later implementation scope, not authorization

The active T1 scope is the exact eight-path set recorded in Section 1. The
following candidates describe later gated work only and do not authorize it.

- Likely T2 package/runtime: `package.json`, `package-lock.json`.
- Later acceptance: exact-tarball and first-use tests plus only separately authorized helpers.
- Possible package-only CI: `.github/workflows/ci.yml`.
- Later current-facing docs/evidence: `README.md`, `ARCHITECTURE.md`, `SECURITY.md`, `CHANGELOG.md`, `ROADMAP.md` only when gate truth changes, new `docs/releases/<date>-distribution-first-use-acceptance.md`, and `docs/STATE.md`.
- Not expected: fixture changes, M2-M4 redesign, dependency additions, daemon, scheduler, release platform, M5.

## 9. Evidence and completion gate

- **Changed Files**: T1 exact eight-path execution scope in Section 1; no other paths are authorized.
- **Scope Change Records**: 2026-09-27 human-authorized lint-boundary addition of `eslint.config.js`; 2026-09-27 human-authorized test-local `15_000ms` timeout for the deterministic two-build case. Neither changed the execution-state transition.
- **Checkpoint Records**: `None`
- **Handoff Records**: `None`
- **Verification Evidence**: Node `24.20.0`, npm `11.20.0` (compatible with the approved npm 11 baseline). Focused T1 suite passed `5/5`; deterministic two-build case took `4.426s` focused and `10.089s` in the full run, below its test-local `15_000ms` cap. Full `npm test` passed `588/588` across 41 files. `npm run typecheck`, `npm run lint`, and `npm run build` passed. After the full suite, local cleanup plus `tsc -p tsconfig.package.json` emitted 53 JavaScript modules matching all 53 current `src` modules; stale probe and test output were absent and `dist/src/cli.js` retained the exact Node shebang. PromptKit reference validation passed 240 Markdown files; the execution-control fixture harness passed 23 isolated contracts; fixed-scope harness security reported no findings; changed Markdown local links, credential scan, debug-instrumentation scan, file-size, scope, protected-path, and diff-hygiene checks passed. The repository-root `.sureflow/` directory is pre-existing ignored state (mtime 2026-09-22), was not modified, and `.sureflow/task.json` is absent. The default sandbox previously returned child-process `EPERM`; focused/full suites passed under approved host execution. Final execution-control validation retained only the 98 unrelated historical findings and reported no T1-specific findings. The prior T0 control-record validation remains historical evidence, not a T1 gate result.
- **Behavior IDs**: `N/A - TDD Enforcement Mode disabled`
- **TDD Intent Register**: `N/A - TDD Enforcement Mode disabled`
- **TDD Execution Evidence**: `N/A - implementation not authorized`
- **TDD Exception Verification**: Documentation/control planning uses link, reference, scope, and diff validation.
- **CI Evidence**: `N/A - no CI change or run authorized`
- **Review Evidence**: T1 implementation and local verification are ready for human review; no human T1 acceptance is claimed. T2-T6 remain separately gated.
- **Commit Evidence**: No T1 commit is authorized or created; push remains unauthorized.
- **Pull Request Evidence**: `N/A - PR not authorized`
- **Release Evidence**: `N/A - publication and tag changes not authorized`
- **Blocker and Resume Condition**: T1 is implemented locally and awaiting human review. T2 is blocked on authenticated package identity; T3-T6 remain unauthorized. The Distribution / First-Use readiness gate remains OPEN.
- **Branch / Revision**: `codex/distribution-t1`, based on `8100c61f0222bd56a8c2f96989da818db940438a`; no commit or push is authorized.
- **Completion State**: `awaiting_review`
- **Acceptance Results**: `Local T1 implementation and verification complete; human review and acceptance pending`
- **Changed-File Summary**: `Exact eight-path T1 build/bin contract only; package metadata, npm auth/publication, dogfood, T2-T6, and M5 remain outside scope.`
- **Completion Exception**: `N/A - planning record remains open for review`
- **Completion Decision and Timestamp**: `T1 local implementation/verification complete; awaiting human review as of 2026-09-27; workstream gate remains OPEN`
