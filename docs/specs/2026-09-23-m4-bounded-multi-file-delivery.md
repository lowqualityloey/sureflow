# M4 — Bounded Multi-File Delivery

- **Status**: Selected planning baseline; implementation not authorized
- **Owner**: Human authority
- **Created**: 2026-09-23
- **Task Record**: [M4 bounded multi-file delivery](../tasks/2026-09-23-m4-bounded-multi-file-delivery.md)
- **Accepted baseline**: `origin/main` at `1106f75c550be467083f7d8408a21de6e389dba9`

## 1. Purpose and authority boundary

M4 extends the accepted M2/M3 single-target replacement to **2–5 declared
existing Git-tracked UTF-8 files** in one standalone supported Node/TypeScript
npm or narrow pnpm project. A human/control-plane-owned `.sureflow/task.json`
declares all replacement bytes and preimages before `run`. Sureflow does not
choose targets or generate replacement content. This document selects a design,
not an implementation task, commit, release, or permission to mutate a project.

The accepted M1–M3 schema-version-1 single-target route, T0 route, state
transitions, npm/pnpm adapters, EvidenceRecord v1/v2 readers, public commands,
and CLI exit meanings retain their existing meanings. Schema version 1 never
gains multi-file semantics; historical task or evidence bytes are not migrated
or reinterpreted.

## 2. Closed task contract and snapshot

M4 uses a separately discriminated contract at the existing
`.sureflow/task.json` authority path. Its exact top-level fields are
`schemaVersion`, `taskId`, `adapter`, `operation`, `targets`, and
`requiredVerification`; unknown fields are invalid. The exact shape is:

```json
{
  "schemaVersion": 2,
  "taskId": "TASK-EXAMPLE",
  "adapter": "node-typescript/npm-scripts-v1",
  "operation": "replace-existing-files",
  "targets": [
    {
      "path": "src/first.ts",
      "expectedBeforeSha256": "<64 lowercase hex characters>",
      "replacementContent": "<exact replacement text>"
    },
    {
      "path": "src/second.ts",
      "expectedBeforeSha256": "<64 lowercase hex characters>",
      "replacementContent": "<exact replacement text>"
    }
  ],
  "requiredVerification": ["typecheck", "test", "lint", "build"]
}
```

- `schemaVersion` is exactly integer `2`; `operation` is exactly
  `replace-existing-files`. The only adapters are the accepted
  `node-typescript/npm-scripts-v1` and `node-typescript/pnpm-scripts-v1`.
- `taskId` retains the existing non-empty, no-control-character identity rule.
  `requiredVerification` is a non-empty, duplicate-free subset of the closed
  `typecheck`, `test`, `lint`, `build` domain. The selected checks resolve in
  that fixed order regardless of declaration order. Unsupported or duplicate
  check names are invalid.
- `targets` is an array of exactly 2–5 objects. Every object has exactly
  `path`, `expectedBeforeSha256`, and `replacementContent`; no extra authority
  field, command, glob, or inferred target is accepted.
- Duplicate raw JSON member names are invalid in the version-2 top-level
  object and every target object, including duplicate `schemaVersion`,
  `path`, `expectedBeforeSha256`, or `replacementContent` names. A duplicate
  `schemaVersion` cannot hide a version-2 declaration by making a last-key-wins
  JSON parse select version 1. Version-2 dispatch must detect this before
  accepting authority bytes; genuine version-1 parsing retains its historical
  meaning. T1 chooses a narrow duplicate-aware mechanism, not a parser framework.
- `path` is a non-empty, already-normalized, case-sensitive, repository-relative
  `/`-separated path: no backslash, absolute/drive path, empty/`.`/`..` segment,
  NUL, or `.git`/`.sureflow` segment. An input that merely *normalizes into*
  such a path is rejected rather than silently rewritten. Equal normalized
  paths are invalid. Physical uniqueness and literal Git trackedness are
  established in complete-set preflight, not guessed from JSON.
- `expectedBeforeSha256` is exactly 64 lowercase hexadecimal characters and
  binds the existing file's exact bytes. `replacementContent` is a JSON string
  with well-formed Unicode scalar content; its exact UTF-8 encoding, with no
  newline or normalization rewrite, is the authorized replacement byte stream.
  The replacement digest must differ from the expected preimage digest.
