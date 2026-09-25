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
- **Owner / Actor**: Human authority owns every execution and publication decision; Codex is authorized only to create these planning/control records.
- **Execution Scope**: Exactly `docs/specs/2026-09-25-distribution-first-use-readiness.md`, this Task Record, and `docs/STATE.md` at baseline `main` / `449f1ad0957e67a3f2e0ee6eea09b68513c1c8f9`.
- **Approval Boundary**: The original authorization covered planning/control records only. Human authority accepted those records and now authorizes exactly one local commit of these three paths with message `docs(distribution): plan first-use readiness`. Push, T0, package implementation, npm authentication or ownership claim, version/tag change, source/test/CI/README change, publication, release automation, and M5 remain unauthorized.
- **Created**: 2026-09-25

## 2. Objective and boundaries

- **Objective**: Define an implementation-ready, fail-closed path that can close the ROADMAP's OPEN Distribution / First-Use gate without expanding the accepted M1-M4 product boundary or treating planning as execution authority.
- **In Scope**:
  - The specification, this canonical Task Record, and minimal STATE projection.
  - Preferred/fallback package-identity decision process.
  - Proposed version/tag sequence, deterministic package contract, exact-artifact invariant, installed-package acceptance, first-use acceptance, dogfood requirement, package-only CI boundary, and T0-T6 gates.
- **Explicit Non-Goals**:
  - Any implementation or modification outside the three planning/control paths.
  - Final package identity, npm authentication, name claiming, package/version/tag mutation, publication, or release automation.
  - Task-authoring wizard, interactive generator, autonomous task creation, new mutation capability, adapter expansion, M5, or another milestone.
  - Rewriting M1-M4 history or changing their accepted behavior.
- **Dependencies**: M1-M4 and post-M4 remediation complete; ROADMAP Distribution / First-Use gate OPEN; Node 24/npm 11/Linux evidence baseline; required human decisions listed in T0.
- **Risk**: `High` - this work eventually changes a public executable/package contract and may perform irreversible registry operations. Gated tasks, exact-artifact identity, independent acceptance, and separate publication/tag authority mitigate the risk.
- **Verification Condition**: For this planning authorization, exactly the three authorized paths differ; Markdown references and local links resolve; `git diff --check` passes; no package/source/test/CI metadata changes; M1-M4 remain complete; gate remains OPEN; M5 and publication remain unauthorized.

## 3. Gated dependency-ordered task breakdown

- [ ] **T0 - Distribution decision preflight**: Authenticated npm identity/permission, final package name, approved version, initial dist-tag policy, initial support claim, and authorized dogfood project. STOP while any decision is unresolved. No login, claim, metadata mutation, or publication is currently authorized.
- [ ] **T1 - Deterministic package/bin contract**: Package-specific clean build, public CLI shebang, required compiled runtime, and stale-output prevention. Exact paths require separate authorization.
- [ ] **T2 - Bounded package manifest**: Approved identity/version, metadata, positive package-content allowlist, and lockfile synchronization; no dependency additions without separate justification and authority.
- [ ] **T3 - Exact-tarball acceptance**: `npm pack`, complete content inspection, hash/integrity capture, exact-tarball installation, and installed-bin smoke tests.
- [ ] **T4 - Independent first-use acceptance**: Installed-tarball help/init, schema-v2 accepted flow, fail-closed flow, and target-root correctness.
- [ ] **T5 - Dogfood and release-readiness reconciliation**: Approved external-project dogfood and current-facing documentation/evidence preparation; no publication.
- [ ] **T6 - Separately authorized publication and registry proof**: Publish only the exact accepted tarball after explicit authority; prove version-qualified invocation; separately authorize tag promotion; prove unversioned invocation if documented; reconcile the ROADMAP gate only after complete evidence.

Each task needs separate explicit scope/authority. Completion of one task never
authorizes the next, and T6 is not implicitly authorized by T1-T5.

## 4. Acceptance criteria

