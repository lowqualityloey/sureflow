# Sureflow Capability Roadmap

This document records Sureflow capability direction across milestones. It is
planning context, not execution authority, current-state authority, a task
contract, or implementation authorization.

## Authority separation

- `ARCHITECTURE.md` records long-term architectural direction.
- `ROADMAP.md` records capability planning, implementation status, candidates,
  deferrals, and rejected or superseded direction.
- `docs/STATE.md` records current execution state.
- `docs/tasks/**` records currently authorized milestone and task work.

Knowledge may guide execution, but only the control plane and explicit human
authority grant capability authority.

## Status model

- **IMPLEMENTED** — accepted and integrated behavior.
- **SELECTED** — chosen for the next milestone; implementation remains
  separately gated.
- **CANDIDATE** — viable future capability under consideration.
- **DEFERRED** — intentionally postponed until dependencies or evidence exist.
- **REJECTED** — explicitly excluded from the current product direction.
- **SUPERSEDED** — replaced by another capability or design.

`CANDIDATE` and `DEFERRED` do not represent committed implementation.

## Implemented baseline

### M1 — IMPLEMENTED

The accepted deterministic local task gate provides:

- a default-deny policy boundary;
- authoritative `.sureflow/state/` runtime state;
- append-only evidence and event history;
- deterministic verification and fail-closed outcomes;
- bounded worker execution with the accepted retry and halt semantics.

M1 remains a bounded local Node/TypeScript/npm capability. It does not claim
an OS sandbox, arbitrary shell execution, network isolation, multi-agent
orchestration, provider/MCP integration, or generalized workflow execution.

### M1.1 — IMPLEMENTED

Accepted reliability hardening provides:

- Node 24 CI and type alignment;
- runtime namespace and symlink containment;
- interruption-safe atomic state replacement;
- project mutation exclusion;
- explicit event-corruption surfacing;
- truthful source-install and `init --force` documentation.

### M2 — IMPLEMENTED

The accepted real-project change gate provides:

- one standalone Node/TypeScript npm project shape;
- immutable, hashed task-contract authority;
- bounded replacement of one existing tracked file;
- Git-visible scope verification;
- aggregate evidence verification;
- fail-closed acceptance and read-only verification.

M2 remains bounded to its accepted single-target contract. It does not claim
multi-file mutation, ignored-file enforcement, arbitrary-stack support,
generalized orchestration, or an OS/filesystem/network sandbox.

### M3 — IMPLEMENTED

The accepted and merged M3 core provides:

- npm and narrow pnpm project support;
- a closed adapter/kernel boundary;
- public read-only structural preflight;
- bounded verification execution with cancellation and time limits;
- EvidenceRecord v2;
- project-input and verification-plan binding;
- independent npm and pnpm acceptance through the public CLI.

M3 remains limited to independent Node/TypeScript npm and narrow pnpm project
shapes, one bounded existing-file change, and the accepted fixed verification
profiles. It does not claim workspaces, multi-file mutation, package-manager
installation as a product capability, hermetic execution, descendant process
isolation, automatic repair/retry, provider integration, skills, MCP, or
generalized orchestration.

## Current M4 candidates

These capabilities are **CANDIDATE** only. None is selected or authorized for
implementation.

### A. Bounded multi-file delivery — CANDIDATE

Allow one authorized task to modify a finite declared set of files.

Key concerns include explicit path authority, preimage binding, post-write
scope verification, partial-failure semantics, and merged-state verification.

### B. JIT skills and knowledge layer — CANDIDATE

Select and load only relevant local engineering knowledge. Knowledge remains
distinct from authority:

- installed does not mean active;
- metadata should be inspected before body loading;
- only the minimum applicable knowledge should be loaded;
- skills may request capabilities but cannot grant them;
- no skill may reduce verification, risk, or scope requirements;
- no remote marketplace is required.

Potential knowledge domains include authentication, APIs, data, debugging,
refactoring, performance, test isolation, Next.js, Supabase, Vercel, Render,
Go, Rust, Expo, and Flutter. This is not a wholesale PromptKit migration.

### C. Bounded project mutation v2 — CANDIDATE

Potentially extend bounded mutation with declared new-file creation, controlled
file deletion, and tightly controlled dependency mutation. Deterministic
package-manager ownership must be preserved; arbitrary shell is not an
acceptable substitute.

### D. Investigation and debugging expansion — CANDIDATE

Allow bounded progressive read-only exploration before determining the actual
mutation target. Investigation must not itself grant mutation authority.

### E. Bounded repair — CANDIDATE

Allow limited repair after failed verification. The default design direction is
an initial attempt followed by at most two bounded repairs, with the same or
narrower authority, then HALT after budget exhaustion. No infinite autonomous
loop is intended.

