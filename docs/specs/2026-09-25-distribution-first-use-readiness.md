# Distribution / First-Use Readiness

- **Author**: Human authority / Codex
- **Status**: In Review
- **Created**: 2026-09-25
- **Target Release**: Unnumbered readiness workstream; no release authorized
- **Task Record**: [Distribution / First-Use Readiness](../tasks/2026-09-25-distribution-first-use-readiness.md)
- **Planning baseline**: `main` at `449f1ad0957e67a3f2e0ee6eea09b68513c1c8f9`

## Planning Record

<a id="PLAN-distribution-first-use-readiness"></a>

### Planning Record Metadata

- **Planning Record ID**: `PLAN-distribution-first-use-readiness`
- **Planning Depth**: `Full`
- **Owner**: Human authority
- **Record Status**: `ready`
- **Local Task Record Link**: [TASK-2026-09-25-distribution-first-use-readiness](../tasks/2026-09-25-distribution-first-use-readiness.md#TASK-2026-09-25-distribution-first-use-readiness)
- **Workflow Links**: `pk:plan`; implementation and publication remain separately gated

### Planning Inputs

- **Requested Outcome**: Make Sureflow installable and usable from a clean supported project without cloning or building the Sureflow repository, while preserving the accepted M1-M4 safety boundary.
- **Observable Completion Condition**: The exact accepted npm tarball is installed in an independent runner, its installed `sureflow` binary completes the accepted and fail-closed first-use paths against a separate target project, an approved external project is dogfooded, and separately authorized registry publication and invocation evidence close the ROADMAP gate.
- **Scope Boundary**: Deterministic npm packaging, installed-bin acceptance, narrow `init` next-step guidance, package-only CI acceptance, external-project dogfood, separately authorized publication, and current-facing closeout evidence. No M5, new mutation capability, autonomous task creation, release automation, or unrelated runtime redesign.
- **TDD Enforcement Proposal (Reference Only)**: `disabled`; the Task Record owns the authoritative value.

### Full Planning

- **Explicit Non-Goals**: Package publication during planning; npm login or ownership claims; version or dist-tag changes; task-authoring wizard; interactive generator; new adapters or mutation semantics; M5; release automation; dependency additions without separately justified evidence; Windows/macOS support claims without installed-package acceptance.
- **Affected Behavioral Components**: npm package metadata and artifact contents; public CLI executable entry; `init` success guidance; package acceptance tests; CI package checks; first-use documentation; release evidence.
- **Externally Visible Contracts**: Package identity and version, `npx <actual-package> --help`, `npx <actual-package> init`, the installed `sureflow` binary, npm tarball contents, and supported-platform claims.
- **Failure or Rollback Considerations**: Wrong namespace authority, stale compiled files, internal-file leakage, missing shebang, checkout-dependent execution, rebuilt-after-acceptance artifacts, incorrect dist-tags, and unsupported-platform claims all fail closed before publication or gate closure. A published npm name/version is immutable; corrections require a new version rather than history rewriting.
- **Verification Approach**: Build once, pack once, inspect the complete tarball, record its hashes, install that exact tarball independently, exercise positive and negative first-use flows, dogfood the same artifact, then publish only that artifact under separately authorized registry operations.

### Assumption Records

No assumptions are used for the selected package identity, version, initial
tag, or initial platform baseline: these were resolved by human decisions in
T0 and the 2026-09-28 identity reconciliation. Dogfood remains deferred, and
publication authority remains reserved for separately authorized T6.

## 1. Problem and authority boundary

Sureflow currently works as a source-built local CLI. A first-time user cannot
yet rely on an accepted registry package and a clean-project `npx` flow. The
ROADMAP therefore keeps Distribution / First-Use readiness OPEN before another
major capability expansion is selected.

This unnumbered readiness workstream is not M5, M4.1, or a capability
milestone. At the original planning baseline, these records identified gated
work without authorizing implementation. Since then, T0 decisions were
reconciled, T1 and T2 were separately authorized and merged, and T3 was
separately authorized and completed. T3 accepted one exact local artifact
bound to source commit `7ea4c748f2c67e533548c7a67b64d1154a0a3794`; it remains
unpublished. This does not authorize T4-T6, publication, tag mutation, dogfood
mutation, or M5. A roadmap requirement or resolved package identity does not
itself grant execution authority.

M1-M4 and the post-M4 remediation remain complete. No M5 is selected.
Publication and every registry/tag mutation require separate explicit human
authorization.

## 2. Current evidence and proposed product boundary

- The planning-baseline repository version was `0.0.0-m1`; T2 has since
  implemented the canonical package as `sureflow@0.1.0`.
- Linux with Node `24.20.0` and npm `11.19.0` is the demonstrated distribution
  baseline.
- T3 accepted the exact `sureflow-0.1.0.tgz` bytes from source commit
  `7ea4c748f2c67e533548c7a67b64d1154a0a3794`, identified by SHA-256
  `5e93ec7873223ac7cc63ecef6f8c30bc892e648bdd58b63826d8df2b1b5bbd08` and
  npm integrity
  `sha512-zPao8mWB0JJIZ0D+g3V9sqs7hdj4ZmgzuaGMTxDHxpSjZ4Fs02OA4M2Wv8Wjez90l/gwX1LpxOxX5vvke0c6lg==`.
  The artifact is preserved locally and has not been published. Full evidence
  is recorded in the Task Record. No npm tag has been mutated; acceptance does
  not establish publication permission.
- The current manifest exposes one `sureflow` binary for `sureflow@0.1.0`.
  T1 added the Node shebang to the compiled CLI and is complete/merged; T2
  separately established package identity/version metadata and the bounded
  package allowlist.
- Runtime source currently appears to require only Node built-ins and local
  compiled modules; no runtime dependency addition is presently justified.
- The planning-baseline package preview was unbounded: 1,078 entries, including
  repository-internal source, tests, fixtures, PromptKit material, and stale
  compiled output. T1 provides deterministic production compilation and
  stale-output cleanup. T3 exact-artifact acceptance is complete: the
  recorded tarball passed complete inventory/safety inspection, exact-source
  binding, offline installation, and installed-bin smoke. The local artifact
  remains unpublished; full independent first-use project flows belong to T4.
- Windows and macOS are not accepted package platforms until installed-package
  acceptance passes there.

Implementation should remain platform-neutral, but this workstream does not
make a multi-OS acceptance matrix mandatory without separate product policy.

## 3. Package identity, version, and tag decisions

<a id="DECISION-distribution-first-use-readiness-001"></a>

### Decision Record: `DECISION-distribution-first-use-readiness-001`

- **Decision ID**: `DECISION-distribution-first-use-readiness-001`
- **Decision Statement**: Select Sureflow's intended npm package identity based on the authenticated read-only preflight and explicit human decision.
- **Considered Options**: Preferred unscoped `sureflow` package with `sureflow` binary; fallback `@lowqualityloey/sureflow` package with the same binary.
- **Selected Option(s)**: `sureflow` package identity with the existing `sureflow` binary; selected by human authority after the read-only preflight.
- **Rejected Option(s)**: `None`; registry 404 is not ownership evidence.
- **Material Claim Links**: [CLAIM-DECISION-distribution-first-use-readiness-001-001](#CLAIM-DECISION-distribution-first-use-readiness-001-001)
- **Remaining Uncertainty**: None for the intended package identity. Registry availability and future publication rights remain unguaranteed.
- **Decision Owner**: Human authority
- **Status**: `approved`
- **Version Selection Context**: `Not applicable - identity decision only`
- **AI Recommendation**: `Not applicable - preferred/fallback order is human-provided`
- **Selected Exact Version(s)**: `Not applicable - identity decision only`
- **Release Channel**: `Not applicable - identity decision only`
- **Support/Lifecycle Status**: `Not applicable - identity decision only`
- **Compatibility Constraints**: The chosen package must expose exactly one `sureflow` binary and support the accepted Node/npm baseline.
- **Version Rationale**: `Not applicable - identity decision only`
- **Exact-Version Evidence**: `Not applicable - identity decision only`
- **Existing Version Baseline**: Repository package version `0.0.0-m1`; unchanged by planning.
- **Decision Owner Approval or Accepted Assumption**: Human authority selected `sureflow` on 2026-09-28 following authenticated read-only preflight. `npm whoami` returned `lowqualityloey` at `https://registry.npmjs.org/`; both `sureflow` and `@lowqualityloey/sureflow` returned E404. These observations do not reserve the name or guarantee publication rights.
- **pk:spike or ADR Link**: `None`

<a id="CLAIM-DECISION-distribution-first-use-readiness-001-001"></a>

### Material Claim Record: `CLAIM-DECISION-distribution-first-use-readiness-001-001`

- **Claim ID**: `CLAIM-DECISION-distribution-first-use-readiness-001-001`
- **Decision Link**: [DECISION-distribution-first-use-readiness-001](#DECISION-distribution-first-use-readiness-001)
- **Material Claim**: An npm scope is associated with a user or organization namespace; registry absence alone does not establish this project's publication authority.
- **Citation or Uncertainty Link**: [CITATION-DECISION-distribution-first-use-readiness-001-001](#CITATION-DECISION-distribution-first-use-readiness-001-001) and [UNCERTAINTY-DECISION-distribution-first-use-readiness-001-001](#UNCERTAINTY-DECISION-distribution-first-use-readiness-001-001)

<a id="CITATION-DECISION-distribution-first-use-readiness-001-001"></a>

### Citation Record: `CITATION-DECISION-distribution-first-use-readiness-001-001`

- **Citation ID**: `CITATION-DECISION-distribution-first-use-readiness-001-001`
- **Publisher**: npm, Inc.
- **Document Title**: About scopes
- **Canonical URL**: <https://docs.npmjs.com/about-scopes/>
- **Access Date**: 2026-09-25
- **Supported Claim Link**: [CLAIM-DECISION-distribution-first-use-readiness-001-001](#CLAIM-DECISION-distribution-first-use-readiness-001-001)
- **Citation Status**: `verified`

<a id="UNCERTAINTY-DECISION-distribution-first-use-readiness-001-001"></a>

### Uncertainty Record: `UNCERTAINTY-DECISION-distribution-first-use-readiness-001-001`

- **Uncertainty ID**: `UNCERTAINTY-DECISION-distribution-first-use-readiness-001-001`
- **Affected Claim or Context**: Which preferred/fallback identity to select for repository metadata and later acceptance.
- **Impact**: The public command, manifest name, lockfile root metadata, and release evidence depend on the selected identity.
- **Resolution Action**: `Human authority selected the preferred unscoped identity after authenticated read-only preflight`
- **Decision Owner**: Human authority
- **Status**: `resolved`
- **Supporting Evidence**: Human-controlled read-only preflight on 2026-09-28: `npm whoami` returned `lowqualityloey` at `https://registry.npmjs.org/`; `sureflow` and `@lowqualityloey/sureflow` each returned E404. This evidence does not reserve the package name or guarantee future publication rights; publication remains separately authorized T6 work.

<a id="DECISION-distribution-first-use-readiness-002"></a>

### Decision Record: `DECISION-distribution-first-use-readiness-002`

- **Decision ID**: `DECISION-distribution-first-use-readiness-002`
- **Decision Statement**: Approve a first distributable version and staged dist-tag policy.
- **Considered Options**: Publish the first accepted `0.1.0` artifact under the non-default validation tag `next`, then separately authorize promotion of that exact accepted version to `latest`; or another human-approved version/tag sequence.
- **Selected Option(s)**: First planned public version `0.1.0`; initial publication tag `next`; promotion of the exact accepted version to `latest` requires another explicit authorization.
- **Rejected Option(s)**: Direct unverified publication to `latest`; rebuilding between acceptance and publication.
- **Material Claim Links**: [CLAIM-DECISION-distribution-first-use-readiness-002-001](#CLAIM-DECISION-distribution-first-use-readiness-002-001)
- **Remaining Uncertainty**: [UNCERTAINTY-DECISION-distribution-first-use-readiness-002-001](#UNCERTAINTY-DECISION-distribution-first-use-readiness-002-001)
- **Decision Owner**: Human authority
- **Status**: `approved`
- **Version Selection Context**: `Existing project`
- **AI Recommendation**: `Not applicable - version and tag policy selected by human authority`
- **Selected Exact Version(s)**: `0.1.0` (planned; not published)
- **Release Channel**: Experimental pre-1.0; initial publication uses `next` only under separate T6 authorization. After publication, prove version-qualified registry invocation; promotion of that exact accepted version to `latest` requires another explicit authorization. Document unversioned `npx` only after `latest` behavior is proven.
- **Support/Lifecycle Status**: Experimental pre-1.0 package; no stability guarantee beyond accepted contracts.
- **Compatibility Constraints**: Node `^24.0.0`, npm `>=11`, Git, and the documented supported project shapes.
- **Version Rationale**: `0.1.0` communicates a first distributable experimental package without claiming 1.0 stability.
- **Exact-Version Evidence**: Human authority approved planned version `0.1.0` in T0 on 2026-09-26. T2 was subsequently separately authorized and merged; the current package metadata is `sureflow@0.1.0`. No publication has occurred.
- **Existing Version Baseline**: `0.0.0-m1` at the original planning baseline; T0 made no planning-time metadata change.
- **Decision Owner Approval or Accepted Assumption**: Human authority approved `0.1.0`, initial `next`, and separately authorized later promotion to `latest` in T0. Publication and promotion remain separately authorized T6 operations.
- **pk:spike or ADR Link**: `None`

<a id="CLAIM-DECISION-distribution-first-use-readiness-002-001"></a>

### Material Claim Record: `CLAIM-DECISION-distribution-first-use-readiness-002-001`

- **Claim ID**: `CLAIM-DECISION-distribution-first-use-readiness-002-001`
- **Decision Link**: [DECISION-distribution-first-use-readiness-002](#DECISION-distribution-first-use-readiness-002)
- **Material Claim**: npm can publish an exact tarball, so the artifact accepted locally can be the artifact later submitted under separate publication authority.
- **Citation or Uncertainty Link**: [CITATION-DECISION-distribution-first-use-readiness-002-001](#CITATION-DECISION-distribution-first-use-readiness-002-001)

<a id="CITATION-DECISION-distribution-first-use-readiness-002-001"></a>

### Citation Record: `CITATION-DECISION-distribution-first-use-readiness-002-001`

- **Citation ID**: `CITATION-DECISION-distribution-first-use-readiness-002-001`
- **Publisher**: npm, Inc.
- **Document Title**: npm-publish
- **Canonical URL**: <https://docs.npmjs.com/cli/v11/commands/npm-publish/>
- **Access Date**: 2026-09-25
- **Supported Claim Link**: [CLAIM-DECISION-distribution-first-use-readiness-002-001](#CLAIM-DECISION-distribution-first-use-readiness-002-001)
- **Citation Status**: `verified`

<a id="UNCERTAINTY-DECISION-distribution-first-use-readiness-002-001"></a>

### Uncertainty Record: `UNCERTAINTY-DECISION-distribution-first-use-readiness-002-001`

- **Uncertainty ID**: `UNCERTAINTY-DECISION-distribution-first-use-readiness-002-001`
- **Affected Claim or Context**: Whether the selected version/tag workflow has been verified against a published artifact and whether `latest` may be promoted.
- **Impact**: Registry behavior and unversioned `npx` guidance cannot be claimed until separately authorized publication and registry proofs exist.
- **Resolution Action**: `Record the approved version and staged tag policy; retain publication and promotion as separate authorization gates`
- **Decision Owner**: Human authority
- **Status**: `resolved`
- **Supporting Evidence**: Human T0 approval recorded 2026-09-26: planned version `0.1.0`, initial tag `next`, and separate authorization required to promote the exact accepted version to `latest`. No registry mutation is authorized by this decision record; document unversioned `npx` only after `latest` behavior is proven.

## 4. Deterministic package architecture

```text
completed, merged T1 deterministic build/bin contract
  -> human-selected package identity (`sureflow`)
  -> completed, merged T2 identity/version manifest and package allowlist
  -> clean final package output + package-only TypeScript compilation
  -> completed T3 exact-tarball acceptance
  -> complete tarball inspection + SHA-256/integrity capture
  -> exact tarball installed in independent runner; installed-bin smoke passed
  -> separately authorized T4 first-use acceptance + fail-closed project flows
  -> approved external-project dogfood
  -> separate publication authorization
  -> publish exact accepted tarball under validation tag
  -> version-qualified registry proof
  -> separate latest-tag promotion authorization
  -> unversioned proof when documented
```

### Package build contract

- Ship prebuilt JavaScript; users do not need TypeScript or Sureflow development dependencies.
- Add a Node shebang to the public CLI entry.
- Clean package output before compilation; stale compiled modules are prohibited.
- Evaluate a new `tsconfig.package.json` before any root `tsconfig.json` change.
- Prefer `prepack` over consumer-install build hooks.
- Use a positive `package.json.files` allowlist.
- Do not depend on the Sureflow source checkout, its `node_modules`, repository
  symlinks, or implicit checkout `PATH` access.
- No runtime dependency addition currently appears necessary. Any discovered
  need requires separate justification and scope authorization.

Expected exclusions are `.promptkit/**`, `.github/**`, `src/**`, `tests/**`,
`fixtures/**`, `docs/tasks/**`, `.sureflow/**`, coverage, logs,
credentials/secrets, and repository-only configuration. Normal npm inclusion
of README, license, and package metadata is permitted.

## 5. Locked distribution invariants

> The artifact that passes package acceptance is the artifact that may later be published.

- Record the accepted tarball path/name, SHA-256, and npm integrity metadata
  where available.
- T3 accepted `sureflow-0.1.0.tgz`, bound to source commit
  `7ea4c748f2c67e533548c7a67b64d1154a0a3794`, SHA-256
  `5e93ec7873223ac7cc63ecef6f8c30bc892e648bdd58b63826d8df2b1b5bbd08`, and
  npm integrity
  `sha512-zPao8mWB0JJIZ0D+g3V9sqs7hdj4ZmgzuaGMTxDHxpSjZ4Fs02OA4M2Wv8Wjez90l/gwX1LpxOxX5vvke0c6lg==`.
- Do not rebuild after acceptance and before publication.
- Publication must consume the exact accepted `.tgz`.
- Any rebuild invalidates acceptance and requires complete re-verification.
- Package acceptance must use a real installed package, never
  `node /sureflow/repo/dist/src/cli.js` or an equivalent checkout path.
- Successful package acceptance proves eligibility only. It does not authorize
  npm login, publication, dist-tag mutation, or gate closure.
- `latest` promotion is a separate registry decision after version-qualified
  validation under the approved non-default tag.

## 6. Installed-package and first-use acceptance

The required artifact path is:

```text
deterministic package build
  -> npm pack
  -> complete tarball inspection
  -> install exact tarball in independent runner
  -> invoke installed .bin
  -> operate on separate target project
```

From that independent supported project, exercise:

```text
--help -> init -> task creation -> preflight -> run -> status -> verify
```

Positive acceptance proves the correct target working directory, read-only
preflight, exact declared mutation set, accepted run, truthful status, passing
verification, and evidence produced from the target project.

Negative acceptance includes an invalid task and/or stale preimage and proves a
fail-closed exit, zero target mutation, no undeclared path, and no false
successful-run evidence.

The narrow `init` usability change may tell users to create
`.sureflow/task.json`, run `sureflow preflight <taskId>`, and run only after an
eligible preflight. A task-authoring wizard, interactive generator, autonomous
task creation, and broader mutation capabilities are excluded.

## 7. Independent real-project dogfood

Before publication, an explicitly approved project outside this repository and
its fixtures must use the exact accepted tarball. Record its baseline commit,
detected shape, schema-v2 two-target accepted change, fail-closed case, target
set, verification commands, observed changed set, and limitations.

The project remains a human decision. This plan does not select or authorize
mutation of another repository.

## 8. CI boundary

A future implementation may add a package-acceptance command such as
`npm run test:distribution`. It must pack, inspect, install, and execute without
npm authentication, publication, or registry mutation. Release automation is
out of scope unless separately selected later.

## 9. Failure-mode analysis

| Failure scenario | Detection | Required response |
| :--- | :--- | :--- |
| Selected package name is unavailable or publication permission is absent | T2 metadata checks and separately authorized T6 publication preflight | STOP before unauthorized metadata or registry mutation; E404 is not a reservation or permission guarantee |
| Version or tag policy is unapproved | T0 decision checklist | STOP before artifact build/publication |
| Stale compiled module survives | Exact source-to-tarball runtime inventory | Reject artifact; clean and rebuild, then restart acceptance |
| Internal or credential material is packed | Complete tarball allowlist and secret scan | Reject artifact; never publish |
| CLI lacks executable contract | Installed `.bin` `--help` smoke test and shebang inspection | Reject artifact |
| Package resolves checkout state | Isolated runner/cache, separate target, module-path assertions | Reject artifact |
| Accepted artifact is rebuilt | Recorded tarball SHA-256/integrity mismatch | Invalidate acceptance and re-run all artifact gates |
| Target project is mutated during a negative case | Git-visible scope and byte comparisons | Fail acceptance; preserve evidence for diagnosis |
| Unsupported platform is claimed | Compare documentation claim with installed-package matrix | Keep claim limited to demonstrated baseline |
| Publication or tag mutation lacks authorization | Task Record and human approval gate | STOP without registry mutation |

## 10. Dependency-ordered work breakdown

- **T0 - Distribution decision preflight**: Complete. Human authority selected
  `sureflow` after the authenticated read-only check; this does not establish
  reservation or future publication rights. T2 was later separately
  authorized and merged. Dogfood selection is required before T5; separate
  publication authority is required before T6. Do not publish.
- **T1 - Deterministic package/bin contract**: Complete and merged. T1
  established the identity-independent package-specific clean build, public
  CLI shebang, required compiled runtime, and stale-output prevention without
  changing package name/version/tags, `package.json`, or `package-lock.json`.
- **T2 - Bounded package manifest**: Complete and merged at
  `ce305af119d68ecea12e1825ee4cbad9d1f0e817`; it established
  `sureflow@0.1.0`, the positive `dist/src` allowlist, and lockfile root
  synchronization without adding a dependency.
- **T3 - Exact-tarball acceptance**: Complete. The CLI installed-`.bin`
  checkout-resolution defect was repaired in the human-authorized `src/cli.ts`
  scope expansion. The exact artifact accepted from committed source
  `7ea4c748f2c67e533548c7a67b64d1154a0a3794` is recorded in the Task Record.
  Its independent install and installed-bin help/unknown-command smoke passed.
  This did not exercise T4's full first-use project flows and did not publish
  the package.
- **T4 - Independent first-use acceptance**: Run help/init, the schema-v2
  accepted flow, fail-closed flow, and target-root checks using the exact
  accepted installed tarball. Not started; separate authorization required.
- **T5 - Dogfood and release-readiness reconciliation**: Exercise the approved
  independent project and prepare current-facing documentation and release
  evidence. Do not publish.
- **T6 - Separately authorized publication and registry proof**: Only after
  explicit publication authority, publish the exact accepted tarball, prove
  version-qualified invocation, obtain separate tag-promotion authority, prove
  unversioned invocation when documented, and close the ROADMAP gate only when
  all evidence exists.

Completion of one task never authorizes the next. T6 is never implicitly
authorized by T1-T5.

## 11. Likely implementation scope, not authorization

Likely package/runtime paths:

- `package.json`
- `package-lock.json`
- `src/cli.ts`
- `tsconfig.package.json` - new
- `scripts/clean-package-output.mjs` - new

Root `tsconfig.json` is change-only-if-proven-necessary and is not presumed.

Likely acceptance paths:

- `tests/distributionPackage.test.ts` - new
- `tests/distributionFirstUse.test.ts` - new
- `tests/helpers/distributionProject.ts` - new

Possible CI path:

- `.github/workflows/ci.yml`

Later current-facing documentation/evidence paths:

- `README.md`
- `ARCHITECTURE.md`
- `SECURITY.md`
- `CHANGELOG.md`
- `ROADMAP.md` only when the gate status truth changes
- `docs/releases/<date>-distribution-first-use-acceptance.md` - new
- `docs/STATE.md`

No fixture change, M2-M4 runtime redesign, dependency addition, daemon,
scheduler, or release platform is presently expected. None of these likely
paths is authorized by this planning record.

## 12. Open human decisions and readiness gate

T0 records decision state and downstream prerequisites; it does not require all
later-task decisions or external authority to be consumed immediately. The
intended package identity `sureflow` is selected based on a human-controlled
authenticated read-only preflight, but E404 and account identity do not reserve
the name or guarantee publication rights. T1 and T2 are complete and merged;
the canonical package is `sureflow@0.1.0`. T3 is complete: one exact local
artifact is accepted and bound to committed source
`7ea4c748f2c67e533548c7a67b64d1154a0a3794`; it remains unpublished. T4 is not
started and requires separate authorization; T5 and T6 remain unauthorized.
Dogfood selection and mutation authority are required before T5. Publication
authority is separately required before T6. Completion of T3 does not
implicitly authorize later tasks.

The Distribution / First-Use gate remains OPEN until the accepted exact
artifact, installed-package flows, dogfood, separately authorized publication,
registry proofs, and truthful current-facing documentation all exist. No M5 is
selected or authorized by this record.
