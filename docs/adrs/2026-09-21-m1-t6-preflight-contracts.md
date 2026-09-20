# ADR: M1 T6 preflight contracts

- **Status**: Accepted
- **Date**: 2026-09-21
- **Decision Owner**: Human
- **Trigger**: T6 implementation preflight STOP
- **Scope Change**: `docs/tasks/2026-09-20-m1-local-task-gate.scope-1.md`

## Context

T6 preflight found two missing contracts before implementation:

1. `REQUIRE_APPROVAL` required explicit approval evidence, but M1
   defined no approval-delivery or validation mechanism.
2. T6 required fixture-owned acceptance data and `repo.test`, while
   the minimal T0 fixture contract was scheduled later as T8 and described
   a free-form verify command.

No T6 implementation was started. These decisions correct the approved M1
contract without adding implementation scope.

## Decisions

### M-D6: `REQUIRE_APPROVAL` is a terminal M1 policy halt

- Policy decisions remain `ALLOW | DENY | REQUIRE_APPROVAL`.
- Verification verdicts remain `PASS | FAIL | UNKNOWN | BLOCKED`.
- The domains remain separate. `REQUIRE_APPROVAL` does not map to
  `VerificationVerdict.BLOCKED`.
- `REQUIRE_APPROVAL` causes zero capability execution and no retry.
- The runtime may report that human approval is required.
- M1 has no approval flag, environment-variable approval, token, schema,
  store, authenticity check, expiry rule, or resumable approval-delivery
  mechanism. Those capabilities are deferred beyond M1.
- CLI invocation and `init --force` never imply approval.

### M-D7: T8 fixture contract precedes T6

The dependency order is:

`T1–T5 complete -> T8 minimal T0 fixture contract -> T6 run/worker -> T7 verify CLI -> T9–T11`.

Task identifiers remain stable; only dependency order changes. T8 and T6
remain gated and require separate authorization. T7 remains gated.

### M-D8: `repo.test` uses one closed M1 profile

- The only supported profile is `testProfile: "npm-test"`.
- Sureflow maps it internally to executable `npm` and fixed
  `["test"]` argv with `shell: false`.
- The process cwd is the bounded worker root.
- No caller, model, CLI argument, task field, or fixture field supplies an
  executable, argv, or command string.
- Unsupported or missing test profiles halt; there is no arbitrary-command
  fallback.
- The fixture acceptance contract owns `expectedResult`; persisted
  evidence never supplies it.

### M-D9: M1 process isolation is limited

- Sureflow hard-jails `repo.read` and `repo.write` paths
  through its path resolver.
- `repo.test` uses the closed dispatch contract above.
- cwd containment is not an OS sandbox. M1 does not claim that code executed
  by `npm test` cannot access filesystem paths or network resources
  outside the worker root.
- Hard subprocess isolation requires separately approved sandbox/container
  machinery and is outside M1.

## Minimal T0 Fixture Contract

The fixture contract contains only:

- `taskId`
- `capability`
- `target`
- `expectedResult`
- `testProfile` when `capability === "repo.test"`

It contains no arbitrary command, argv, run ID, attempt ID, sequence number,
provider metadata, or generalized execution profile.

## Consequences

- T6 cannot start until the T8 fixture contract is implemented and approved.
- Protected operations always stop at the policy layer in M1.
- `repo.test` is deterministic at the Sureflow dispatch boundary,
  but its child process is not hard-sandboxed.
- T7 and later tasks remain gated.
