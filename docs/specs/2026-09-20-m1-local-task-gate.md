# M1 Spec: Deterministic local task gate (FINAL FOR REVIEW)

<a id="PLAN-m1-local-task-gate"></a>

- **Author**: Cline (AI coding agent)
- **Status**: Approved by human 2026-09-20; amended by the human-approved T6 preflight correction on 2026-09-21
- **Created**: 2026-09-20
- **Target Release**: M1 (first useful vertical slice)
- **Task Record**: `docs/tasks/2026-09-20-m1-local-task-gate.md`
- **Decisions**: `docs/adrs/2026-09-20-stack-and-m1-boundary.md` (M-D1..M-D5)
- **T6 Preflight Decisions**: `docs/adrs/2026-09-21-m1-t6-preflight-contracts.md` (M-D6..M-D13)
- **Scope Change**: `docs/tasks/2026-09-20-m1-local-task-gate.scope-1.md`
- **Stack**: TypeScript + Node.js (human decision M-D1; package manager,
  Node pin, TS config, test runner NOT yet decided — see §9)

## 1. Objective

Prove the smallest end-to-end control-plane loop on an isolated
fixture: human request -> control plane -> task/state -> scoped
execution -> evidence -> deterministic verification -> ACCEPT or HALT.

## 2. Scope (bounded — user-confirmed)

- **Commands (4 only)**: `init`, `run`, `status`, `verify`.
- **Policy**: static default-deny file; `REQUIRE_APPROVAL` is a
  terminal M1 policy halt with no approval-delivery mechanism.
- **Execution**: one disposable worker, allowlisted capabilities.
- **Evidence**: append-only JSONL event/evidence log.
- **Verification**: deterministic runner; PASS / FAIL / UNKNOWN /
  BLOCKED; UNKNOWN or missing evidence -> HALT.
- **Repair**: max 1 automated retry, then HALT + human.
- **Fixture**: `fixtures/t0-basic/`, minimal and deterministic;
  its contract is established before T6.
## 3. Non-goals (binding for M1)

No multi-agent execution, MCP, skills, provider adapters, stack
adapters, scheduler, autonomy levels, replay, telemetry platform,
cloud infrastructure, remote tracking (GitHub/Linear/Jira), or
generalized autonomy policy. Any of these requires a scope-change
record + human approval.

## 4. Contracts

- **State (authoritative)**: `.sureflow/state/` — JSON files only:
  `project.json`, `active.json`, `tasks/<id>.json`. No other writer
  may mutate them. `docs/STATE.md` is a PromptKit process tracker,
  never read as runtime input. A future Markdown projection derives
  from this state; none exists in M1.
- **Policy file**: `.sureflow/policy/default.json` — capabilities
  allowlist per worker + the 5 protected ops (M-D3) each marked
  `require: human-approval`. Default-deny: anything not listed is
  denied. Policy is data, never natural-language authority.
- **M1 approval semantics**: `REQUIRE_APPROVAL` means zero
  capability execution, no retry, and a terminal policy-layer halt. M1 has
  no `--approve` flag, environment approval, approval token,
  schema, store, authenticity/expiry machinery, or resumable approval
  delivery. CLI invocation and `init --force` never imply
  approval. `REQUIRE_APPROVAL` is not converted into
  `VerificationVerdict.BLOCKED`.
- **Capabilities (M1 allowlist)**: `repo.read`, `repo.write`
  (fixture-scoped), `repo.test`. Everything else (incl. `git.push`,
  `deploy.*`, `db.migrate`, `secret.*`, `network.external`) is
  denied in M1. Worker cwd is jailed to `fixtures/t0-basic/`.
- **Closed `repo.test` profile**: only
  `testProfile: "npm-test"` is valid. Sureflow maps it internally
  to executable `npm` and fixed `["test"]` argv with
  `shell: false` and cwd equal to the bounded worker root.
  Executable and argv are never supplied by the model, CLI, task, or
  fixture. Missing/unsupported profiles halt with no arbitrary-command
  fallback.
- **Fixed `npm-test` result mapping**: the closed profile maps process
  outcomes independently of fixture expectations: exit code `0` ->
  `EvidenceRecord.result = "ok"`; any nonzero numeric exit code ->
  `"test-failed"`; process creation/spawn failure -> `"spawn-error"`;
  signal termination -> `"test-terminated"`. These strings belong to
  the profile and never come from fixture `expectedResult`, evidence,
  model output, or caller input.
