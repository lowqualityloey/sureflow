# Sureflow

> Engineering control plane for AI coding agents.
>
> **Reason freely. Act within bounds. Prove the result.**

Sureflow is a deterministic control plane for AI-assisted software development.

It sits between developers and coding agents to control:

- context
- capabilities
- task decomposition
- worker orchestration
- verification
- evidence
- human authority
- durable engineering state

Sureflow is **not another coding agent**.

It is the engineering control layer around coding agents.

---

## Why Sureflow?

AI coding agents can write increasingly capable software.

The harder problem is controlling the engineering process around them:

> What should the agent know?  
> What should it be allowed to do?  
> What context is actually necessary?  
> Should this task use one worker or several?  
> What proves the change works?  
> When should the agent stop?  
> When does a human need to decide?

Sureflow treats these as control-plane problems.

> **Let models reason. Let the control plane decide what is allowed.**

---

## How it works

```text
Human
  ↓
Command / API
  ↓
Sureflow Control Plane
  ├─ Policy
  ├─ State
  ├─ Context
  ├─ Capabilities
  ├─ Workflows
  └─ Verification
       ↓
  Stack Adapters
  Skills / Recipes
  Native Tools / MCP
       ↓
  Dynamic Worker(s)
       ↓
     Evidence
       ↓
   Verification
       ↓
  Accept / Halt
       ↓
 Human / Policy Decision
```

The model provides reasoning.

Sureflow controls the conditions under which that reasoning can act.

---

## Core principles

### Minimum sufficient context

Sureflow resolves only the context required for the task instead of loading
the entire repository and instruction set.

```text
Task
 ↓
Required context
 ↓
Relevant files / symbols / dependencies
 ↓
Relevant adapters / skills
 ↓
Worker
```

Context can escalate when the available evidence is insufficient.

### Risk and context are independent

Sureflow separates engineering risk from context depth.

```text
Risk:    R0 → R1 → R2 → R3
Context: Z0 → Z1 → Z2 → Z3 → Z4
```

A small change can require deep architectural context, while a high-risk
operation may sometimes require narrow context for a specific verification
step.

### Bounded autonomy

Workers receive scoped capabilities.

A worker may be allowed to modify code and run tests while still requiring
human approval for operations such as production deployment, protected
merges, or production database changes.

### Evidence over confidence

A model saying "it should work" is not verification.

Sureflow treats executed tests, builds, typechecks, security checks, reviews,
visual checks, and other applicable evidence as verification inputs.

### Bounded repair

Automated repair is limited.

```text
Implement
  ↓
Verify
  ↓
Repair
  ↓
Verify
  ↓
PASS / HALT
```

When sufficient evidence cannot be established, Sureflow stops rather than
pretending completion.

---

## Dynamic workers

Sureflow does not require permanent frontend, backend, security, database,
or DevOps agents.

Workers are created dynamically from the needs of the current task.

A worker can receive:

- objective
- context
- model/provider
- capabilities
- permissions
- skills
- constraints
- verification requirements
- evidence contract

Simple tasks can use one worker.

Complex tasks can use multiple workers when the expected benefit justifies
the additional token, coordination, merge, and verification cost.

---

## Skills, recipes, and stack adapters

Sureflow preserves an important architectural lesson from PromptKit OS.

PromptKit's:

```text
docs/stacks/
docs/recipes/
```

become generalized Sureflow concepts:

```text
Stack Playbooks
      ↓
Stack / Project Adapters

Boundary Recipes
      ↓
Capabilities / Skills / Recipes
```

Stack adapters contain technology-specific knowledge such as:

- detection
- commands
- conventions
- invariants
- verification
- deployment mechanisms

Skills and boundary recipes provide reusable engineering knowledge and
patterns.

They are resolved **JIT** rather than loaded into every task.

The core control plane remains technology-agnostic.

---

## Host agnostic

Sureflow can adapt to existing coding-agent environments and instruction
systems, including:

```text
CLAUDE.md
AGENTS.md
GEMINI.md
.cursor/rules
.codex/
```

Existing project and host conventions take precedence.

---

## MCP is optional

MCP can provide additional capabilities, but it is not the control plane
and is not required.

```text
Sureflow
   ↓
Policy
   ↓
Capability filter
   ↓
MCP provider
```

Sureflow can operate with:

- native tools
- MCP
- multiple MCP providers
- no external providers

---

## Frontend design

When a project has no authoritative `DESIGN.md`, Sureflow provides a
default design baseline.

Resolution order:

```text
Project DESIGN.md
      ↓
Existing design system
      ↓
Detected UI conventions
      ↓
Sureflow Design Baseline
```

The project always takes precedence.

The default baseline emphasizes:

- visual hierarchy
- readable typography
- restrained visual language
- responsive layouts
- accessibility
- keyboard navigation
- visible focus
- meaningful UI states
- reduced motion
- content resilience

It also discourages common AI-generated design patterns such as excessive
gradients, glassmorphism, uniform card grids, fake browser chrome,
decorative UI, arbitrary metric cards, and animation for its own sake.

---

## Durable state

Agent sessions are disposable.

Engineering state is not.

```text
.sureflow/
├── state/
├── evidence/
├── events/
├── views/
└── policy/
```

Structured state is authoritative.

Human-readable views are projections.

This allows work to survive:

- model changes
- provider changes
- worker replacement
- interrupted sessions
- IDE changes

---

## Token efficiency

Sureflow tracks token usage where provider telemetry is available and labels
estimates when it is not.

Relevant measurements include:

- input/output tokens
- context tokens
- tool results
- skill/MCP usage
- discarded context
- turns
- workers
- repair cycles
- verification cost

The primary engineering metric is:

> **Cost Per Accepted Change (CPAC)**

Token reduction alone is not considered success if it increases defects,
rework, or human effort.

---

## Human-friendly UX

The system may be complex internally.

The developer experience should not be.

Default output should answer:

```text
What happened?
What was verified?
What remains uncertain?
What needs me?
```

Example:

```text
TASK-184 · Add subscription cancellation

TL;DR
Implemented cancellation flow.

STATUS
✓ Implementation
✓ Tests
✓ Typecheck
✓ Review
⚠ Live webhook not verified

CHANGES
3 files · +86 / -24

NEXT
→ Review live-webhook limitation
```

Detailed orchestration information remains available when needed.

---

## Installation

```bash
npx sureflow init
```

The target installation is intentionally small.

Sureflow should not require:

- a cloud service
- a database
- a daemon
- mandatory MCP
- mandatory telemetry
- unnecessary generated files

---

## CLI

```bash
sureflow init
sureflow run "Add password reset"
sureflow status
sureflow review
sureflow verify
sureflow diff
sureflow checkpoint
sureflow commit
sureflow approve
sureflow stop
```

Tasks are first-class:

```bash
sureflow task create
sureflow task list
sureflow task show TASK-184
sureflow task run TASK-184
sureflow task pause TASK-184
sureflow task resume TASK-184
```

Slash-command integrations can expose the same operations inside supported
agent environments.

---

## Security

Sureflow is designed around:

- least privilege
- scoped capabilities
- explicit authority
- secret isolation
- security verification
- worktree isolation
- protected Git operations
- skill trust controls
- external-provider boundaries
- deterministic policy checks

Where possible, security boundaries should be enforced by the runtime rather
than relying only on prompts.

See [`SECURITY.md`](SECURITY.md).

---

## Relationship to PromptKit OS

PromptKit OS is an important architectural predecessor and empirical
reference for Sureflow.

Sureflow retains ideas including:

- adaptive ceremony
- JIT context
- context economy
- durable state
- bounded verification
- bounded repair
- human authority
- stack playbooks
- boundary recipes
- security boundaries
- evidence-based engineering
- benchmarking
- Cost Per Accepted Change

The main evolution is from a workflow/document-centric model toward a
control-plane model with:

```text
Policy
  +
State
  +
Capabilities
  +
Context
  +
Adapters
  +
Skills / Recipes
  +
Dynamic Workers
  +
Evidence
  +
Verification
```

Sureflow is an architectural proposal and is **not claimed to be superior
to PromptKit OS until equivalent real-world benchmarks demonstrate that**.

---

## Documentation

| Document | Purpose |
|---|---|
| [`ARCHITECTURE.md`](ARCHITECTURE.md) | Complete technical architecture |
| [`BENCHMARKS.md`](BENCHMARKS.md) | Measurement and benchmarking methodology |
| [`SECURITY.md`](SECURITY.md) | Security model and threat boundaries |
| [`CONTRIBUTING.md`](CONTRIBUTING.md) | Contribution and development guidelines |

---

## Status

Sureflow is currently an **architectural target / design proposal**.

Implementation should proceed incrementally and each major subsystem should
be validated before additional complexity is introduced.

> **Every subsystem must justify its complexity.**

---

## Final principle

> **Reason freely. Act within bounds. Prove the result.**