### F. Human presentation layer — CANDIDATE

Present structured truth clearly without weakening control semantics. A default
presentation may answer:

- What happened?
- What was verified?
- What remains uncertain?
- What needs me?
- What happens next?

Possible presentation concepts are `TL;DR`, `STATUS`, `VERIFIED`,
`UNCERTAINTY`, `CHANGES`, and `NEXT`. Presentation is a projection of
structured truth and must never become authority.

### G. Evidence-derived telemetry and measurement — CANDIDATE

Derive truthful operational measurements from execution and evidence, such as
duration, attempts, repair cycles, verification outcomes, changed-path counts,
human interventions, worker count, parallelism, provider usage when available,
and CPAC inputs.

Every value must retain a provenance classification: `measured`, `derived`,
`estimated`, `heuristic`, or `unavailable`. Estimated telemetry must never be
presented as measured. No mandatory cloud telemetry platform is implied.

## Deferred capabilities

These capabilities are **DEFERRED** unless selected by a later approved
milestone.

### A. Bounded autonomous task sequencing

Continue through several individually authorized operations inside a finite
session or feature envelope. Likely requirements include an explicit session
envelope, finite sequencing, stop conditions, state/evidence per step, no
authority expansion, integration verification, and no auto-resume daemon.

This is not currently implemented.

### B. Parallel workers and auto-waves

Execute independent workers concurrently only with worker isolation, explicit
independence assumptions, integration verification, synthesis contracts,
shared-surface awareness, cost/benefit measurement, and safe sequential
fallback.

Worker GREEN must never substitute for integrated-state verification. Parallel
execution is not currently implemented.

### C. Controlled Git and pull-request operations

Potential future bounded commit preparation, push, pull-request creation, and
merge approval gates. Remote side effects always require explicit authority.

### D. Release and deployment gate

Potential future deployment planning, pre-deploy verification, explicit
production approval, and provider-specific knowledge. Deployment guidance does
not grant deployment authority.

### E. Workspaces and monorepos

Potential future support for pnpm workspaces and multi-package project
boundaries. This is not part of accepted M3 behavior.

### F. Additional technology adapters

Potential future adapters may be considered for Python, Go, Rust, mobile
stacks, and other project systems only after demonstrated need and separate
acceptance.

## PromptKit OS relationship

PromptKit OS is a knowledge and process predecessor. Sureflow does not port
PromptKit wholesale.

### Absorbed into control-plane primitives

Concepts such as routing, checkpoints, task/state, verification, and authority
boundaries may inform control-plane primitives when separately designed and
accepted.

### Potential knowledge-plane assets

Debugging, refactoring, authentication, API, data, performance, design,
stack, deployment guidance, and selected artifact templates may become
knowledge-plane assets.

### Not automatically ported

- the PromptKit workflow directory;
- the PromptKit template directory;
- a universal slash-command model;
- profile, onboarding, or tutor workflows;
- a large Markdown ceremony surface.

The governing rule is: knowledge may guide; the Sureflow kernel authorizes.

## Human UX principles

Future capability work should preserve:

- concise default output;
- detailed evidence on demand;
- TL;DR-first comprehension;
- clear PASS, FAIL, UNKNOWN, and HALT distinctions;
- explicit uncertainty;
- visually obvious human-required decisions;
- no decorative metric without provenance;
- no presentation layer overriding evidence or state.

PromptKit telemetry-card formatting is not a runtime requirement. Formatting is
replaceable; semantic truth is durable.

## Telemetry principles

Sureflow optimizes accepted engineering outcomes, not token minimization alone.
The primary conceptual benchmark is Cost Per Accepted Change (CPAC).

Possible measurements include accepted-change rate, defect escape rate,
rework, human intervention, end-to-end time, turns, repair cycles,
verification pass rate, context efficiency, token usage or cost,
worker/parallelism cost, and merge or integration failures.

No metric is authoritative without known provenance. No telemetry daemon,
database, or cloud platform is required by this roadmap.

## Provisional capability ordering

The current provisional dependency direction is:

```text
single bounded task
  → richer project/task capability
  → bounded sequential autonomy
  → parallel execution
```

This ordering is provisional. It does not assign final milestone numbers.
Parallelism introduces worker-isolation, synthesis, conflict, integration, and
cost-control requirements that must be resolved first.

## Milestone labeling

M4 selection remains pending architecture planning. Later capabilities such as
bounded sequential autonomy and parallel workers remain unassigned candidates.
Milestone numbers must not be frozen merely because they have been discussed.

## Current boundary

M3 is complete, merged, documented, and cleaned up. No M4 or later capability
is selected or authorized by this roadmap. Future implementation requires a
separate approved plan, task record, scope, verification evidence, and human
authorization.