- [ ] **AC-1 - Authority and decisions**: T0 records authenticated package permission and explicit human decisions for identity, version, dist-tags, platform claim, dogfood project, and publication boundary before implementation metadata changes.
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
- **Stop Conditions**: Unresolved T0 decision; unexpected baseline/scope; required path not authorized; dependency addition without justification; stale or leaking artifact; checkout-dependent execution; unsupported platform claim; artifact rebuild after acceptance; missing publication/tag authority; failed gate requiring broader scope; any M5 work.
- **Host Timer Capability**: Live host timing and forced termination are unavailable; checkpoints are manual.

## 6. State and active ownership

- **Execution State**: `planned`
- **Mapped `pk:tasks` Status**: `To Do`
- **Active Task Pointer**: `None`
- **Start Time**: `N/A - implementation has not started`
- **Current Actor**: Human authority / Codex - planning records only
- **Next Action**: After this authorized local commit, await separate human authorization for T0. Do not start T0 or implementation now.

### Transition history

| Previous State | New State | Timestamp | Actor | Reason | Supporting Evidence |
| :--- | :--- | :--- | :--- | :--- | :--- |
| N/A | planned | 2026-09-25 | Human authority / Codex | Read-only investigation accepted and exact three-file planning/control scope authorized; implementation and publication remain unauthorized. | [Planning specification](../specs/2026-09-25-distribution-first-use-readiness.md) |

## 7. Open human decisions

1. Authenticated npm identity and final package name: preferred `sureflow` if legitimately publishable; fallback `@lowqualityloey/sureflow`.
2. Approval of proposed `0.1.0` or another first distributable version.
3. Initial non-default validation tag and later promotion policy.
4. Initial supported-platform claim; current demonstrated baseline is Linux / Node 24 / npm 11.
5. Independent external dogfood project and mutation authority.
6. Separate publication authority and later registry/tag authority.

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

- **Changed Files**: Planning authorization only: specification, this Task Record, and `docs/STATE.md`.
- **Scope Change Records**: `None`
- **Checkpoint Records**: `None`
- **Handoff Records**: `None`
- **Verification Evidence**: Exact three-path scope and `git diff --check` passed. PromptKit reference validation passed for 240 Markdown files; local-link validation passed for all three changed planning/control files. The execution-control validator reports zero findings for this Task Record/specification/STATE projection and retains exactly 98 unrelated historical findings. The read-only execution-control fixture harness passed its regression and 23 isolated contracts. No product-test or implementation evidence is claimed or required for this planning-only authorization.
- **Behavior IDs**: `N/A - TDD Enforcement Mode disabled`
- **TDD Intent Register**: `N/A - TDD Enforcement Mode disabled`
- **TDD Execution Evidence**: `N/A - implementation not authorized`
- **TDD Exception Verification**: Documentation/control planning uses link, reference, scope, and diff validation.
- **CI Evidence**: `N/A - no CI change or run authorized`
- **Review Evidence**: Human authority accepted the planning records and authorized one local commit of exactly the three paths listed in this record.
- **Commit Evidence**: One local commit is authorized with message `docs(distribution): plan first-use readiness`; its full SHA will be available from Git history. Push remains unauthorized.
- **Pull Request Evidence**: `N/A - PR not authorized`
- **Release Evidence**: `N/A - publication and tag changes not authorized`
- **Blocker and Resume Condition**: T0 and every implementation/publication task require separate explicit human scope/authority. The six human decisions remain open.
- **Branch / Revision**: `main`, based on planning baseline `449f1ad0957e67a3f2e0ee6eea09b68513c1c8f9`; the authorized planning commit's SHA is available from Git history. No push is authorized.
- **Completion State**: `planned`
- **Acceptance Results**: `Not run - implementation not authorized`
- **Changed-File Summary**: `Exactly three planning/control records; no package or runtime behavior change.`
- **Completion Exception**: `N/A - planning record remains open for review`
- **Completion Decision and Timestamp**: `N/A - workstream gate remains OPEN`
