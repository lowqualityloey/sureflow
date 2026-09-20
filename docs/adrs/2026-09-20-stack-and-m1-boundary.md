# ADR-001: M1 stack, tracking, protection, state authority, fixture

- **Status**: Accepted (explicit human decision, 2026-09-20)
- **Date**: 2026-09-20
- **Deciders**: Human (authority); Cline (recorder)
- **Scope**: Sureflow M1 (deterministic local task gate)

## Context

M0 discovery (`docs/specs/2026-09-20-sureflow-discovery-intake.md`)
left five decisions open (M-D1..M-D5). The human answered all five
on 2026-09-20. This ADR records them verbatim as human decisions,
not inferred agent defaults.

## Decisions

- **M-D1 Stack**: TypeScript + Node.js. Rationale (human): Sureflow is
  primarily a CLI/control-plane runtime; intended install is
  `npx sureflow init`; TypeScript gives strong contracts for state,
  policy, capabilities, evidence, adapters. NOT decided: package
  manager, Node version pin, TS config strictness, test runner.
- **M-D2 Tracking**: Local tracking for M1. No GitHub/Linear/Jira or
  other remote tracking in M1. External tracking may become an
  adapter later.
- **M-D3 Protected ops + repair budget**: Protected: production
  deployment; protected-branch merge; production database/schema
  mutation; destructive filesystem operations; credential/secret
  operations. Repair budget: max 1 automatic retry; then HALT +
  human intervention. Not a general autonomy policy.
- **M-D4 State authority**: `.sureflow/state/` is the authoritative
  Sureflow runtime state. `docs/STATE.md` (PromptKit tracker) is NOT
  authoritative runtime state. No dual authoritative state. A future
  Markdown projection must derive from authoritative state.
- **M-D5 Fixture repo**: Dedicated isolated fixture
  `fixtures/t0-basic/`. Never use Sureflow's own source tree as the
  M1 behavioral fixture. Fixture is minimal and deterministic.

## Addendum: §9 toolchain (human, 2026-09-20)

npm; Node 24.x (exact pin via engines+lockfile in T1); TS strict,
no-any prod code; Vitest; `tsc --noEmit`; ESLint; camelCase JSON;
exit 0 = accept/pass, 2 = halt/blocked/fail; concise human status +
optional JSON; AC-2 DENY = policy decision (verdicts stay 4).

## Consequences

- M1 spec targets TS/Node with local-only state, 5 protected ops,
  1-retry budget, and the isolated T0 fixture.
- Resolves discovery risks C2 (state authority), C3 (protected set),
  C5 (repair default). C1/C4/C6/C7/C8 remain open for the M1 spec.
- Package manager, Node pin, and test runner must be decided in the
  M1 spec review, not assumed.

## Non-decisions (explicitly deferred)

Multi-agent, MCP, skills, provider/stack adapters, scheduler,
autonomy levels, replay, telemetry platform, cloud infra.