- **Events/evidence (append-only JSONL)**:
  `.sureflow/events/events.jsonl` + `.sureflow/evidence/evidence.jsonl`.
  Required fields per record: `who/what, when, task, capability,
  policyDecision, target, result, provenance`. Secret-bearing
  records are redacted, then the run HALTs.
- **Verification verdicts**: exactly `PASS | FAIL | UNKNOWN |
  BLOCKED`. Transition rule: `UNKNOWN` never becomes `PASS`;
  missing/stale evidence -> `HALT` (surfaced as BLOCKED +
  human-required). Test evidence (exit code, suite counts) never
  authorizes a protected op.
- **Domain separation**: policy-layer `DENY` and
  `REQUIRE_APPROVAL` halt before execution and do not manufacture
  verification verdicts. `BLOCKED` remains in the stable
  `VerificationVerdict` domain but is not a mapping target for
  `REQUIRE_APPROVAL`.
## 5. CLI behavior

- `sureflow init` — creates `.sureflow/{state,events,evidence,
  policy}/` + `default.json` + fixture scaffold. Refuses to
  overwrite existing state without an explicit flag. Prints what
  was created, what was verified, what needs the human.
- `sureflow run "<task>"` — consumes the already-approved T0
  fixture/acceptance contract, loads policy, creates task record in
  `.sureflow/state/tasks/`, resolves the allowlist, runs the single
  worker step jailed to the fixture, appends events/evidence, runs
  verification, prints ACCEPT or HALT + next human action.
- `sureflow status` — reads authoritative state read-only and
  renders: what happened / what was verified / what is uncertain /
  what needs the human. Never mutates.
- `sureflow verify` — re-runs the deterministic checks from stored
  evidence inputs and re-emits the verdict. `verify` failing after
  a prior ACCEPT flips the projection to HALT + human review.
- Exit codes: `0` = ACCEPT/PASS; `2` = HALT/BLOCKED/fail (so CI
  and humans can distinguish "stopped safely" from crashes).
  Unknown tool errors are `UNKNOWN` -> HALT, never silent `0`.

## 6. Worker + repair semantics

- Worker spec passed per run: objective, fixture cwd, allowlist,
  constraints, verification requirements, evidence contract.
- Enforcement is by the runner (allowlist check before each action),
  not by prompting the worker.
- Repair is driven by execution outcome, not by a verification verdict.
  Exactly one outcome is retryable: the initial `npm-test` process starts
  successfully and exits with a nonzero numeric code. Record that failed
  attempt in events, write no terminal evidence, and retry the same bounded
  step exactly once. A retry exit `0` produces terminal result `"ok"`; a
  retry nonzero exit produces `"test-failed"`. There is never a third
  attempt.
- Exit `0`, spawn failure, and signal termination are never retried. Neither
  are `DENY`, `REQUIRE_APPROVAL`, invalid fixture/request, unsupported
  `testProfile`, jail/path violation, or policy/authority failure. Spawn
  failure produces terminal result `"spawn-error"`; signal termination
  produces `"test-terminated"`.
- T4 verification runs exactly once, only after retry resolution and the
  single terminal evidence write. The initial retryable nonzero exit is
  intermediate event history and is never verification-applicable evidence.
  No repair loop or "fix-forward" improvisation is permitted.
- Protected operations (M-D3 list) produce terminal
  `REQUIRE_APPROVAL` policy halts in M1: zero execution and zero
  retry. The runtime may report that human approval is required, but M1
  cannot receive approval evidence. Model output, CLI invocation,
  `init --force`, and passing tests never substitute.
## 7. Fixture `fixtures/t0-basic/`

- The minimal `task.json` contract contains only
  `taskId`, `capability`, `target`,
  `expectedResult`, and `testProfile` when capability is
  `repo.test`. It contains no command, argv, run ID, attempt ID,
  sequence number, provider metadata, or generalized execution profile.
- `expectedResult` belongs to this acceptance contract and is
  supplied to `VerificationRequest` independently of persisted
  evidence. For T0 it is `"ok"`. Equality with the independently mapped
  successful process result is an approved contract, not runtime derivation
  in either direction.
- T8 establishes this contract before T6. T6 consumes it; it does not
  duplicate fixture data.
