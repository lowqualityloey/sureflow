# Sureflow Benchmarks

> Measurement policy for Sureflow engineering performance, efficiency, quality, and cost.

## Purpose

Sureflow optimizes **accepted engineering outcomes**, not token consumption in isolation.

The primary benchmark is:

> **Cost Per Accepted Change (CPAC)**

A benchmark is only useful when its measurement method, environment, task, model/provider, and evidence are recorded.

## Principles

1. Measure accepted changes, not generated code.
2. Separate measured values from estimates.
3. Record the exact environment.
4. Use repeatable task sets.
5. Compare equivalent tasks and acceptance criteria.
6. Track rework and human intervention.
7. Do not optimize tokens at the expense of correctness.
8. Preserve failed runs and uncertainty.
9. Keep historical results identifiable.
10. Benchmark the whole engineering loop.

## Metrics

### Primary

| Metric | Definition |
|---|---|
| CPAC | Total measured engineering cost / accepted changes |
| Accepted Change Rate | Accepted changes / completed attempts |
| Defect Escape Rate | Defects found after acceptance / accepted changes |
| Rework Rate | Attempts requiring additional implementation cycles / accepted changes |
| Human Intervention Rate | Tasks requiring intervention beyond defined approval gates |
| End-to-End Time | Task start to accepted result |
| Agent Turns | Agent interaction turns |
| Repair Cycles | Automated repair attempts before verification passes |
| Verification Pass Rate | Runs passing all required verification gates |
| Context Efficiency | Useful task-relevant context relative to context consumed |
| Token Cost | Provider-reported tokens where available |

### Secondary

- files read and changed
- tool calls
- context loaded and discarded
- skills activated
- MCP calls
- worker count and parallelism
- synthesis cost
- verification cost
- failed verification attempts
- blocked/halted tasks
- human approvals
- merge conflicts
- rollback/recovery events

## Measurement status

Every value must be labelled:

- `measured` — provider/runtime telemetry
- `derived` — calculated from measured values
- `estimated` — explicit estimation method
- `heuristic` — approximate operational estimate
- `unavailable` — not exposed by the environment

Never present an estimate as measured telemetry.

## Token accounting

When available, record:

```text
input tokens
output tokens
cached input tokens
cached output tokens
```

When unavailable, estimates may cover context, tool, skill, MCP, and control
payloads, but must be labelled.

Token reduction alone is not success. A lower-token run that increases
defects, rework, or human effort is not an efficiency improvement.

## CPAC

Make the cost model explicit:

```text
CPAC =
  model/provider cost
  + attributable tool/provider cost
  + execution cost
  + verification cost
  + human-effort proxy
  --------------------------------
        accepted changes
```

If a component cannot be measured, report it as unavailable rather than
inventing precision.

## Benchmark task classes

### T0 — Trivial
Documentation, formatting, localized configuration, small syntax correction.

### T1 — Localized implementation
Isolated bug fix, small feature, single-component change, focused test addition.

### T2 — Controlled change
Authentication, database migration, public API change, multi-component feature,
architectural refactor.

### T3 — Release-critical
Production deployment, release configuration, high-impact contract change,
or high-risk migration.

Each task should define:

```text
objective
non-goals
acceptance criteria
required verification
risk level
expected affected area
```

## Comparison protocol

For controlled comparisons:

1. Use the same repository revision.
2. Use equivalent task descriptions and acceptance criteria.
3. Record model/provider and version.
4. Record host/tool configuration.
5. Record stack and dependency versions.
6. Record repository state.
7. Use enough repetitions to expose variance.
8. Preserve failed runs.
9. Compare accepted outcomes, not only successful generations.

Do not compare materially different task constraints and call the result
an apples-to-apples benchmark.

## Multi-agent benchmarks

Compare multi-agent execution against an equivalent single-worker baseline.

Record:

```text
worker count
parallelism
worker objectives
worker context
worker permissions
coordination/synthesis cost
merge/conflict cost
verification cost
wall-clock time
total tokens
accepted outcome
```

Parallelism is useful only when time/context savings justify coordination,
merge, and verification cost.

## Context benchmarks

Measure both:

**Context consumed**
- tokens
- files/symbols
- tool results
- documentation
- skills
- MCP results

**Context usefulness**
- required information found
- irrelevant information
- missing information
- re-fetches
- context-induced rework
- verification failures from insufficient context

Target **minimum sufficient context**, not minimum possible context.

## Quality benchmark

A task does not count as accepted because a model reports success.

Applicable evidence may include:

- tests
- typecheck
- build
- lint
- schema/migration checks
- security checks
- review
- visual verification
- acceptance-criteria verification
- required human approval

## Statistical reporting

For repeated experiments report, where appropriate:

- number of runs
- median
- mean
- dispersion
- min/max
- failure count
- invalid/rejected runs
- confidence intervals when supported

Do not use a single best run as representative performance.

## Benchmark record

```yaml
benchmark_id:
date:
repository_revision:
sureflow_revision:
task_id:
risk_level:
context_level:
model:
provider:
model_version:
host:
stack:
task_description:
acceptance_criteria:
runs:
measurement_status:
tokens:
tool_calls:
workers:
repair_cycles:
human_interventions:
verification:
accepted:
defects_found:
elapsed_time:
cost:
notes:
```

## Historical measurements

Identify historical results by date, Sureflow revision, repository revision,
benchmark revision, and environment.

If the methodology changes, create a new benchmark revision. Do not silently
replace historical figures.

## What not to claim

Do not claim:

- token reduction without measured evidence
- quality improvement from token reduction alone
- lower cost without a defined cost model
- faster development from wall-clock estimates alone
- superior multi-agent performance without a controlled baseline
- better autonomous behavior from a single demonstration

## Initial benchmark roadmap

1. Session/task event logging
2. Provider token telemetry
3. Verification evidence capture
4. Accepted-change tracking
5. CPAC calculation
6. Repeatable fixtures
7. Single-worker baseline
8. Multi-worker comparison
9. Context-efficiency analysis

Do not build a large analytics platform before the underlying measurements
are trustworthy.
