# M2 — Real Project Change Gate

- **Author**: Human authority and Codex
- **Status**: Planning Baseline Approved — contract clarification complete; implementation unauthorized
- **Created**: 2026-09-21
- **Target Release**: M2

---

## Planning Record

<a id="PLAN-m2-real-project-change-gate"></a>

### Planning Record Metadata

- **Planning Record ID**: `PLAN-m2-real-project-change-gate`
- **Planning Depth**: `Full`
- **Owner**: Human authority
- **Record Status**: `approved` — planning baseline approved with contract clarification complete; not implementation authorization
- **Local Task Record Link**: [TASK-2026-09-21-m2-real-project-change-gate](../tasks/2026-09-21-m2-real-project-change-gate.md#TASK-2026-09-21-m2-real-project-change-gate)
- **Workflow Links**: `pk:plan`; `pk:tasks`

### Planning Inputs

- **Requested Outcome**: Prove Sureflow can safely control and deterministically verify one useful bounded code change in an independent realistic Node/TypeScript project.
- **Observable Completion Condition**: From a clean independent fixture repository, Sureflow detects a supported project, validates a control-plane-owned task contract into one immutable execution-plan snapshot, applies only its declared existing-file replacement, runs every required closed verification check, records complete change evidence, and reaches `accepted`; every specified negative path deterministically halts or returns non-PASS.
- **Scope Boundary**: One worker, one local Git worktree, one Node/TypeScript+npm adapter, one task, one declared existing-file replacement, and a closed verification profile. No remote effects or generalized orchestration.
- **TDD Enforcement Proposal**: `disabled` — implementation remains separately gated; this record authorizes planning only.

### Full Planning Inputs

- **Explicit Non-Goals**: Multi-agent execution; schedulers, queues, or daemons; MCP; model/provider routing; skill marketplace/runtime; context engine; arbitrary shell; Tauri/Rust; deployment; Git commit/push/merge automation; remote issue tracking; cloud infrastructure; npm publication; UI/dashboard; generalized approval delivery; automatic rollback.
- **Affected Behavioral Components**: Project detection, task-contract authority/parsing/snapshotting, policy evaluation inputs, bounded file mutation, verification dispatch, change-scope inspection, evidence interpretation, run/verify orchestration, CLI wording, and the independent acceptance fixture.
- **Externally Visible Contracts**: Control-plane-owned `.sureflow/task.json`; `sureflow run <taskId>` and `sureflow verify <taskId>` behavior; Node/TypeScript project-support rules; closed verification profile and results; deterministic evidence requirements.
- **Failure or Rollback Considerations**: Validation, policy, project, profile, baseline, stale-preimage, and path failures occur before writes. A verification or post-write scope failure leaves the bounded local change in place for inspection, records non-PASS evidence, and halts. M2 does not claim transactional repository rollback or OS sandboxing.
- **Verification Approach**: Focused unit tests per contract/module, deterministic negative-path tests, an end-to-end temporary Git copy of the independent acceptance project, the full Sureflow suite, typecheck, lint, build, diff checks, and existing harness/hygiene gates.

### Assumption Records

None. The user supplied the objective, constraints, required capabilities, non-goals, stop conditions, and acceptance direction. The eight clarified design decisions are approved for the M2 planning baseline; implementation remains subject to separate task authorization.

### Technology and Vendor Decision Records

None. M2 preserves the accepted Node 24, TypeScript, npm, Git, Vitest, and local filesystem baseline; it adopts no new external technology, service, dependency, or version.

---

## 1. Executive Summary and Baseline

M1 proves a fixed T0 task gate. M1.1 hardens runtime containment, atomic state writes, mutation exclusion, event corruption surfacing, and source-use truth. The accepted baseline is `0a1c503fb8a0bc5399b5a28c1cbb2418ab6c8108`.

M2 replaces the T0-only assumption at the input and project seams while preserving the accepted authority model. A human/control-plane-supplied task contract declares one candidate existing-file replacement, including the replacement bytes. Sureflow validates that input into an immutable execution-plan snapshot, decides eligibility, confines the write, runs a closed project adapter, inspects actual repository changes, writes redacted terminal evidence, and derives the verdict from evidence only.

### Accepted M1/M1.1 Boundaries Observed

- `decidePolicy()` is pure, default-deny, and separate from verification.
- `.sureflow/state/` is the only authoritative task-state namespace.
- Evidence and events are append-only, redacted before persistence, and non-authoritative.
- `verifyEvidence()` positively proves PASS and maps missing, corrupt, duplicate, or ambiguous evidence to UNKNOWN.
- `resolveWorkerPath()` rejects absolute paths, traversal, normalized escape, and symlink escape.
- `execution.lock` excludes concurrent init/run/verify mutation.
- CLI exit `0` means accepted/pass; exit `2` means controlled halt/failure.
- T0 coupling is concentrated in `t0Fixture.ts`, `runTask.ts`, `verifyTask.ts`, and the single `npm test` dispatch.

---

## 2. Goals and Explicit Non-Goals

### Goals

1. Detect one supported Node/TypeScript+npm Git project from repository evidence.
2. Parse one exact, machine-native, control-plane-owned task contract without accepting worker-controlled authority, executable, argv, shell, environment-command, provider, approval, or remote-operation fields.
3. Apply one declared replacement to an existing tracked source file only after policy, containment, clean-baseline, and preimage checks pass.
4. Resolve and run a canonical subset of `typecheck`, `test`, `lint`, and `build` through one closed adapter.
5. Prove changed-file scope and required verification from persisted evidence; model claims never affect verdicts.
6. Demonstrate the full flow in an independent realistic project, then demonstrate every required negative path.

### Non-Goals

The explicit non-goals in the Planning Record are binding. In addition:

- No project-adapter registry, plugin loader, dependency-injection container, workflow DSL, or generic command runner.
- No file creation, deletion, rename, binary mutation, directory-wide permission, glob authorization, or multi-project transaction in M2.
- No automatic dependency installation inside `sureflow run`; acceptance setup may run fixture-local `npm ci` before Sureflow executes.
- No claim that `shell: false` sandboxes npm lifecycle scripts. M2 trusts the selected local repository and constrains only Sureflow's dispatch interface and post-run scope evidence.
- No automatic cleanup or rollback after a post-write failure; the task halts with the bounded working-tree change available for human inspection.
- No OS/filesystem sandbox over ignored dependency, build, or Sureflow-runtime artifacts. M2's objectively enforced mutation scope is Git-visible tracked and non-ignored untracked project paths; broader ignored-file enforcement is deferred.
- No worker/reasoner proposal ingress in M2. Replacement bytes are supplied directly by trusted task/control-plane input, so M2 proves deterministic bounded change application rather than model/provider integration.

---

## 3. Approved M2 Planning Decisions

1. **Supported project floor**: a clean local Git worktree with `package.json`, `package-lock.json`, `tsconfig.json`, and every requested npm script.
2. **Adapter floor**: one literal adapter ID, `node-typescript/npm-scripts-v1`; no registry or dynamic loading.
3. **Mutation floor**: one existing tracked UTF-8 text file replaced atomically, guarded by its SHA-256 preimage.
4. **Verification floor**: canonical order `typecheck`, `test`, `lint`, `build`, filtered to the contract's non-empty required set.
5. **Scope oracle**: fixed read-only Git status/track checks with shell disabled; any changed path outside the contract's exact allowed paths halts.
6. **Failure recovery**: pre-write failures change no project file; post-write verification/scope failures preserve the bounded change and halt.
7. **Compatibility**: one generalized orchestrator consumes a resolved execution plan. The T0 entry point may remain as a thin compatibility adapter; no second orchestration framework is permitted.
8. **Replacement origin**: replacement bytes come from the validated control-plane task contract, not worker output; a future `ReplacementProposal` seam is deferred with model/provider integration.

---

## 4. Architecture and System Context

```text
.sureflow/task.json (control-plane input)
        |
        v
strict parser + hash -----> immutable execution-plan snapshot
        |                                  |
        v                                  v
policy authority                 authorized replacement bytes
        |                                  |
        v                                  v
Node/TS detector -----> npm profile resolver -----> resolved execution plan
        |                                             |
        v                                             v
clean Git baseline + tracked preimage -----> bounded atomic replacement
                                                      |
                                                      v
                              fixed verification dispatch (canonical order)
                                                      |
                                                      v
                          Git scope inspection + append-only evidence/events
                                                      |
                                                      v
                                  pure aggregate verification -> state/CLI
```

### Deep Modules and Seams

| Module / seam | Public boundary | Complexity it owns |
| :--- | :--- | :--- |
| **Task contract** | `loadValidatedExecutionPlan()` | Control-plane ownership, exact fields, enum validation, path normalization, duplicate rejection, byte digest, immutable run snapshot |
| **Node project adapter** | `detectProject()`, `resolveVerificationPlan()`, `runVerificationPlan()` | Repository evidence, npm script support, fixed argv, canonical check ordering, result mapping |
| **Bounded change writer** | `applyDeclaredReplacement(plan)` | Snapshot-owned target/content, preimage hash, existing-file rule, containment, policy decision, atomic replacement, before/after digest |
| **Git scope inspector** | `captureProjectScope()` | Clean baseline, tracked-path proof, post-run changed paths, unauthorized-path classification |
| **Execution orchestrator** | `runProjectTask()` | Lock, policy order, state transitions, event/evidence order, halt semantics; no stack-specific branching beyond adapter resolution |
| **Aggregate verifier** | `verifyProjectChange()` | Current contract digest, exact changed paths, scope result, required check results, duplicate/corrupt/stale evidence |

The adapter is a single deep module, not an extensibility framework. Core orchestration receives resolved data and does not inspect `package.json` or construct npm commands.

---

## 5. Exact New Contracts and Interfaces

Names are proposed and may change only through plan review or a recorded scope change. The semantics are binding.

```ts
export const REAL_PROJECT_TASK_SCHEMA_VERSION = 1 as const;
export const NODE_TYPESCRIPT_NPM_PROFILE = "node-typescript/npm-scripts-v1" as const;

export type RealProjectCapability =
  | "repo.read"
  | "repo.write"
  | "repo.verify";

export type VerificationCheck =
  | "typecheck"
  | "test"
  | "lint"
  | "build";

export interface DeclaredReplacement {
  readonly kind: "replace-file";
  readonly path: string;                 // normalized repository-relative path
  readonly expectedBeforeSha256: string; // exactly 64 lowercase hex characters
  readonly content: string;              // exact control-plane-supplied replacement bytes as UTF-8 text
}

export interface RealProjectTaskContract {
  readonly schemaVersion: typeof REAL_PROJECT_TASK_SCHEMA_VERSION;
  readonly taskId: string;
  readonly objective: string;
  readonly adapter: typeof NODE_TYPESCRIPT_NPM_PROFILE;
  readonly permittedCapabilities: readonly RealProjectCapability[];
  readonly allowedPaths: readonly string[];
  readonly change: DeclaredReplacement;
  readonly requiredVerification: readonly VerificationCheck[];
  readonly acceptance: {
    readonly expectedChangedPaths: readonly string[];
    readonly scope: "allowed-paths-only";
    readonly verification: "all-required-pass";
    readonly evidence: "complete-current-unambiguous";
  };
  readonly stopPolicy: "m2-strict-v1";
}

export interface ValidatedExecutionPlan {
  readonly contractSha256: string;
  readonly taskId: string;
  readonly objective: string;
  readonly adapter: typeof NODE_TYPESCRIPT_NPM_PROFILE;
  readonly permittedCapabilities: readonly RealProjectCapability[];
  readonly authorizedTarget: string;
  readonly expectedBeforeSha256: string;
  readonly replacementContent: string;
  readonly requiredVerification: readonly VerificationCheck[];
  readonly expectedChangedPaths: readonly string[];
  readonly stopPolicy: "m2-strict-v1";
}
```

Parser invariants:

- Reject unknown fields at every object level.
- Require non-empty, unique capabilities, paths, changed paths, and verification checks.
- Require `change.path` and every expected changed path to appear in `allowedPaths`.
- For M2 acceptance, require exactly one `change` and exactly one expected changed path equal to `change.path`.
- Reject absolute, drive-prefixed, empty, dot, traversal, `.git/`, `.sureflow/`, symlink-escaping, directory, missing, untracked, and non-UTF-8 targets.
- Reject any command, executable, argv, shell, environment, approval, provider, network, Git mutation, or remote field.
- Reject `.sureflow/task.json` and every `.sureflow/**` path as a replacement target, even when presented through `repo.write`.

### Task Authority, Replacement Origin, and Immutable Snapshot

- `.sureflow/task.json` is trusted control-plane input supplied or approved by the human authority. It is never worker output and is not writable through worker `repo.write`.
- M2 intentionally stores replacement content directly in the task contract. No worker/reasoner produces a `ReplacementProposal` in M2; therefore M2 proves deterministic bounded change application, not model/provider integration.
- The worker/executor receives only a `ValidatedExecutionPlan`. It cannot select a different target, expand `allowedPaths`, alter the preimage, add/remove verification checks, or replace the content after validation.
- The control plane reads the exact task-contract bytes once, computes SHA-256, parses and validates them, copies the accepted values into one immutable execution-plan snapshot, and uses only that snapshot for the run.
- Later on-disk mutation of `.sureflow/task.json` cannot change the active plan. Before acceptance, the control plane re-hashes the on-disk contract; a mismatch records an authority-integrity failure and halts rather than silently accepting.
- The original contract digest and control-plane provenance are recorded in evidence. A later `verify` invocation loads a fresh snapshot and requires its digest to match the terminal evidence; replacement or stale evidence becomes UNKNOWN, never PASS.
- A future proposal-only seam may use `ReplacementProposal { targetPath, content }`, but it is deferred. If added later, Sureflow—not the proposer—must compare `targetPath` to the authorized snapshot and perform the actual write.

```ts
export interface DetectedNodeTypeScriptProject {
  readonly adapter: typeof NODE_TYPESCRIPT_NPM_PROFILE;
  readonly manifestPath: "package.json";
  readonly lockfilePath: "package-lock.json";
  readonly tsconfigPath: "tsconfig.json";
  readonly supportedChecks: readonly VerificationCheck[];
}

export type ProjectDetectionOutcome =
  | { readonly kind: "supported"; readonly project: DetectedNodeTypeScriptProject }
  | { readonly kind: "unsupported"; readonly reason: string };

export interface VerificationStep {
  readonly check: VerificationCheck;
  readonly executable: "npm";
  readonly argv:
    | readonly ["run", "typecheck"]
    | readonly ["test"]
    | readonly ["run", "lint"]
    | readonly ["run", "build"];
  readonly shell: false;
}

export interface VerificationPlan {
  readonly profile: typeof NODE_TYPESCRIPT_NPM_PROFILE;
  readonly steps: readonly VerificationStep[];
}

export type VerificationResolutionOutcome =
  | { readonly kind: "resolved"; readonly plan: VerificationPlan }
  | { readonly kind: "unsupported"; readonly missingChecks: readonly VerificationCheck[] };

export type VerificationStepResult =
  | { readonly check: VerificationCheck; readonly kind: "passed"; readonly exitCode: 0 }
  | { readonly check: VerificationCheck; readonly kind: "failed"; readonly exitCode: number }
  | { readonly check: VerificationCheck; readonly kind: "spawn-error" }
  | { readonly check: VerificationCheck; readonly kind: "terminated"; readonly signal: string };
```

The adapter reads script names only to determine support. Required profile identifiers come from the trusted immutable task snapshot, never worker output, and the worker cannot remove or weaken them after editing. The caller cannot provide an executable or argv. Repository-owned `package.json` scripts are executable definitions: npm may internally invoke a shell, access the host filesystem, or access the network according to the environment. `shell: false` constrains Sureflow's direct npm spawn only; it is not command safety, filesystem isolation, network isolation, or an OS sandbox. A missing required script is a controlled pre-write halt for an unsupported/insufficient profile, never silent success.

```ts
export interface ProjectScopeSnapshot {
  readonly changedPaths: readonly string[]; // Git-visible, normalized, sorted, unique
}

export interface ScopeComplianceResult {
  readonly compliant: boolean;
  readonly changedPaths: readonly string[];
  readonly unauthorizedPaths: readonly string[];
}

export interface AppliedReplacement {
  readonly path: string;
  readonly beforeSha256: string;
  readonly afterSha256: string;
}

export interface RunProjectTaskRequest {
  readonly rootDir: string;
  readonly requestedTaskId: string;
}

export interface RunProjectTaskOutcome {
  readonly kind: "accepted" | "halted";
  readonly taskId: string | null;
  readonly policyDecisions: readonly PolicyDecision[];
  readonly verdict: VerificationVerdict | null;
  readonly changedPaths: readonly string[];
  readonly checks: readonly VerificationStepResult[];
  readonly transitions: readonly TaskStatus[];
  readonly reason: string;
}
```

The scope inspector has exactly two Git dispatch shapes, both with `shell: false`: `git status --porcelain=v1 -z --untracked-files=all` and `git ls-files --error-unmatch -- <normalized-path>`. No caller supplies an executable, option, shell fragment, or additional argv. It proves only that no unexpected tracked or non-ignored untracked Git-visible changes were observed. It does not prove complete filesystem mutation detection, ignored-file enforcement, changes outside the repository, command safety, or OS sandboxing.

Clean-baseline rules are deterministic:

| Observed condition | Required behavior |
| :--- | :--- |
| Pre-existing tracked modification/deletion/rename outside `.sureflow/**` | HALT before task state and project writes |
| Pre-existing non-ignored untracked path outside `.sureflow/**` | HALT before task state and project writes |
| `.sureflow/**` runtime/control-plane files | Excluded from project change-set classification; independently protected by runtime containment and contract-hash integrity |
| Expected target mutation matching the immutable plan | Eligible to continue to verification/evidence |
| Unexpected tracked mutation | Record scope violation; FAIL/HALT |
| Unexpected non-ignored untracked creation | Record scope violation; FAIL/HALT |
| Ignored file or path outside the repository | Not detected or enforced by M2; explicitly deferred |

### Fixed Task-Contract Location

- M2 reads exactly `.sureflow/task.json` as human/control-plane-owned input via the existing `.sureflow/` containment boundary.
- The contract is input, not authoritative runtime state. `.sureflow/state/` remains the sole task-state authority.
- The canonical SHA-256 of the exact contract bytes is recorded as evidence and required during `verify` to detect contract replacement or stale evidence.
- Worker `repo.write` can never target `.sureflow/task.json`, `.sureflow/`, or any control-plane runtime path.
- M2 remains one active contract, one task, and one project. Contract catalogs and task queues are deferred.

---

## 6. Closed Dispatch and Execution Semantics

The single orchestrator must execute this order:

1. Acquire the existing mutation lock.
2. Read the exact `.sureflow/task.json` bytes once, hash them, strictly parse them, match the requested task ID, and create the immutable execution-plan snapshot.
3. Read valid authoritative runtime state and policy.
4. Detect the supported project from repository evidence.
5. Resolve snapshot-owned required verification checks to the one closed adapter profile. A missing required script halts before writes.
6. Require a clean Git-visible baseline outside `.sureflow/**`, tracked allowed target, path containment, and matching preimage hash.
7. Evaluate every requested capability with existing policy semantics; any non-ALLOW result halts before writes.
8. Reject pre-existing task state or terminal evidence for the same task/contract.
9. Persist `pending`, then `running` state.
10. Apply only the snapshot-owned target/content atomically through the control-plane bounded writer; the worker cannot select or expand path authority.
11. Run required verification steps once each in canonical order. M2 adds no retry unless separately planned and authorized.
12. Re-hash `.sureflow/task.json`; if it differs from the immutable snapshot digest, record an authority-integrity failure and halt without changing the active plan.
13. Capture post-run Git scope. Any Git-visible changed path outside `allowedPaths` records a scope violation and halts.
14. Append redacted terminal evidence for contract digest/provenance, replacement digests, scope result, and each required check.
15. Derive the verdict from evidence. Only complete, current, unambiguous passing evidence becomes PASS.
16. Transition to `accepted` only on PASS; otherwise transition to `halted`.
17. Release the mutation lock with the existing owner-token integrity check.

Pre-write failure creates no project mutation. A post-write failure does not roll back the file and cannot become accepted.

---

## 7. Evidence and Deterministic Verdict Rules

M2 reuses `EvidenceRecord`, redaction, and append-only JSONL unchanged. It appends separate records rather than adding a nested evidence schema.

| Required fact | Capability | Target | Result contract |
| :--- | :--- | :--- | :--- |
| Current immutable contract snapshot | `repo.read` | `.sureflow/task.json` | `sha256:<digest>;provenance=control-plane-task-input` |
| Applied replacement | `repo.write` | normalized changed path | `sha256:<before>-><after>` |
| Scope result | `repo.read` | `project-scope` | `compliant` or `violation:<sorted paths>` |
| Verification result | `repo.verify` | `<profile>:<check>` | `passed`, `failed:<code>`, `spawn-error`, or `terminated:<signal>` |

`verifyProjectChange(contract, entries)` is pure and may call the existing `verifyEvidence()` for exact tuples. It adds aggregate rules:

- Any corrupt/unreadable evidence yields UNKNOWN.
- Missing, duplicate, stale-contract, or ambiguous required evidence yields UNKNOWN.
- An observed contract-integrity mismatch during execution is an explicit failure and cannot change the already-authorized snapshot.
- Explicit failed verification, unchanged replacement digest, or scope violation yields FAIL.
- PASS requires the current contract digest, exactly the expected changed paths, no unauthorized path, and exactly one passed result for every required check.
- Model text, worker claims, event history, task state, timestamps, or “latest wins” ordering never establish PASS.
- `verify` reconciles stale `accepted` state to `halted` on FAIL or UNKNOWN, preserving M1 behavior.

When the execution-time re-hash of `.sureflow/task.json` differs from the immutable plan, the terminal `repo.read` evidence result is `integrity-mismatch:<observed-sha256>` and is interpreted as FAIL. This is distinct from a later current-contract digest that differs from terminal evidence, which remains UNKNOWN as stale contract evidence.

---

## 8. Existing M1/M1.1 Contracts Reused Unchanged

| Existing contract | M2 reuse |
| :--- | :--- |
| `PolicyDecision`, `PolicyConfig`, `decidePolicy()`, `loadPolicy()` | Evaluate each declared capability; no authority semantics change |
| `TaskStatus`, `TaskState`, `beginTask()`, `transitionTask()` | Preserve pending/running/accepted/halted lifecycle and authoritative state |
| `acquireMutationLock()` / `releaseMutationLock()` | Preserve one-project mutation exclusion and owner-token release integrity |
| `resolveWorkerPath()` and runtime containment | Preserve lexical, traversal, normalized, and symlink containment checks |
| `EvidenceRecord`, `appendEvidence()`, `readEvidence()`, redaction | Store terminal facts separately from state/policy without schema expansion |
| `ExecutionEvent` store | Record non-terminal observations and failed intermediate operations only |
| `VerificationVerdict` and `verifyEvidence()` | Preserve PASS/FAIL/UNKNOWN/BLOCKED domain and positive-proof rule |
| CLI commands and exit codes | Keep `init`, `run`, `status`, `verify`; keep `0` accepted/pass and `2` controlled halt |
| Atomic state writes and consistency reader | No state schema or migration required |

The policy allowlist gains the explicit `repo.verify` capability, but evaluation order, default-deny behavior, protected-operation handling, and approval semantics do not change.

---

## 9. Independent Acceptance Project

Add `fixtures/m2-node-ts-project/`, never Sureflow's own source tree. The fixture is a small private npm TypeScript library with:

- `package.json`, `package-lock.json`, `tsconfig.json`;
- a narrow `.gitignore` containing only `.sureflow/`, `node_modules/`, and deterministic build output;
- real `src/` code;
- real tests;
- working `typecheck`, `test`, and `build` scripts; `lint` may be included only if its setup remains fixture-local and justified;
- a useful failing requirement that is satisfied by replacing one tracked source file, for example whitespace-safe display-name normalization;
- no network, secrets, database, remote operation, publish script, or dependency on Sureflow internals.

Acceptance copies the fixture to a temporary directory, initializes a local Git repository, commits the baseline, installs fixture dependencies as harness setup, initializes Sureflow state, places the reviewed task contract at `.sureflow/task.json`, and invokes the public CLI artifact. This demonstrates an independent project while keeping repository history and runtime artifacts disposable.

The acceptance task must fail at least one required check before the declared replacement and pass all required checks after it. The test harness—not model confidence—asserts changed paths, evidence, state, verdict, and CLI exit.

---

## 10. Negative-Test Matrix

| ID | Scenario | Expected deterministic result | Project mutation |
| :--- | :--- | :--- | :--- |
| N1 | Missing Node/TypeScript repository evidence | HALT: unsupported project | None |
| N2 | Unsupported adapter ID, worker-selected profile, or missing required npm script | HALT: unsupported/insufficient verification profile | None |
| N3 | Malformed contract, unknown field, duplicate entry, or invalid enum | HALT: invalid task contract | None |
| N4 | Policy DENY or REQUIRE_APPROVAL for any capability | HALT with the exact policy domain preserved | None |
| N5 | Absolute, traversal, `.git/`, `.sureflow/` (including `task.json`), directory, symlink-escape, missing, or untracked write target | HALT: unauthorized target | None |
| N6 | Dirty baseline or allowed file preimage hash mismatch | HALT: stale/ambiguous baseline | None |
| N7 | Declared change path is outside `allowedPaths` or expected paths | HALT: scope contract violation | None |
| N8 | Required verification exits nonzero | FAIL; state `halted`; failure evidence recorded | Bounded declared change remains |
| N9 | Verification spawn error or termination | FAIL; state `halted`; exact terminal result recorded | Bounded declared change remains |
| N10 | Verification script mutates an unauthorized Git-visible tracked or non-ignored untracked path | FAIL: scope violation; state `halted` | Changes remain for inspection |
| N11 | Required verification evidence missing | UNKNOWN; never PASS; stale accepted state halts | None during read-only verify |
| N12 | Evidence corrupt, schema-invalid, unreadable, duplicate, or contract digest stale | UNKNOWN; never PASS; stale accepted state halts | None during read-only verify |
| N13 | Changed file digest is unchanged or expected changed path is missing | FAIL or UNKNOWN according to explicit vs missing evidence; never PASS | No additional mutation |
| N14 | Existing task state or terminal evidence for task ID | HALT: replay/ambiguity refused | None |
| N15 | Existing mutation lock or lock release integrity failure | HALT; never accepted | None before lock, bounded change may remain after release failure |
| N16 | `.sureflow/task.json` changes after snapshot creation | Active plan remains unchanged; contract-integrity evidence fails and task HALTs | Only the already-authorized bounded change may remain |

---

## 11. Acceptance Criteria

- **AC-M2.1 — Project detection**: Supported fixture evidence resolves exactly `node-typescript/npm-scripts-v1`; unsupported or ambiguous evidence halts before task state or project writes.
- **AC-M2.2 — Strict task contract and authority**: Human/control-plane-owned bytes are hashed and parsed once into an immutable plan; worker writes cannot target `.sureflow/**`, expand paths, change content/preimage, or weaken verification; any on-disk contract change before acceptance halts without altering the active plan.
- **AC-M2.3 — Bounded useful write**: From a clean committed fixture baseline, Sureflow atomically replaces exactly one authorized tracked source file whose preimage matches, refuses every containment/staleness violation, and halts on any unauthorized Git-visible changed path.
- **AC-M2.4 — Closed verification**: Snapshot-owned required profile IDs resolve to fixed npm argv in canonical order; workers cannot choose or weaken them; missing scripts halt; `shell: false` is documented only as the direct spawn setting, never as an npm-script sandbox.
- **AC-M2.5 — Change evidence**: Persisted evidence identifies the current contract digest, before/after file digests, exact changed paths, scope compliance, and every required verification result without relying on model confidence.
- **AC-M2.6 — Deterministic verdict**: The end-to-end acceptance task reaches PASS/`accepted` only when every required fact is complete, current, and unambiguous; missing/corrupt/duplicate/stale evidence never becomes PASS.
- **AC-M2.7 — Negative paths**: N1–N16 pass with the specified no-write or bounded-failure behavior.
- **AC-M2.8 — Independent acceptance**: The target is `fixtures/m2-node-ts-project/` copied to a disposable temporary Git repository; Sureflow's source tree is never the change target.
- **AC-M2.9 — Regression and boundaries**: Existing M1/M1.1 tests, state semantics, policy semantics, redaction, containment, lock integrity, CLI command set, and exit codes remain green; no deferred capability appears.

---

## 12. Dependency-Ordered Task Breakdown and Estimate

Estimates are implementation effort, not elapsed calendar commitments.

| Task | Scope | Depends on | Estimate |
| :--- | :--- | :--- | :--- |
| **M2-T1 Contract and acceptance fixture** | Add control-plane authority rules, strict parser/types, immutable snapshot/digest, task-path loader, fixture skeleton, contract tests | Approved M2 plan | 3–4 h |
| **M2-T2 Project detection** | Detect clean Git + Node/TS/npm evidence; explicit unsupported outcomes | T1 | 3–4 h |
| **M2-T3 Verification profile resolution/dispatch** | Fixed check mapping, canonical order, result mapping, no caller command surface | T2 | 4–5 h |
| **M2-T4 Bounded replacement** | Apply snapshot-owned bytes only; tracked existing-file proof, preimage SHA-256, containment, atomic write, digest result | T1–T2 | 3–4 h |
| **M2-T5 Scope compliance inspector** | Fixed read-only Git status/track calls, clean baseline, sorted changed paths, violation result | T2, T4 | 3–4 h |
| **M2-T6 Aggregate evidence verifier** | Evidence codecs, current contract binding, exact-path/check cardinality, FAIL/UNKNOWN rules | T1, T3–T5 | 4–5 h |
| **M2-T7 Single orchestration integration** | Generalize run/verify pipeline, preserve T0 compatibility wrapper, policy/lock/state/events/CLI | T1–T6 | 5–7 h |
| **M2-T8 End-to-end and negative acceptance** | Independent temp-repo acceptance, N1–N16, regression suite, docs/review evidence | T7 | 4–6 h |

**Estimated total**: 29–39 engineering hours. The main uncertainty is orchestration generalization without duplicating T0 logic; if a second pipeline begins to form, implementation must stop and return to design review.

---

## 13. Risks and Architecture Traps

| Risk / trap | Consequence | Planning control |
| :--- | :--- | :--- |
| Treating package scripts as arbitrary caller commands | Hidden shell interface and unsafe authority confusion | Only fixed check names; argv constructed by adapter; explicit trusted-local-project boundary; no sandbox claim |
| Adding a generic adapter/plugin framework | Premature subsystem and broad core leakage | One literal adapter and closed resolver; no registry |
| Duplicating `runT0Task` into an M2 workflow | Second orchestration framework and divergent invariants | One execution-plan orchestrator; compatibility wrapper only |
| Using Sureflow itself as target | Self-modification hides independence and contaminates evidence | Disposable copy of independent fixture only |
| Trusting task-declared changed files | Scope bypass and model-confidence substitution | Read actual Git-visible status after verification and compare exact paths; do not claim ignored-file sandboxing |
| Treating task input as worker output | Worker silently expands its own authority | Task is human/control-plane input; immutable snapshot only; worker cannot write `.sureflow/**` |
| Contract changes during a run | Authorized target/checks silently drift | Hash exact bytes, execute snapshot only, re-hash before acceptance, halt on mismatch |
| Auto-rollback after failed verification | Data-loss and partial-rollback complexity | Preserve bounded change, halt, and report evidence |
| Expanding evidence schema prematurely | M1 reader/verifier compatibility risk | Reuse one record per fact with deterministic codecs |
| Allowing globs/directories | Authorization ambiguity and broad writes | Exact normalized existing file paths only |
| Running install inside the worker | Network and uncontrolled mutation surface | Fixture setup installs before Sureflow; runtime never installs |
| Letting build outputs trigger false scope failures | Unstable acceptance | Git status is the M2 scope oracle; ignored generated outputs do not authorize tracked-source mutation |

---

## 14. Failure-Mode and Effects Analysis

| Failure scenario | Severity | Detection | Mitigation / recovery |
| :--- | :--- | :--- | :--- |
| Contract changes during execution | High | Pre-acceptance re-hash differs from snapshot | Keep active plan unchanged; record integrity failure; halt |
| Contract changes after execution | High | Current contract digest differs from evidence | UNKNOWN; stale accepted state halts; no “latest wins” |
| Stale source preimage | High | SHA-256 mismatch before write | HALT before mutation; regenerate reviewed contract |
| Verification mutates another source file | High | Post-run Git scope contains unauthorized path | Record violation; FAIL; halt with files preserved |
| npm check cannot start | Medium | Spawn error result | Record explicit failure; halt; no retry in M2 |
| Evidence append fails after write | High | Missing terminal evidence on re-read | UNKNOWN/halt; bounded change remains for human inspection |
| State write fails after evidence | High | Atomic state reader reports invalid/inconsistent state | Controlled halt; evidence remains non-authoritative but inspectable |
| Lock release ownership mismatch | High | Existing owner-token check | Controlled halt; never report accepted |
| Git unavailable or repository ambiguous | Medium | Detector/scope command fails | Unsupported project; no write |

Database, schema migration, tenancy, authentication, CSRF, rate limiting, PII, deployment rollback, and RPO/RTO are not applicable: M2 is a local single-project filesystem change gate with no database, network API, identity system, or deployment.

---

## 15. Deferred Post-M2 Capabilities

- Additional stacks, package managers, monorepos, workspaces, and adapter registry.
- Multiple writes, creates, deletes, renames, binary edits, patches, and directory/glob permissions.
- Model/provider integration and candidate-change generation.
- Worker/reasoner `ReplacementProposal` ingress; if later added, proposal bytes remain non-authoritative until validated against a control-plane plan.
- Multi-agent execution, parallel workers, scheduler, queue, daemon, retries, and distributed locks.
- MCP, skills runtime/marketplace, context engine, and Z0–Z4 implementation.
- Generalized arbitrary shell or user-defined verification commands.
- Approval delivery, remote issue tracking, Git commit/push/merge, deployment, publication, cloud services, and UI.
- Transactional repository rollback, snapshot restore, or sandbox/container enforcement.
- Detection of arbitrary writes beneath ignored dependency/build/runtime paths; M2 enforces Git-visible project scope and makes no broader sandbox claim.
- Task catalogs, multiple active contracts, cross-project execution, and remote evidence stores.
- Tauri/Rust or non-Node project support.

---

## 16. Planning Stop Conditions and Sign-off

Planning found no requirement to change authority semantics, expose arbitrary shell, add a second orchestration framework, leak Node-specific behavior into core orchestration, introduce agents/providers/MCP, or weaken objective acceptance. If any implementation task crosses one of those boundaries, it must stop and reopen this plan through a Scope Change Record.

- [x] Human approves the eight clarified design decisions for the planning baseline.
- [ ] Architecture is challenged through `pk:grill` if requested.
- [ ] M2-T1 receives separate implementation authorization.
- [x] Database evolution is not applicable.
- [x] Planning and Task Record agree on `TDD Enforcement Mode: disabled`.
- [x] This document authorizes no M2 code, push, or remote action; the separately authorized planning-baseline commit contains only the three planning files.
