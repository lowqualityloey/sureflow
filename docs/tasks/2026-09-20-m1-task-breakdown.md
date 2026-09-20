# M1 Task Breakdown: Deterministic local task gate

<a id="TASK-2026-09-20-m1-tasks"></a>

- **Parent Task**: `TASK-2026-09-20-m1-local-task-gate`
- **Spec**: `docs/specs/2026-09-20-m1-local-task-gate.md`
- **Status**: T1–T5 complete and committed; T8 is the next dependency
  but remains gated; T6 depends on T8 and remains gated; T7 and T9–T11
  remain gated/not started; PromptKit state `checkpoint_due`
- **Scope Change**: `docs/tasks/2026-09-20-m1-local-task-gate.scope-1.md`
- **TDD Enforcement Mode**: `disabled` ( acceptance = AC-1..AC-8
  executed post-implementation with `tsc` + test + lint evidence )
## Atomic tasks (dependency-ordered, 1–4h each)

- [x] T1 Toolchain + scaffold (p0): done + committed d7a5d24; engines follow-up ^24.0.0 applied in T2 scope
  `tsconfig strict`, zero-`any` lint, test runner, `sureflow` bin
  stub. Gherkin: Given clean checkout When install+typecheck run
  Then exit 0 with pinned versions recorded.
- [x] T2 State + policy contracts (p0): done + committed 6ad617f.
  `.sureflow/state` JSON
  schemas + `default.json` (allowlist, 5 protected ops) + read/write
  helpers that refuse `docs/STATE.md` as input. AC-6 seam.
- [x] T3 Events/evidence JSONL (p0): done + committed a4f16af.
  Append-only writers, required
  fields, secret redaction -> HALT. AC-4 seam.
- [x] T4 Verifier (p0): done — pure `verifyEvidence`; selector `(taskId, capability, target)`; PASS/FAIL/UNKNOWN only (BLOCKED preserved, never manufactured); UNKNOWN-never-PASS incl. corrupt/unreadable/duplicate. Seam conflict + T6/T7 invariants: `docs/tasks/2026-09-20-t4-t6-evidence-seam.md`
- [x] T5 CLI init/status (p1): done + committed e035cde.
  `init` (no-overwrite default),
  `status` read-only 4-line view. AC-1/AC-8 seams.
- [ ] T8 Minimal T0 fixture contract (p0) — **PREREQUISITE / GATED /
  NOT AUTHORIZED**: establish `taskId`, `capability`,
  `target`, `expectedResult`, and conditional
  `testProfile: "npm-test"`. No command or argv fields. This
  contract must be approved, implemented, verified, and committed before
  T6.
- [ ] T6 CLI run + worker jail (p0) — **DEPENDS ON T8 / GATED / NOT
  AUTHORIZED**: consume the approved T8 contract; policy load, task record,
  allowlist pre-check, fixture-jailed step, evidence append,
  max-1-retry then HALT. AC-1/AC-2/AC-5 seams.
- [ ] T7 CLI verify (p0) — **PLANNED / NOT STARTED**: re-emit verdict from stored evidence;
  stale ACCEPT -> HALT. AC-1/AC-4/AC-7 seams.
- [ ] T9 Negative tests (p0) — **PLANNED / NOT STARTED**: AC-2/AC-3/AC-4/AC-5/AC-6 cases with
  exact commands + expected exit codes (0 vs 2).
- [ ] T10 Determinism + surface audit (p1) — **PLANNED / NOT STARTED**: AC-7 double-run +
  AC-8 no-deferred-codepaths proof.
- [ ] T11 Docs closeout (p2) — **PLANNED / NOT STARTED**: README status, CHANGELOG, STATE sync,
  commit scope — human approval via pk:commit.

Non-goals restated: no multi-agent/MCP/skills/providers/scheduler/
telemetry/cloud/remote tracking. Scope change needs a record.

## Authorization Boundary and Locked Invariants

- The T6 preflight correction authorizes documentation only. T8 and T6
  each require separate explicit implementation authorization; T7 remains
  gated.
- M1 public surface remains `init` / `run` /
  `status` / `verify`.
- `.sureflow/state/` is authoritative runtime state;
  `docs/STATE.md` is PromptKit/process documentation only
  and never Sureflow runtime input.
- `PolicyDecision` and `VerificationVerdict` remain
  separate domains; default-deny remains in force.
- `REQUIRE_APPROVAL` is a terminal M1 policy halt with zero
  execution and zero retry. It does not map to
  `VerificationVerdict.BLOCKED`. M1 has no approval-delivery
  mechanism.
- `repo.test` accepts only `testProfile: "npm-test"`,
  internally mapped to executable `npm` and fixed
  `["test"]` argv with
  `shell: false` and bounded-worker-root cwd.
- Path jail and closed dispatch are not an OS sandbox; M1 makes no hard
  subprocess-isolation claim.
- `UNKNOWN` never becomes `PASS`.
- Retry/intermediate observations belong in events; exactly one
  terminal verification-applicable evidence record is permitted per
  `(taskId, capability, target)`.
- `expectedResult` originates from the approved
  acceptance/fixture contract, never from evidence.
- Maximum one automatic retry.