- Read the raw contract bytes once, reject invalid/duplicate-key version-2
  authority, strictly interpret the contract, hash the exact accepted raw
  bytes with SHA-256, and freeze the plan including its nested targets.
  The source hash binds byte identity; the validated plan binds interpreted
  execution meaning. Valid byte sequences with equivalent parsed meaning may
  have different source hashes. Reordering targets or checks can change the
  source hash without granting execution-order authority. The worker cannot
  add paths, alter replacement bytes, or expand authority. Re-read the source
  for exact-byte integrity before each attempted write and at the terminal
  checkpoint; an observed mismatch halts and can never become PASS.

**Size decision:** M4 adds no replacement-byte cap. The existing single-file
contract has no general cap, and there is no measured parser, memory, evidence,
or testability threshold justifying a particular new byte number. The 5-target
cardinality cap bounds the count, **not** total memory or file size. T1/T2
should measure representative 5-target inputs; a demonstrated safety limit
requires a separate exact-unit decision and boundary tests, never an arbitrary
cap or retroactive change to version 1.

## 3. Execution path and fail-closed gates

The existing project mutation lock is acquired before contract loading and
held continuously through complete-set preflight, policy, all attempted
writes, integrated verification, evidence, and the final state transition.
It is released once at the end; no release/reacquire occurs between targets.
Existing project detection and the closed adapter admit only one standalone
npm or narrow pnpm project. The baseline outside `.sureflow/**` must be clean
under the accepted Git-visible scope oracle. All required scripts must resolve
before any project write. Policy decides `repo.read`, `repo.write`, and
`repo.verify` before the first project write: **one existing default-deny
`repo.write` ALLOW covers exactly the immutable, validated finite set**. No
per-file ALLOW can enlarge it; DENY and REQUIRE_APPROVAL halt before mutation.

### Complete-set preflight

Before **any** project target file is written, validate **every** target:
closed contract; normalized/protected path; canonical-root lexical and
physical containment (including each symlinked ancestor); existing regular
final file, not a final symlink; literal Git trackedness; readable valid
UTF-8 bytes; preimage SHA-256 equality; and non-no-op replacement bytes.

For the complete declared set, reject equal normalized paths, equal canonical
physical paths resolved through the accepted containment model, and equal
usable `(device, inode)` identities for existing files. This catches lexical
duplicates, symlink/realpath aliases, and hard-link aliases where filesystem
identity exposes them. If the M4-supported host cannot establish a required
canonical path or usable physical identity for any target, refuse the entire
set. Freeze each target's observed canonical path and identity for this run
only; no persistent inode registry or cross-platform identity service is
introduced.

For version-2 trackedness, use the fixed read-only argv equivalent to
`git --literal-pathspecs ls-files --error-unmatch -- <normalized-target-path>`
with `shell: false` and the target path as one argv element. Require the exact
declared path to be returned as tracked; a pattern match to another path is
not proof. The accepted version-1 probe and its historical meaning are
unchanged. A missing file, directory, untracked file, alias, escape, invalid
text, stale hash, or failed probe anywhere refuses the whole set. Preflight
is read-only with respect to project targets. **Any preflight failure means
zero target writes and a controlled HALT.** It does not promise no
control-plane state/evidence changes.

After the lock is held, the version-2 contract is frozen, the project/adapter
and complete set are validated, and required policy is ALLOW, persist exactly
one pre-write EvidenceRecord v1 `repo.read` observation at target
`task-contract-prewrite-binding` with result
`sha256:<frozen-raw-contract-hash>`, `ALLOW`, and non-empty provenance.
This is distinct from the terminal contract-integrity observation. It is
required before the **first** target write attempt; if append fails, write
zero targets, HALT, and leave verification without the proof needed for PASS.

### Ordered writes and execution-time revalidation

Write targets in **ascending bytewise UTF-8 order of their normalized path**,
case-sensitive and locale-independent. This is independent of JSON order and
filesystem enumeration, and makes the partial-success prefix deterministic.
Immediately before **each** target write, freshly prove containment,
regular-file/literal-trackedness, valid UTF-8, current preimage, and non-no-op
replacement. Re-establish this not-yet-written target's canonical path and
usable `(device, inode)` identity and require both to equal its frozen
complete-set preflight values. Any drift or inability to establish identity
refuses the target before writing, so a later target cannot silently become
an alias of another set member. This rechecks the current target against the
immutable set snapshot, not the whole filesystem. The prior full-set
preflight is not a lease against unrelated external actors.

