# Scope Change 1: T6 preflight contract correction and T8 handoff

- **Task ID**: `TASK-2026-09-20-m1-local-task-gate`
- **Record Type**: Scope Change Record / T6–T8 Handoff
- **Date**: 2026-09-21
- **Status**: Approved for documentation reconciliation only
- **Decision Owner**: Human
- **Source ADR**: `docs/adrs/2026-09-21-m1-t6-preflight-contracts.md`
- **Implementation Authorization**: None; T8, T6, and T7 remain gated

## Trigger

T6 preflight stopped before implementation because approval delivery was
undefined and T6 depended on T8-owned acceptance data plus an unsafe
free-form verify-command concept.

## Contract Correction

1. `REQUIRE_APPROVAL` is a terminal policy-layer halt in M1:
   zero execution, zero retry, no implicit or resumable approval mechanism,
   and no conversion into a verification verdict.
2. T8 moves ahead of T6 as the minimum fixture-contract prerequisite.
3. `repo.test` accepts only `testProfile: "npm-test"`,
   internally dispatched as executable `npm` with fixed
   `["test"]` argv, `shell: false`, and cwd set to the
   bounded worker root.
4. The T0 fixture owns `expectedResult` and supplies only
   `taskId`, `capability`, `target`,
   `expectedResult`, and conditional `testProfile`.
5. M1 makes no OS-sandbox claim for the test subprocess.

## Revised Dependency Graph

`T1–T5 complete -> T8 gated -> T6 gated -> T7 gated -> T9–T11 gated`

- **T8 prerequisite output**: approved minimal T0 fixture contract with no
  arbitrary command or argv.
- **T6 input**: the already-established T8 acceptance contract.
- **T7 boundary**: unchanged and not started.

## Preserved Boundaries

- `PolicyDecision` and `VerificationVerdict` remain
  separate domains.
- Default-deny, policy-before-execution, zero execution on
  `DENY`, `UNKNOWN`-never-`PASS`, maximum one
  retry, event/evidence separation, terminal evidence cardinality, and
  fixture-owned `expectedResult` remain binding.
- No run IDs, attempt IDs, sequence numbers, provider metadata, arbitrary
  commands, generic profiles, approval subsystem, or generalized event
  infrastructure is authorized.

## Changed Acceptance and Risk

- **Acceptance correction**: AC-3 now observes a policy-layer terminal halt,
  not `VerificationVerdict.BLOCKED`.
- **Dependency correction**: T8 must complete before T6.
- **Security limitation**: path jail and closed dispatch do not provide hard
  subprocess isolation.
- **Rollback**: documentation-only; revert this record and linked amendments
  before any implementation if the human changes these decisions.

## Resume Condition

After the separately authorized documentation commit, STOP. T8 remains
gated until explicitly authorized. T6 remains gated until T8 is implemented,
verified, committed, and T6 is separately reauthorized. T7 remains gated.
