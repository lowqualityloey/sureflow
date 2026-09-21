# Integration Conflict Report: T4 duplicate-evidence rule vs T6/T7

<a id="CONFLICT-t4-t6-evidence-seam"></a>

- **Date**: 2026-09-20
- **Raised by**: T4 pre-commit check (human-directed inspection)
- **Status**: RESOLVED by human decision 2026-09-20 — amendment
  applied in T4. Conflict closed; T6 writer invariant recorded below.
- **Owner**: human (decision) / T6 (writer invariant)
- **Resolution**: `(taskId, capability, target)` selector + terminal
  evidence cardinality, no ordering semantics (see below)
- **Related T6/T8 Correction**: `docs/tasks/2026-09-20-m1-local-task-gate.scope-1.md` — T8 now precedes T6 and owns the acceptance contract
- **Related second T6 preflight correction**: `docs/adrs/2026-09-21-m1-t6-preflight-contracts.md` (M-D10..M-D13) — fixed process results, retry eligibility, and terminal verification order

## Resolution (approved, applied in T4)

**Selector.** `VerificationRequest` is now
`{ taskId, capability, target, expectedResult }`. T4 selects the
verification-applicable record by the exact tuple
`(taskId, capability, target)` — all three already required fields of
the approved `EvidenceRecord` schema, so no schema machinery was
added. Exactly one applicable terminal record is still required:

| Applicable terminal records | Verdict |
|---|---|
| exactly one, `result === expectedResult` | PASS |
| exactly one, explicit differing `result` | FAIL |
| zero | UNKNOWN |
| more than one | UNKNOWN |
| any corruption/unreadable condition | UNKNOWN |

**T4/T6 writer invariant (binding for M1).** Exactly one terminal
verification-applicable `EvidenceRecord` may be persisted per
`(taskId, capability, target)`. Intermediate execution observations
and retry attempts are NOT terminal verification evidence and belong
in the approved events stream `.sureflow/events/events.jsonl`. A
retry must therefore not create multiple terminal evidence records
for the same operation. Failed attempts are preserved as events —
they are never deleted or overwritten to maintain evidence
cardinality.

**Event/evidence/verification distinction (binding).**

- Events: execution history, attempts, retry activity, intermediate
  results, operational observations.
- Evidence: the terminal observation offered to the deterministic
  verifier.
- Verification: interprets evidence only; never infers
  `expectedResult` from evidence.

**`npm-test` terminal mapping and ordering (binding).** The profile maps
exit `0` to `"ok"`, nonzero numeric exit to `"test-failed"`, spawn failure
to `"spawn-error"`, and signal termination to `"test-terminated"`. Only an
initial started-process nonzero exit retries. That first failure is an event,
not evidence. After the terminal attempt/outcome, T6 writes exactly one
terminal record and invokes T4 exactly once. The fixture independently owns
`expectedResult`; neither expectation nor evidence is derived from the other.

**Explicitly not authorized (unchanged):** run IDs, attempt IDs,
sequence numbers, latest-record semantics, reducers, event sourcing,
generic event framework, generalized evidence selectors. If T6 needs
a writer for the already-approved events stream, it stays minimal and
scoped to T6; T4 does not implement it.


## Conflict (historical — fixed by the resolution above)

`verifyEvidence()` previously returned `UNKNOWN` when more than one
evidence record matched the requested `taskId`:

> `>1 applicable record for taskId -> UNKNOWN`

The approved M1 contract does **not** guarantee exactly one
verification-applicable `EvidenceRecord` per `taskId`, so that rule
was unsafe for T6/T7.

## Evidence from the approved documents

The numbered evidence below records the historical conflict analysis. Its
earlier assumption that attempts could each be evidence is superseded by the
binding event/evidence distinction and M-D10..M-D13 above.

1. `docs/specs/2026-09-20-m1-local-task-gate.md` §4 (lines 53–57):
   each evidence record carries `capability` and `policyDecision` —
   record granularity is the **operation**, not the task. One task
   with several capability operations yields several records.
2. Same spec §2 line 28 and §6 lines 89–92: repair is
   "exactly one automatic retry of the same bounded step" — a
   first attempt plus a retry legitimately produces two records for
   one task.
3. Same spec §5 (line 70–72): `run` appends events/evidence for the
   step and *then* runs verification — nothing constrains the append
   count to one per task.
4. `docs/tasks/2026-09-20-m1-task-breakdown.md` T6: "policy load,
   task record, allowlist pre-check, fixture-jailed step, evidence
   append, max-1-retry then HALT" — multi-append, multi-attempt.
5. Scan for a guaranteeing rule (`exactly one`, `one record`,
   `per attempt`, `run id`, `sequence`) found only the retry-count
   phrase. No approved rule fixes the applicable-record cardinality.

## Impact if unchanged

- T6 legitimately writing per-capability or per-attempt records makes
  `verifyEvidence()` return `UNKNOWN` for a *successful* task →
  AC-1 (happy path ACCEPT) and AC-5 (retry bound) become
  unsatisfiable once T6/T7 wire evidence to the verifier.
- Note the direction of the failure is safe (UNKNOWN, never PASS),
  so this is not a correctness/security hole — it is a
  false-halt/false-negative integration defect.

## Proposed smallest contract correction (needs approval)

Select the verification-applicable record by the **existing**
`capability` field instead of by `taskId` alone:

- `VerificationRequest` gains `capability` (already a required field
  in the approved T3/M1 §4 record contract — no new field).
- Selector becomes `taskId === request.taskId &&
  capability === request.capability`; still requires exactly one
  matching record, else `UNKNOWN` (unchanged fail-safe behavior).
- Writer-side invariant in the T4/T6 handoff: at most **one
  verification-applicable evidence record per (taskId, capability)**.
  Intermediate/failed attempts belong in
  `.sureflow/events/events.jsonl`, which the approved spec §4 already
  separates from `evidence.jsonl`.

Explicitly NOT proposed (all rejected as unapproved schema
machinery): run IDs, attempt IDs, sequence numbers, "latest record"
semantics, reducers/projections, event sourcing.

## Preserved invariant (recorded here so T7 cannot lose it)

`expectedResult` MUST come from the approved acceptance/fixture
contract (`fixtures/t0-basic/task.json`, M-D5) and must NEVER be
derived from the evidence being verified. Also recorded as a doc
comment on `VerificationRequest` in `src/verifier.ts`.

The 2026-09-21 T6 preflight correction makes T8 a prerequisite to T6,
removes the free-form verify-command concept, and limits
`repo.test` to `testProfile: "npm-test"` with closed
dispatch. This record's evidence-cardinality rules are unchanged.
