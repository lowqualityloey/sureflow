# Sureflow Product and Capability Roadmap

This document records standing product requirements, readiness gates, and
capability direction across milestones. It is planning context, not execution
authority, current-state authority, a task contract, or implementation
authorization.

## Authority separation

- `ARCHITECTURE.md` records long-term architectural direction.
- `ROADMAP.md` records product requirements, readiness gates, capability
  planning, implementation status, candidates, deferrals, and rejected or
  superseded direction.
- `docs/STATE.md` records current execution state.
- `docs/tasks/**` records currently authorized milestone and task work.

Knowledge may guide execution, but only the control plane and explicit human
authority grant capability authority. A roadmap requirement or selected
direction does not itself authorize code changes.

## Planning vocabulary

Standing product requirements apply across milestones; they are not capability
statuses. Readiness gates are `OPEN` or `SATISFIED` according to their stated
evidence. Capability status uses the following separate vocabulary:

- **IMPLEMENTED** — accepted and integrated behavior.
- **SELECTED** — chosen for the next milestone; implementation remains
  separately gated.
- **CANDIDATE** — viable future capability under consideration.
- **DEFERRED** — intentionally postponed until dependencies or evidence exist.
- **REJECTED** — explicitly excluded from the current product direction.
- **SUPERSEDED** — replaced by another capability or design.

`CANDIDATE` and `DEFERRED` do not represent committed implementation.

## Product non-negotiables

These standing requirements guide product and milestone decisions. A supporting
mechanism does not make an entire requirement `IMPLEMENTED` or close a gate.

### PR-1 — Simple normal-user distribution

Normal users should not need to clone Sureflow, install its development
dependencies, build it manually, or locate `dist/src/cli.js`. The target is an
owned npm-distributed CLI with the simplest legitimate npm/npx invocation.
Ownership or availability of the unscoped `sureflow` package name is not
established by `package.json`. If needed, a scoped package may still expose a
`sureflow` executable. Package naming remains unresolved pending verification.

### PR-2 — First-use usability

A new user in a supported project should be able to follow `init → task
contract → preflight → run → status → verify` using current-facing documentation
and CLI guidance, without reading source, internal tests, Task Records, or
milestone specifications.

### PR-3 — Lightweight and local-first

Normal operation must not require a daemon, queue, scheduler, database, cloud
control plane, container runtime, MCP service, telemetry backend, or generalized
orchestration framework. Optional future integrations must not make them
mandatory for the basic product.

### PR-4 — Zero-cost development baseline

Normal development, testing, CI validation, and release preparation must have
a path without paid infrastructure or services. Paid options may be optional;
the baseline must not depend permanently on any provider's free-tier policy.

### PR-5 — Safety and human authority

Preserve default-deny bounded authority: evidence is not authority,
verification does not permit unrelated side effects or silently expand task
scope, and missing required truth fails closed. Remote or high-impact
operations require explicit authority. These are product constraints, not
optional milestone features.

### PR-6 — Portability without mandatory vendor lock-in

Sureflow must not require one IDE, coding agent, model, model provider, MCP
implementation, cloud provider, or application framework. Long-term
portability is direction, not a claim that today's narrow adapters already
support arbitrary projects.

### PR-7 — Real-project dogfooding

Meaningful product readiness requires acceptance on an independent real
project or equivalent clean external project environment. Unit and fixture
success alone is insufficient; record limitations and failures truthfully.

### PR-8 — Documentation truth

Current-facing documentation must distinguish implemented, experimental,
selected, candidate, deferred, and unsupported behavior. Preserve chronology
in historical records; never present future architecture as current runtime.

### PR-9 — Outcome efficiency

Optimize accepted engineering outcomes, not token minimization alone. Where
measurable, consider change quality, rework, human intervention, verification
cost, elapsed time, context/token use and cost, and Cost Per Accepted Change
(CPAC) or equivalent accepted-change measures. Classify every measurement as
`measured`, `derived`, `estimated`, `heuristic`, or `unavailable`; never invent
precise efficiency or savings claims.

### PR-10 — Complexity discipline

Justify each new subsystem's implementation, maintenance, runtime/operational,
and conceptual costs. Prefer the simpler mechanism when it achieves the
required safety and product outcome. Do not create a second generalized
framework or runtime merely because one is possible.

## Product and readiness gates

### Distribution & First-Use Gate — OPEN

Sureflow is currently source-built for normal users. There is no accepted
npm/npx distribution path that works without a Sureflow source checkout. The
gate remains `OPEN` until all of the following evidence is accepted:

- **Package identity:** Verify npm name ownership, document a scoped fallback
  if necessary, and define the actual user invocation. The name in
  `package.json` is not proof of registry ownership.
- **Version semantics:** Explicitly decide initial public or experimental
  version semantics; the placeholder `0.0.0-m1` must not accidentally define
  release policy.
- **Package construction:** Bound production tarball contents, include the
  required compiled runtime, exclude development-only, test, fixture, and
  local-state material where appropriate, and check for secret leakage.
- **CLI execution:** Verify the installed executable on declared supported
  platforms without the source tree, including entry-point executability,
  shebang behavior, and runtime imports.
- **Tarball acceptance:** Run `npm pack`, inspect that exact tarball, install it
  in an independent clean temporary project, and exercise accepted public CLI
  entry behavior from the installed package.
- **First-use acceptance:** From an independent supported project, demonstrate
  documented `init → task creation → preflight → run → status → verify` without
  relying on a Sureflow checkout. Include one accepted bounded flow and one
  deliberately invalid, fail-closed flow.
- **Real-project evidence:** Record a first-use exercise beyond internal
  repository fixtures, including limitations and failures.
