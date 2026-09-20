# Contributing to Sureflow

Thank you for contributing to Sureflow.

Sureflow should remain a **small, deterministic engineering control plane**,
not a large collection of agent prompts, workflows, providers, or infrastructure.

The most valuable contributions improve the control model without making the
core unnecessarily complex.

## Before contributing

Read:

1. [`README.md`](README.md)
2. [`ARCHITECTURE.md`](ARCHITECTURE.md)
3. [`SECURITY.md`](SECURITY.md)
4. [`BENCHMARKS.md`](BENCHMARKS.md)

Before proposing a subsystem, identify which existing architectural boundary
should own the behavior.

## Core principles

1. Policy owns authority.
2. Context should be minimum sufficient.
3. Risk and context are independent.
4. Workflows express intent, not authority.
5. Capabilities define actions.
6. Skills provide knowledge, not authority.
7. Workers are disposable; state is durable.
8. Multi-agent execution is optional and cost-gated.
9. Evidence is stronger than model confidence.
10. Deterministic verification should remain deterministic.
11. Human approval remains explicit where required.
12. MCP is optional and an external provider.
13. Token efficiency must not reduce correctness.
14. Every subsystem must justify its complexity.

## Contribution philosophy

Prefer:

```text
small contract
+
clear boundary
+
measurable behavior
+
minimal implementation
```

over:

```text
large framework
+
many abstractions
+
automatic behavior
+
unclear authority
```

If an existing capability, adapter, policy, or workflow can solve the problem,
prefer extending it over creating a new subsystem.

## Core vs adapters

The core should contain genuinely cross-project mechanisms such as:

- policy evaluation
- state management
- capability resolution
- context resolution
- task orchestration
- evidence handling
- verification contracts
- authority handling
- worker lifecycle
- event recording

Technology-specific behavior normally belongs in adapters or skills.

## Stack adapters

Stack-specific knowledge belongs in Stack/Project Adapters.

Examples:

```text
Next.js
Astro
Python
Rust
Go
PostgreSQL
SQLite
Supabase
Vercel
Render
```

An adapter should provide only mechanisms relevant to its stack. Do not move
technology-specific assumptions into the core merely because a stack is common.

## Skills and recipes

Use skills or recipes for reusable engineering knowledge.

A skill should define:

```text
what it applies to
what it requires
what it provides
what capabilities it requests
what risk it introduces
what evidence it expects
```

Skills must not silently grant authority.

## Workflows

Workflows describe engineering intent, not authority.

A workflow should make clear:

- objective
- applicable risk/context
- inputs
- outputs
- verification
- failure/stop conditions
- authority requirements

Avoid creating a workflow for every small variation. Prefer adapters when the
difference is stack-specific.

## Capabilities

Before adding a capability, answer:

```text
What action does it represent?
Why is an existing capability insufficient?
What authority does it grant?
What is its failure mode?
How is it verified?
How is it tested?
```

Avoid broad capabilities such as:

```text
do_anything
full_access
admin
```

unless a tightly controlled runtime boundary explicitly requires an equivalent.

## Providers

Providers may include model, tool, context, MCP, or evidence providers.

Providers should implement stable contracts rather than leak provider-specific
assumptions throughout the core.

A provider must not become a hidden authority layer.

## MCP

MCP integrations should remain optional.

Document:

- tools exposed
- capabilities required
- data accessed
- external side effects
- credentials
- trust assumptions
- failure behavior

Do not make MCP mandatory for functionality that native tools can provide.

## State changes

Durable state is architectural state.

Changes to state schemas require consideration of:

1. schema/versioning
2. migration or compatibility
3. projections
4. recovery
5. tests
6. documentation

Do not create a competing source of truth.

## Evidence changes

Keep evidence distinct from:

- model confidence
- human approval
- policy authorization
- task completion claims

When evidence semantics change, document its source, provenance, freshness,
uncertainty, verification status, and authority relationship.

