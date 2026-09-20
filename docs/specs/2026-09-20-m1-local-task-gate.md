# M1 Spec: Deterministic local task gate (FINAL FOR REVIEW)

<a id="PLAN-m1-local-task-gate"></a>

- **Author**: Cline (AI coding agent)
- **Status**: Approved by human 2026-09-20 — implementation planning authorized; implementation start still gated on §9 toolchain answers
- **Created**: 2026-09-20
- **Target Release**: M1 (first useful vertical slice)
- **Task Record**: `docs/tasks/2026-09-20-m1-local-task-gate.md`
- **Decisions**: `docs/adrs/2026-09-20-stack-and-m1-boundary.md` (M-D1..M-D5)
- **Stack**: TypeScript + Node.js (human decision M-D1; package manager,
  Node pin, TS config, test runner NOT yet decided — see §9)

## 1. Objective

Prove the smallest end-to-end control-plane loop on an isolated
fixture: human request -> control plane -> task/state -> scoped
execution -> evidence -> deterministic verification -> ACCEPT or HALT.

## 2. Scope (bounded — user-confirmed)

- **Commands (4 only)**: `init`, `run`, `status`, `verify`.
- **Policy**: static default-deny file + explicit human approval gate.
- **Execution**: one disposable worker, allowlisted capabilities.
- **Evidence**: append-only JSONL event/evidence log.
- **Verification**: deterministic runner; PASS / FAIL / UNKNOWN /
  BLOCKED; UNKNOWN or missing evidence -> HALT.
- **Repair**: max 1 automated retry, then HALT + human.
- **Fixture**: `fixtures/t0-basic/`, minimal and deterministic.
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
- **Capabilities (M1 allowlist)**: `repo.read`, `repo.write`
  (fixture-scoped), `repo.test`. Everything else (incl. `git.push`,
  `deploy.*`, `db.migrate`, `secret.*`, `network.external`) is
  denied in M1. Worker cwd is jailed to `fixtures/t0-basic/`.
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
## 5. CLI behavior

- `sureflow init` — creates `.sureflow/{state,events,evidence,
  policy}/` + `default.json` + fixture scaffold. Refuses to
  overwrite existing state without an explicit flag. Prints what
  was created, what was verified, what needs the human.
- `sureflow run "<task>"` — loads policy, creates task record in
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
- Repair: on FAIL, exactly one automatic retry of the same bounded
  step is permitted (M-D3). Second failure, any protected-op hit,
  any denied capability, or any UNKNOWN -> HALT, preserve evidence,
  require human. No repair loops, no "fix-forward" improvisation.
- Human approval gate: protected ops (M-D3 list) always BLOCK
  pending explicit human approval evidence; model output or a
  passing test never substitutes.
## 7. Fixture `fixtures/t0-basic/`

- Minimal deterministic task: worker writes `output.txt` (or
  equivalent marker) inside the fixture; `verify` asserts exact
  content + records exit-code evidence. Fixture contains its own
  `task.json` (objective, acceptance, verify command) so M1 needs
  no stack adapter and never touches Sureflow's own source tree.
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
  fake `deploy.production`) BLOCKS pending human approval; no
  approval evidence -> HALT, never ACCEPT.
- [ ] AC-4 (unknown/missing evidence): deleted or corrupt evidence
  record -> `verify` emits UNKNOWN -> HALT, never PASS.
- [ ] AC-5 (repair bound): failing fixture step retries exactly
  once, then HALTs with preserved evidence + human next-action.
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

## 10. Verification plan (no code yet)

- This turn: ADR + spec + two Task Records written; STATE.md
  synced; `git status` inspection; no implementation files added.
- At review: human approves AC-1..AC-8 + §9 answers.
- After approval: implement strictly inside the boundary, then
  execute AC-1..AC-8 for real with `tsc`, tests, and lint evidence.