- **Registry acceptance:** After separately authorized publication, prove the
  documented npm/npx invocation from a clean environment. A successful local
  tarball exercise alone does not close this portion of the gate.
- **Cost:** The normal package, test, and release-verification path requires
  no paid infrastructure.

While this gate is `OPEN`, Sureflow should not select another major
capability-expansion milestone unless the human maintainer explicitly overrides
the gate and records why. It does not prevent bug or security fixes,
maintenance, documentation corrections, test improvements, packaging/release
work, or work needed to satisfy the gate. This planning rule does not itself
authorize implementation or publication.

### Future milestone-selection checklist

Before a proposed capability milestone becomes `SELECTED`, answer:

1. **User value:** What real user problem does it solve?
2. **Distribution:** Does normal installation or first use improve, worsen, or
   stay unchanged?
3. **Safety and authority:** What new authority, side effects, or failure modes
   arise?
4. **Portability:** Is any vendor, tool, or framework coupling made mandatory?
5. **Infrastructure and cost:** Does normal use or development require a new
   service or paid infrastructure?
6. **Complexity:** What permanent subsystem or maintenance surface is added;
   is there a simpler alternative?
7. **Dogfood and acceptance:** How will an independent real project demonstrate
   the capability?
8. **Verification:** What proves integrated behavior, not just component
   success?
9. **Documentation:** Which current-facing claims need reconciliation?
10. **Measurement:** Which useful outcomes are measurable, and which are
    honestly `unavailable` for now?

Technical interest alone is not a reason to make a capability `SELECTED`.

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

### M4 (Capability A) — Bounded multi-file delivery — IMPLEMENTED

Schema-v2 tasks can replace exact bytes in 2–5 declared existing tracked UTF-8
files in one supported standalone Node/TypeScript npm or narrow pnpm project.
Complete-set preflight runs before project writes; apply-time revalidation,
deterministic path order, exact Git-visible set certification, per-target
readback/evidence, and bounded fixed verification checks are part of the flow.
A later failure may leave an applied prefix: the set is not transactional and
has no automatic rollback. Schema-v1 single-target behavior remains supported.
M4-T1–T6 are accepted and integrated into `main`.

The [M4 specification](docs/specs/2026-09-23-m4-bounded-multi-file-delivery.md)
defines the behavioral baseline; the [Task Record](docs/tasks/2026-09-23-m4-bounded-multi-file-delivery.md)
records the accepted implementation and closeout evidence.

## Selected next milestone

**NONE.** No M5 or other numbered milestone is selected or authorized.
Distribution and first-use readiness is the recommended prerequisite to the
next major capability expansion, not implementation authorization. The next
milestone's name and number remain undecided pending separate selection and
planning.

## Capability candidates

The following capabilities remain **CANDIDATE**, not selected or authorized.
Distribution and first-use readiness is a requirement and gate above, not an
optional candidate.

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
structured truth and must never become authority: **structured truth → concise
human projection**. Implementing M4-A does not implement or discard this
candidate.

### G. Evidence-derived telemetry and measurement — CANDIDATE

Derive truthful operational measurements from execution and evidence, such as
duration, attempts, repair cycles, verification outcomes, changed-path counts,
human interventions, worker count, parallelism, provider usage when available,
and CPAC inputs.

Every value must retain a provenance classification: `measured`, `derived`,
`estimated`, `heuristic`, or `unavailable`. Estimated telemetry must never be
presented as measured: **runtime facts → provenance-aware measurement**. No
mandatory cloud telemetry platform is implied. Implementing M4-A does not
implement or discard this candidate.

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

## Measurement and UX principles

Current and future work should preserve:

- concise default output;
- detailed evidence on demand;
- TL;DR-first comprehension;
- clear PASS, FAIL, UNKNOWN, and HALT distinctions;
- explicit uncertainty;
- visually obvious human-required decisions;
- no presentation layer overriding evidence or state.

PromptKit telemetry-card formatting is not a runtime requirement. Formatting is
replaceable; semantic truth is durable.

Sureflow optimizes accepted engineering outcomes, not token minimization alone.
Cost Per Accepted Change (CPAC) is a conceptual benchmark, not an asserted
measured result. See [BENCHMARKS.md](BENCHMARKS.md) for methodology.

Possible measurements include accepted-change rate, defect escape rate,
rework, human intervention, end-to-end time, turns, repair cycles,
verification pass rate, context efficiency, token usage or cost,
worker/parallelism cost, and merge or integration failures.

No metric is authoritative without `measured`, `derived`, `estimated`,
`heuristic`, or `unavailable` provenance. Estimated data must not appear as
measured. No telemetry daemon, database, or cloud platform is required.

## Provisional capability ordering

The current provisional dependency direction is:

```text
bounded trusted core
  → product/readiness gate
  → richer project/task capability
  → bounded sequential autonomy
  → parallel execution
```

This ordering is provisional. It does not assign final milestone numbers.
Parallelism introduces worker-isolation, synthesis, conflict, integration, and
cost-control requirements that must be resolved first.

## Milestone labeling

M1, M1.1, M2, M3, M4, and the separate post-M4 size remediation are complete.
No M4-T7 or next milestone is authorized. Future capabilities remain candidates
or deferred work until separately selected, scoped, and authorized.

## Current boundary

M4 is integrated into `main`. PR #6 integrated the implementation and PR #7
reconciled the current STATE projection; see [docs/STATE.md](docs/STATE.md)
and the completed [M4 Task Record](docs/tasks/2026-09-23-m4-bounded-multi-file-delivery.md).
No next milestone is currently authorized.