## Security

Security-sensitive changes should include negative tests.

Consider:

- unauthorized capabilities
- prompt injection
- secret leakage
- hostile providers/skills
- destructive commands
- remote side effects

See [`SECURITY.md`](SECURITY.md).

## Testing

Use the smallest test level that proves the behavior:

```text
unit
  ↓
integration
  ↓
end-to-end
```

Do not add expensive end-to-end tests when a deterministic lower-level test
provides sufficient evidence.

Security and authority changes should include negative-path tests.

## Verification

Run the repository's actual applicable checks.

Typical categories include:

```text
test
lint
typecheck
build
security checks
```

Do not assume these commands exist, and do not claim a check passed unless it
was actually executed.

## Benchmarking

Claims about token use, context retrieval, orchestration, verification cost,
wall-clock time, repair cycles, human effort, or accepted-change rate require
evidence.

See [`BENCHMARKS.md`](BENCHMARKS.md).

Do not report estimated values as measured telemetry.

## Pull requests

A focused PR should explain:

```text
Problem
Change
Architectural boundary
Verification
Security implications
Benchmark impact
Known limitations
```

Avoid unrelated cleanup in architectural changes unless required.

## Commit style

Use clear, atomic commits where practical:

```text
type(scope): description
```

Examples:

```text
feat(context): add dependency-aware retrieval
fix(policy): block unauthorized production actions
test(security): add hostile skill regression cases
docs(architecture): clarify capability boundaries
refactor(state): isolate event persistence
```

Do not imply verification in a commit message that did not occur.

## Documentation

Distinguish:

```text
implemented
planned
experimental
measured
estimated
```

Do not document proposals as implemented features.

Avoid duplicating large sections of `ARCHITECTURE.md`; link to the canonical
source instead.

## Design and UX

Human-facing interfaces should follow:

> **Machine complexity underneath, human simplicity on top.**

Prioritize:

1. what happened
2. what was verified
3. what is uncertain
4. what requires human action

Avoid fake confidence scores, decorative dashboards, unnecessary animation,
excessive cards, fabricated metrics, unexplained status colors, and UI that
hides consequential actions.

## Backward compatibility

Public-contract changes should consider:

- CLI behavior
- configuration
- state schemas
- provider interfaces
- capability identifiers
- skill metadata
- workflow definitions
- evidence schemas

Breaking changes should include migration guidance.

## New subsystem proposal

Before adding a subsystem, provide a short design note covering:

### Problem
What concrete problem cannot be solved adequately today?

### Existing boundary
Why does the current architecture not have a suitable owner?

### Alternatives
What simpler approaches were considered?

### Complexity
What code, state, dependencies, runtime behavior, and maintenance are added?

### Security
What new authority or attack surface is introduced?

### Measurement
How will we know it provides value?

### Removal
How can it be removed if it fails?

Prefer reversible additions.

## PR checklist

- [ ] Problem is clearly defined.
- [ ] Change has a clear architectural owner.
- [ ] No unnecessary subsystem was introduced.
- [ ] Core remains stack/provider agnostic.
- [ ] Authority boundaries remain explicit.
- [ ] Security implications were considered.
- [ ] Appropriate tests were added or updated.
- [ ] Negative tests exist for security/authority changes.
- [ ] Verification commands were actually executed.
- [ ] Docs distinguish implemented vs planned behavior.
- [ ] Benchmark data was updated when relevant.
- [ ] No unsupported performance/token claims were added.
- [ ] PR is focused.

## Development environment

The exact development commands should be defined by the implementation once
the repository exists.

Do not assume a package manager, runtime, framework, or CI provider unless the
repository has adopted it.

## Code of conduct

Contributors should communicate respectfully and focus criticism on technical
decisions, evidence, behavior, and implementation.

Technical disagreement is expected.

> **Make the core smaller, the boundaries clearer, the evidence stronger,
> and the developer's authority explicit.**