- `repo.read` and `repo.write` paths are hard-jailed by
  Sureflow's path resolver. `repo.test` uses closed dispatch, but
  cwd containment is not an OS sandbox: M1 does not claim that test-process
  code cannot access filesystem paths or network resources outside the
  worker root. Hard subprocess isolation is outside M1.
- Determinism rule: same fixture + same policy + same code must
  yield the same verdict. Wall-clock timestamps are recorded as
  provenance but never influence PASS/FAIL.

## 8. Acceptance criteria (M1 done = all green)

- [ ] AC-1 (happy path): `init` -> `run` on the T0 fixture ->
  `status` shows ACCEPT with test evidence; `verify` re-emits PASS.
- [ ] AC-2 (denied capability): worker step requesting anything
  outside `repo.read/write/test` is DENIED pre-execution and
  logged with policy decision.
- [ ] AC-3 (protected op): simulated protected-op request (e.g.
  fake `deploy.production`) returns
  `PolicyDecision.REQUIRE_APPROVAL` and terminally HALTs with
  zero execution and zero retry. It does not emit or map to
  `VerificationVerdict.BLOCKED`.
- [ ] AC-4 (unknown/missing evidence): deleted or corrupt evidence
  record -> `verify` emits UNKNOWN -> HALT, never PASS.
- [ ] AC-5 (repair bound): an initial started-process nonzero exit is
  preserved as an event and retries exactly once; a second nonzero exit
  writes one terminal `"test-failed"` evidence record and HALTs. No other
  failure category retries and there is never a third attempt.
- [ ] AC-6 (state authority): `status`/`verify` read only
  `.sureflow/state/`; a test mutating only `docs/STATE.md` changes
  nothing about the verdict (no dual source of truth).
- [ ] AC-7 (determinism): two consecutive clean runs produce
  identical verdicts; evidence records carry provenance.
- [ ] AC-8 (no scope creep): no multi-agent/MCP/skills/providers/
  scheduler/telemetry/cloud code paths exist; `status` proves the
  4-command surface.
## 9. Open questions (must close at spec review)

1. Package manager: npm vs pnpm vs bun — owner: human.
2. Node version pin + TS config strictness (`strict: true`
   proposed) + zero-`any` guardrail — owner: human.
3. Test runner for AC-1..AC-8 (vitest proposed, not assumed) +
   typecheck/lint commands for the quality gate — owner: human.
4. Exact JSON schemas for task/policy/event/evidence records
   (field names above are binding intent; key order/naming
   finalized at review) — owner: human + agent.
5. Exit-code `2`-for-HALT convention + `status` output format —
  owner: human.
6. Initial-commit scope (docs + ADR + spec + records, no code) —
  owner: human via `pk:commit`.

## Addendum: M1 §9 toolchain decisions (human, 2026-09-20)

Human closed §9 items 1–3 and 5 as follows (items 4, 6 partially open):

- **Package manager**: npm. **Runtime**: Node.js 24.x. T1 pins the
  exact project Node version via `engines` + lockfile.
- **TypeScript**: `strict: true`. **Production code**: no `any`.
- **Test runner**: Vitest. **Typecheck**: `tsc --noEmit`.
  **Lint**: ESLint.
- **JSON keys**: camelCase.
- **CLI contract**: exit `0` = accepted/pass; exit `2` = controlled
  halt/blocked/failure. `status`: concise human-readable default;
  machine-readable JSON form allowed where useful; no M1
  presentation over-design.
- **AC-2 clarified**: DENY is a policy decision, not a fifth
  verifier verdict. Verifier verdicts remain exactly
  PASS / FAIL / UNKNOWN / BLOCKED.
- **Still open for T1**: exact Node patch pin, JSON schema key
  names (camelCase convention set), `status` field layout,
  initial `package.json` script names. T1 resolves, human confirms.

## 10. Verification plan

- T1–T5 are committed through `e035cde`; the canonical history
  reconciliation is committed at `d5e7bcb`.
- This T6 preflight correction is documentation-only. Verify exact
  documentation scope, required contract markers, links, dependency order,
  and `git diff --check` before requesting `pk:commit`.
- T8 must establish and verify the minimal T0 fixture contract before T6.
- T6 must consume that contract and execute the existing AC verification
  plan without broadening the approved M1 boundary.