Each successful file replacement may reuse same-directory exclusive temporary
file creation, complete write/close, original relevant mode preservation, and
rename. Clean up only its own unrenamed temporary file. A stale/unsafe target
must not be touched; after one refusal, do not attempt later paths. If an
atomic rename fails, report the observed failure without claiming the target
is unchanged unless separately observed. Earlier successful writes remain.

The **set is not atomic**: no transaction, all-or-nothing result, crash
rollback, power-loss durability, or filesystem transaction is claimed. A
crash or later failure can leave a prefix applied, perhaps with incomplete
evidence. There is no automatic rollback, repair, retry, crash resume, or
recovery daemon. Authoritative task state must halt when persistence is
available; if state persistence itself fails, return a controlled non-success
and do not claim a durable halted record. Humans inspect partial results.

After **all** writes succeed, bind project inputs and run the required closed
verification profiles **once** against the integrated project state, in
canonical `typecheck`, `test`, `lint`, `build` order filtered by the contract.
The same resolved canonical step order determines actual execution, the
resolved-plan digest, the verification-input binding, and the version-2
aggregate verifier expectation. Declaration order is not execution authority;
the raw source contract hash still binds the declaration bytes. Historical
schema-version-1 binding interpretation does not change.
Keep the existing 120-second per-step, 300-second overall, and 5-second
termination-grace envelope; no M4 evidence justifies changing it. Dispatch
uses the accepted fixed npm/pnpm argv, canonical project cwd, and
`shell: false`. Repository scripts remain trusted executable project code;
this is not OS, filesystem, network, or descendant-process isolation.

One successful file write is not an accepted multi-file task, just as a
future worker GREEN would not imply wave GREEN. Acceptance requires the
complete write set, integrated verification, exact scope, complete evidence,
and aggregate PASS.

## 4. Scope, evidence, and verdicts

For successful M4 completion, the accepted read-only Git porcelain oracle
must observe **exactly** the declared path set, not a subset or superset:
`actual Git-visible changed paths == declared normalized target paths`.
Renames/copies, malformed Git output, signal/spawn/nonzero status, or extra
tracked/non-ignored untracked paths never establish compliance. The existing
`.sureflow/**` exclusion stays path-boundary aware. This does not enforce
ignored files, external paths, or arbitrary effects of trusted project scripts.
After an explicit partial write failure, do not emit normal `project-scope`
`compliant` acceptance evidence: the successful prefix is not the declared
set. A read-only changed-path inspection may be retained for human diagnosis
only and cannot contribute positive acceptance evidence.

**Evidence decision:** use the existing generic EvidenceRecord v1 envelope for
M4 `repo.read`/`repo.write` observations and existing EvidenceRecord v2 only
for started `repo.verify` execution. No v3 is justified: v1 already has
`taskId`, `capability`, `target`, `result`, policy decision, and provenance.
M4-specific strict result interpretation is selected only by a version-2 task
plan; the accepted version-1 verifier and historical v1/v2 interpretation stay
unchanged.

- The one pre-write `repo.read` binding observation described in §3 must
  precede every attempted target write. On the full-success path, after
  integrated verification and scope inspection; on a handled refusal path,
  immediately after stopping writes and without integrated verification:
  re-read the contract source bytes against the frozen hash and append
  exactly one separate
  `repo.read` observation at target `.sureflow/task.json`. Its result is the
  existing `sha256:<frozen-hash>;provenance=control-plane-task-input` when
  bytes match, or `integrity-mismatch:<observed-hash>` when they differ.
  Unreadable source or failed evidence append leaves terminal proof
  unavailable. A mismatch never reinterprets the new bytes, never retargets
  remaining writes, and never PASSes; record it when persistence works and
  HALT. The two distinct binding/terminal tuples remain unique.
- Successful replacement: exactly one `ALLOW`, non-empty-provenance record per
  `(taskId, repo.write, normalized-path)` with result
  `sha256:<expected-before>-><observed-after>`. `observed-after` must equal
  SHA-256 of that target's exact planned UTF-8 replacement bytes and differ
  from `expected-before`. Append after observing each completed rename and
  before attempting the next target, so the evidence log preserves write order
  and an earlier success remains visible if a later write fails. If a success
  append fails, attempt no later target and leave the resulting incomplete
  proof non-PASS/UNKNOWN.
