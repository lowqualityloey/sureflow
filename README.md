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

## M1 implementation boundary

The committed M1 slice is a local filesystem control plane with exactly four
public commands:

```text
sureflow init
sureflow run <taskId>
sureflow status
sureflow verify <taskId>
```

M1 uses `.sureflow/state/` as its sole runtime-state authority and keeps
PromptKit records such as `docs/STATE.md` out of runtime decisions. Policy is
default-deny. Protected operations return terminal `REQUIRE_APPROVAL` halts;
M1 has no approval-delivery mechanism. The worker supports only the approved
`repo.read`, `repo.write`, and closed `repo.test` `npm-test` profile. Events
and terminal evidence are append-only, T4 verification is deterministic, and
the execution path permits at most one automatic retry.

The T0 fixture in `fixtures/t0-basic/` is executable and owns the acceptance
contract, including `expectedResult`. M1 acceptance is complete for this
bounded slice. The broader architecture described below remains a future
design boundary, not additional M1 runtime functionality.
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

## Installation and current source use

No released npm implementation package exists yet. To use the current source
repository:

```bash
git clone https://github.com/lowqualityloey/sureflow.git
cd sureflow
npm ci
npm run build
node dist/src/cli.js init
```

The repository requires Node `^24` and npm `>=11`. `npx sureflow init` is a
future/target package workflow, not a currently available installation path.

The current source workflow is intentionally small.

Sureflow should not require:

- a cloud service
- a database
- a daemon
- mandatory MCP
- mandatory telemetry
- unnecessary generated files

---

## CLI

M1 exposes only the following public commands:

```bash
sureflow init
sureflow run TASK-T0-BASIC
sureflow status
sureflow verify TASK-T0-BASIC
```

`init --force` performs a partial core-state reinitialization. It may replace
project metadata, the active pointer, and the default policy, but it does not
delete task history, evidence, or events. It refuses malformed or inconsistent
authoritative state and pending/running tasks before mutation.

Normal `--help` / `-h` behavior is available. Unknown commands return the
controlled exit code `2`. Review, diff, checkpoint, commit, approval, stop,
task-management, and slash-command surfaces remain outside the implemented
M1 CLI.

## Security

For the implemented M1 slice, `repo.read` and `repo.write` paths are
hard-jailed and `repo.test` uses fixed `npm` / `["test"]` / `shell: false`
dispatch. This cwd boundary is not an OS sandbox: executed test code may
still access filesystem paths or network resources according to the host
environment. M1 has no arbitrary shell, Git push/merge/deploy, approval
token/store, provider, MCP, scheduler, or cloud runtime.

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

M1 implementation and acceptance are complete for the bounded local task gate.
The executed closeout evidence covers the four-command surface, policy
halts, bounded execution/retry, evidence cardinality, deterministic
verification, runtime-state authority, and known security limitations.
M1.1 reliability hardening is being completed. Sureflow remains experimental
v0.x, and no released npm implementation version exists yet. Broader
architecture remains future design, not implemented functionality, until
separately authorized.

> **Every subsystem must justify its complexity.**

---

## Final principle

> **Reason freely. Act within bounds. Prove the result.**
