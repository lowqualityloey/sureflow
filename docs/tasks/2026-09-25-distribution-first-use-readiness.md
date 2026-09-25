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
- **Owner / Actor**: Human authority owns every execution and publication decision; Codex is authorized only to reconcile the T0 control records and T1 prerequisite wording in the specification.
- **Execution Scope**: Exactly this Task Record and `docs/STATE.md` for T0 decision/status reconciliation, plus the specification only to clarify that identity-independent T1 does not require package identity or metadata changes. Baseline: `main` / `f293d20715c98d461acae01aa33c527528ca985a`.
- **Approval Boundary**: This authorization covers control-record reconciliation only. T0 is recorded complete as a decision preflight with package identity blocked, dogfood deferred, and publication reserved for T6. T1 implementation, npm authentication, package metadata changes, dogfood mutation, T2-T6 execution, commit, push, release automation, and M5 remain unauthorized.
- **Created**: 2026-09-25

## 2. Objective and boundaries

- **Objective**: Define an implementation-ready, fail-closed path that can close the ROADMAP's OPEN Distribution / First-Use gate without expanding the accepted M1-M4 product boundary or treating planning as execution authority.
- **In Scope**:
  - The specification, this canonical Task Record, and minimal STATE projection.
  - Preferred/fallback package-identity decision process.
  - Approved first version/tag sequence and platform baseline; deterministic package contract, exact-artifact invariant, installed-package acceptance, first-use acceptance, deferred dogfood requirement, package-only CI boundary, and T0-T6 gates.
- **Explicit Non-Goals**:
  - Any implementation or modification outside the three planning/control paths.
  - Final package identity, npm authentication, name claiming, package/version/tag mutation, publication, or release automation.
  - Task-authoring wizard, interactive generator, autonomous task creation, new mutation capability, adapter expansion, M5, or another milestone.
  - Rewriting M1-M4 history or changing their accepted behavior.
- **Dependencies**: M1-M4 and post-M4 remediation complete; ROADMAP Distribution / First-Use gate OPEN; Node 24/npm 11/Linux evidence baseline; authenticated package identity before T2/T6; dogfood selection before T5; separate publication authority before T6.
- **Risk**: `High` - this work eventually changes a public executable/package contract and may perform irreversible registry operations. Gated tasks, exact-artifact identity, independent acceptance, and separate publication/tag authority mitigate the risk.
- **Verification Condition**: Only the two control records and, if needed, the T1 prerequisite clarification in the specification differ; Markdown references and local links resolve; `git diff --check` passes; no package/source/test/CI metadata changes; M1-M4 remain complete; gate remains OPEN; implementation, publication, and M5 remain unauthorized.

## 3. Gated dependency-ordered task breakdown

- [x] **T0 - Distribution decision preflight**: Complete as a decision preflight. Version `0.1.0`, the `next` then separately authorized `latest` policy, and the initial Linux / Node 24 / npm 11 / Git support baseline are resolved. Package identity is blocked pending authenticated npm evidence; dogfood is deferred until before T5; publication is reserved for separately authorized T6. No authentication, metadata mutation, dogfood mutation, or publication occurred.
- [ ] **T1 - Deterministic package/bin contract**: READY FOR SEPARATE AUTHORIZATION; not started. May address identity-independent clean build, public CLI shebang, required compiled runtime, and stale-output prevention only. Must not change package name, version, dist-tags, `package.json`, or `package-lock.json`, authenticate, or publish.
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

- **Execution State**: `planned`
- **Mapped `pk:tasks` Status**: `To Do`
- **Active Task Pointer**: `None`
- **Start Time**: `N/A - implementation has not started`
- **Current Actor**: Human authority / Codex - T0 control-record reconciliation only
- **Next Action**: Await separate human authorization before T1. Do not start implementation, authenticate to npm, change package metadata, mutate a dogfood project, publish, or begin M5.

### Transition history

| Previous State | New State | Timestamp | Actor | Reason | Supporting Evidence |
| :--- | :--- | :--- | :--- | :--- | :--- |
| N/A | planned | 2026-09-25 | Human authority / Codex | Read-only investigation accepted and exact three-file planning/control scope authorized; implementation and publication remain unauthorized. | [Planning specification](../specs/2026-09-25-distribution-first-use-readiness.md) |

### T0 decision update (2026-09-26)

Human authority approved version `0.1.0`, the `next` then separately authorized
`latest` policy, and the Linux / Node 24 / npm 11 / Git baseline. T0 is complete
as a decision preflight with identity blocked, dogfood deferred, and publication
reserved for T6. T1 is ready for separate authorization but has not started.

## 7. Decision status and remaining human decisions

