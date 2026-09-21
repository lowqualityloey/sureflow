# ADR: M1 T6 preflight contracts

- **Status**: Accepted
- **Date**: 2026-09-21
- **Decision Owner**: Human
- **Trigger**: T6 implementation preflight STOP
- **Scope Change**: `docs/tasks/2026-09-20-m1-local-task-gate.scope-1.md`

## Context

T6 preflight found missing contracts before implementation:

1. `REQUIRE_APPROVAL` required explicit approval evidence, but M1
   defined no approval-delivery or validation mechanism.
2. T6 required fixture-owned acceptance data and `repo.test`, while
   the minimal T0 fixture contract was scheduled later as T8 and described
   a free-form verify command.
3. After T8 was committed, a second T6 preflight found no deterministic
   mapping from the fixed `npm-test` process outcome to terminal
   `EvidenceRecord.result`, and retry eligibility was still described in
   terms of verifier `FAIL` rather than execution outcome.

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

### M-D10: `npm-test` has a fixed process-result mapping

The closed M1 profile maps outcomes to terminal evidence independently of
fixture expectations:

| Process outcome | `EvidenceRecord.result` |
|---|---|
| ordinary exit code `0` | `"ok"` |
| any nonzero numeric exit code | `"test-failed"` |
| process creation/spawn failure | `"spawn-error"` |
| signal termination | `"test-terminated"` |

These strings belong to the profile. They are never derived from
`fixture.expectedResult`, persisted evidence, model output, or caller input.

### M-D11: only an initial started-process nonzero exit is retryable

- The single automatic retry is driven by execution outcome, never by a
  `VerificationVerdict`.
- If the initial process starts and exits with a nonzero numeric code, its
  failed observation is appended to events and the same bounded step retries
  exactly once.
- Initial exit `0`, spawn failure, and signal termination do not retry.
- `DENY`, `REQUIRE_APPROVAL`, invalid fixture/request, unsupported profile,
  jail/path violation, and policy/authority failure do not retry.
- A retry exit `0` maps to `"ok"`; a retry nonzero exit maps to
  `"test-failed"`. There is never a third attempt.

### M-D12: verification follows terminal retry resolution

The first retryable nonzero outcome is intermediate history in
`.sureflow/events/events.jsonl`; it is not terminal evidence. Only after the
operation reaches its terminal attempt/outcome may T6 write the single
verification-applicable `EvidenceRecord` for `(taskId, capability, target)`.
T4 verification then runs exactly once against that terminal evidence.

### M-D13: evidence and expectation remain independent

The T0 fixture remains the sole source of `expectedResult`, which is `"ok"`.
The `npm-test` profile independently maps exit code `0` to evidence result
`"ok"`. Their equality is approved contract data, never a runtime derivation
from evidence to expectation or expectation to evidence.

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

- T8 is committed at `a66fccc`. T6, T7, T9, and T10 were subsequently implemented and accepted under these corrected contracts; T11 closeout completes the documentation and acceptance record without adding runtime machinery.
- Protected operations always stop at the policy layer in M1.
- `repo.test` is deterministic at the Sureflow dispatch boundary,
  but its child process is not hard-sandboxed.
- Retry resolution precedes the single terminal evidence write and the one
  T4 verification call.
- T7, T9, T10, and T11 closeout are complete; future milestones remain separately gated.