- Explicit attempted-target refusal/failure: one same-tuple v1 record with a
  closed `refused:<code>` result. The complete M4 code set is
  `stale-preimage` (current bytes disagree with the frozen preimage),
  `target-invalid` (missing, nonregular, escaped, unreadable, invalid UTF-8,
  or otherwise unsafe target), `identity-changed` (frozen physical identity
  differs or cannot be re-established), `trackedness-lost` (literal trackedness
  is no longer established), and `apply-failed` (owned temporary/write/close/
  rename operation did not complete). The code records an observed
  non-success, not a claim that target bytes are unchanged after an uncertain
  apply failure. Human detail is diagnostic, not machine identity; no raw
  exception/output is persisted. An unattempted suffix has no write record.
- Pre-write binding, terminal contract digest, project-scope, and
  verification-input-binding records are required for PASS with strict
  current-plan meaning. The successful scope record is valid only after
  exact-set inspection. Required verification outcomes retain their v2
  execution context and input binding. Evidence is diagnostic/history;
  `.sureflow/state/` remains authoritative.

The M4 aggregate verifier is pure: no filesystem writes, process execution,
evidence append, lock, or policy decision. It requires one eligible current
success record for **every** planned path, no duplicate planned-path tuple,
no unexpected same-task `repo.write` target, exact before/after digests,
non-no-op, unique current pre-write and terminal contract binding, exact scope
compliance, complete unique required checks, and valid input binding before
PASS. Wrong valid digests, no-op evidence, explicit scope violation, or a
recognized failed/timed-out/interrupted verification produce FAIL.
For version-2 tasks, persisted record order must place the one pre-write
binding before every write observation, successful writes in canonical target
order, and the one terminal contract observation after the last write or
refusal observation. Missing or contradictory ordering is UNKNOWN.

A partial-write FAIL is valid only when the pre-write binding and terminal
current-contract observation are valid and the task's `repo.write` records
form exactly a canonical-order prefix of successful digest tuples followed
by one closed `refused:<code>` tuple for the first failed target. The prefix
may be empty: binding, then first-target refusal, with zero target writes,
can be FAIL. For ordered T1, T2, T3, T4 with T3 refusing, T1 and T2 each have
exactly one success, T3 has exactly one refusal, and unattempted T4 has zero
write observations. No later target is attempted after refusal.

Missing or out-of-order prefix observations, duplicate success or refusal
tuples, a success and refusal for the same target, malformed refusal code,
an unexpected same-task write target, or any suffix write/failure record
make the write history ambiguous and yield UNKNOWN. Missing refusal evidence
after a failed attempt, failed evidence persistence after mutation, corrupt
evidence, or stale/incomplete contract proof also yields UNKNOWN. A valid,
explicit observed failure yields FAIL; insufficient or contradictory proof
yields UNKNOWN. Corrupt/ambiguous evidence takes precedence over an
otherwise asserted failure. Neither FAIL nor UNKNOWN accepts; both halt.
BLOCKED remains a policy outcome and is never manufactured by evidence
verification.

Normal integrated `typecheck`/`test`/`lint`/`build` acceptance verification
never runs after any target refusal or partial write failure. No diagnostic
inspection of a partial project can become acceptance verification evidence.

Public `verify <taskId>` remains read-only with respect to project files,
project verification processes, and evidence append. It uses the current
task contract and stored evidence. As already accepted, it may reconcile a
stale authoritative `accepted` state to `halted` on a non-PASS result. A
partially applied set can never be reinterpreted as accepted.

## 5. Failure analysis and recovery boundary

| Failure | Observable result | Mutation/recovery rule |
| :--- | :--- | :--- |
| Any invalid target in full-set preflight; dirty baseline; missing script; non-ALLOW policy; held lock | Controlled HALT | Zero target writes; no automatic repair |
| First target stale/unsafe immediately before apply | HALT; explicit failure evidence if persistence works | No target write |
| Later target stale/unsafe or later rename fails | HALT; prior successes and explicit failure recorded where possible | Preserve successful prefix; no later writes or rollback |
| Crash, evidence/state persistence failure, or ambiguous write outcome | Controlled non-success where observable; verifier UNKNOWN without complete evidence | Human inspection; no automatic resume |
| Verification fails/times out/is interrupted; contract changes; scope subset/superset | FAIL or UNKNOWN according to valid persisted observations; HALT | Keep completed writes; no acceptance |

## 6. Acceptance mapping