1. Authenticated npm identity and final package name remain unresolved: preferred `sureflow`; fallback `@lowqualityloey/sureflow`. Before T2, the maintainer must authenticate personally; after separate authorization, a read-only check must verify `npm whoami`, the authenticated username, registry visibility of `sureflow`, the authenticated user's scope, and whether the fallback matches that namespace. Never store or expose passwords, OTPs, tokens, or `.npmrc` credentials. Registry E404 is not ownership evidence.
2. First planned public version: approved as `0.1.0`.
3. Tag policy: first separately authorized publication uses `next`; version-qualified acceptance follows; promoting that exact version to `latest` requires separate explicit authorization. Document unversioned `npx` only after `latest` behavior is proven.
4. Initial support baseline approved as Linux / Node 24 / npm 11 / Git / currently supported standalone Node/TypeScript project shapes. macOS and Windows remain unclaimed until installed-package acceptance exists.
5. Dogfood project remains unselected and mutation authority is absent. `fast-jev-compaction` is not selected because write authority is not established. `job-tracker` remains a candidate; before selection, require a separately authorized read-only compatibility check, especially whether the fixed `npm test` path exits deterministically.
6. Publication is reserved exclusively for separately authorized T6.

Registry 404 does not settle ownership. No open decision may be silently treated
as approved.

## 8. Likely implementation scope, not authorization

- Likely package/runtime: `package.json`, `package-lock.json`, `src/cli.ts`, new `tsconfig.package.json`, new `scripts/clean-package-output.mjs`.
- Root `tsconfig.json`: change only if implementation evidence proves necessary; do not presume it.
- Likely acceptance: new `tests/distributionPackage.test.ts`, `tests/distributionFirstUse.test.ts`, and `tests/helpers/distributionProject.ts`.
- Possible package-only CI: `.github/workflows/ci.yml`.
- Later current-facing docs/evidence: `README.md`, `ARCHITECTURE.md`, `SECURITY.md`, `CHANGELOG.md`, `ROADMAP.md` only when gate truth changes, new `docs/releases/<date>-distribution-first-use-acceptance.md`, and `docs/STATE.md`.
- Not expected: fixture changes, M2-M4 redesign, dependency additions, daemon, scheduler, release platform, M5.

## 9. Evidence and completion gate

- **Changed Files**: T0 control-record reconciliation: this Task Record and `docs/STATE.md`; the specification may change only for the identity-independent T1 prerequisite clarification.
- **Scope Change Records**: `None`
- **Checkpoint Records**: `None`
- **Handoff Records**: `None`
- **Verification Evidence**: This reconciliation changes exactly the three authorized documentation paths. `git diff --check`, PromptKit reference validation (240 Markdown files), changed-file local links (three files), and the execution-control fixture harness (23 isolated contracts) passed. The execution-control validator reports zero Distribution-specific findings and 98 unrelated historical findings (nonzero repository-wide result); those historical findings were not changed. No product tests were run because this is control-record-only reconciliation.
- **Behavior IDs**: `N/A - TDD Enforcement Mode disabled`
- **TDD Intent Register**: `N/A - TDD Enforcement Mode disabled`
- **TDD Execution Evidence**: `N/A - implementation not authorized`
- **TDD Exception Verification**: Documentation/control planning uses link, reference, scope, and diff validation.
- **CI Evidence**: `N/A - no CI change or run authorized`
- **Review Evidence**: Human authority approved the T0 decision values and authorized control-record reconciliation only. T1 still requires separate authorization.
- **Commit Evidence**: One local control-record commit is authorized with message `docs(distribution): reconcile t0 decisions`; its full SHA is available from Git history after creation. Push remains unauthorized.
- **Pull Request Evidence**: `N/A - PR not authorized`
- **Release Evidence**: `N/A - publication and tag changes not authorized`
- **Blocker and Resume Condition**: T0 decision preflight is complete. T1 awaits separate authorization; T2/T6 are blocked on authenticated package identity; T5 awaits a dogfood decision and authority; T6 awaits separate publication authority. The readiness gate remains OPEN.
- **Branch / Revision**: `main`, based on `f293d20715c98d461acae01aa33c527528ca985a`; one local control-record commit is authorized, while push remains unauthorized.
- **Completion State**: `planned`
- **Acceptance Results**: `Not run - implementation not authorized`
- **Changed-File Summary**: `Only authorized control records and, if necessary, T1 prerequisite wording; no package or runtime behavior change.`
- **Completion Exception**: `N/A - planning record remains open for review`
- **Completion Decision and Timestamp**: `N/A - this control reconciliation awaits review; workstream gate remains OPEN`