Positive public/disposable-project cases: 2-file npm, 5-file boundary npm,
and 2-file pnpm; exact after bytes and declared Git-visible set; one integrated
required-profile sequence after all writes; complete per-path before/after
evidence; acceptance only on aggregate PASS; public verify performs no project
write, verification command, or evidence append.

Negative cases, each with **no PASS**, are mandatory:

| Boundary | Required cases |
| :--- | :--- |
| Contract/path | 0, 1, and 6 targets; duplicate path; traversal; absolute path; `.git`; `.sureflow`; raw JSON duplicate top-level key (including duplicate `schemaVersion`) and duplicate target `path`, `expectedBeforeSha256`, or `replacementContent` key; unsupported or duplicate verification check |
| Target/preflight | Equal canonical realpaths; usable hard-link `(device, inode)` collision; unavailable required physical identity; missing file; directory; untracked file; invalid UTF-8; symlink escape; stale full-set preimage; no-op; one invalid target prevents **all** writes; literal pathspec-metacharacter target such as `src/[t]askContract.ts` must not count tracked `src/taskContract.ts` as a match |
| Eligibility | Dirty baseline; missing required verification script; policy DENY; policy REQUIRE_APPROVAL; held mutation lock |
| Apply | Apply-time identity drift or unavailable identity; stale first target; stale later target after earlier success; injected later atomic-rename failure; no automatic rollback; no owned temp artifact leak; no later write or normal verification after refusal |
| Post-write scope/evidence | Unexpected changed-path subset; superset; no compliant scope record for a partial set; missing/duplicate/unexpected write evidence; malformed/duplicate refusal; contradictory success and refusal; unexpected suffix refusal; wrong before digest; wrong after digest; corrupt evidence; stale contract; missing pre-write or terminal binding |
| Execution/persistence | Verification nonzero, spawn error, timeout, SIGINT, or SIGTERM; evidence persistence failure before first write and after a completed prefix; relevant final state-write failure; lock-release integrity failure |

Two valid version-2 contracts with the same selected check set in different
declaration orders may hash to different raw source digests but must resolve
to the same canonical verification order and resolved-plan semantics. Neither
may fail solely because declaration order differs. Negative cases must also
prove that incomplete or ambiguous evidence cannot PASS.

Compatibility cases must prove T0, M2 single-target npm, M3 single-target
npm/pnpm, v1 and v2 evidence reading with their old meaning, unchanged
schema-version-1 parsing and task contracts, historical verification-input
binding interpretation, the existing public CLI command set, unchanged state
vocabulary, and unchanged verdict semantics. No historical bytes gain a new
meaning.
Separate task authorization is required before writing any such test or code.

## 7. Gated work and exclusions

The companion Task Record gates six independently reviewable tasks: contract
and fixture; complete-set preflight; ordered write coordinator; exact-set
scope/evidence verifier; orchestration; and independent npm/pnpm end-to-end,
negative, and regression acceptance. No task is active under this plan.
T1 extends the existing disposable independent npm/pnpm fixture patterns with
only the additional tracked files needed for multi-file coverage; it does not
create a fixture framework or implement later runtime gates. Current project
detection still carries a single-target `targetPath` coupling. T2 may adapt
detection/validation for the version-2 set while preserving the version-1
route; T1 does not silently absorb that work.

M4 explicitly excludes new-file creation, deletion, rename/move, dependency
or package mutation, package-manager installation, dynamic discovery,
investigation/context engine, repair/retry expansion, rollback, multi-file
transaction, crash recovery, auto-resume, workspaces/monorepos, arbitrary
shell, providers/models, MCP, skills or JIT-knowledge runtime, sequential
autonomy, parallel workers, scheduler, queue, daemon, Git commit/push/PR
automation, deployment, publication, cloud services, telemetry platform,
Human Presentation Layer implementation, and PromptKit workflow/template
migration.

Human Presentation Layer and evidence-derived telemetry remain separate
roadmap candidates: **structured truth → concise human projection** and
**runtime facts → provenance-aware measurement**. PromptKit is a knowledge/
process predecessor; Sureflow is the authority/control plane. Neither
PromptKit templates/workflows nor a skill system are part of M4.

README/ARCHITECTURE current-vs-future wording, M1-era package metadata,
CHANGELOG pre-release wording, and any remaining STATE roadmap-integration
projection drift are documentation/release-readiness debt. They are not M4
runtime tasks and are not fixed by this planning baseline.
