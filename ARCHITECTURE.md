# Sureflow Architecture

> Engineering control plane for AI coding agents.
>
> **Reason freely. Act within bounds. Prove the result.**

## 1. Purpose

Sureflow is a deterministic engineering control plane for AI-assisted
software development.

It sits between the developer and coding agents to control:

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

The central principle is:

> **Let models reason. Let the control plane decide what is allowed.**

---

## 2. Goals

Sureflow is designed around:

1. Minimum sufficient context
2. Accepted-change quality
3. Bounded autonomy
4. Evidence-based verification
5. Token and resource efficiency
6. Host and project agnosticism
7. Replaceable models and providers
8. Safe multi-agent execution
9. Durable engineering state
10. Low operational overhead
11. Explicit human authority
12. Measurable engineering outcomes

---

## 2A. M1 implemented boundary and limitations

M1 is the completed local vertical slice, not the full architecture described
in this document. Its public surface is exactly `init`, `run`, `status`, and
`verify`. Runtime authority is `.sureflow/state/`; `docs/STATE.md` and other
PromptKit records are process documentation only. The implemented capabilities
are `repo.read`, `repo.write`, and closed-profile `repo.test` (`npm test`,
`shell: false`, cwd at the bounded T0 fixture root). Policy is default-deny;
protected operations terminally return `REQUIRE_APPROVAL` with zero execution
and no M1 approval-delivery mechanism.

M1 appends execution history to events and one terminal verification-applicable
record to evidence, uses deterministic T4 PASS/FAIL/UNKNOWN verification, and
permits only one automatic retry for an initial started-process nonzero exit.
The T0 fixture owns acceptance input. No OS sandbox is claimed for the test
process; no arbitrary shell, network, Git remote, multi-agent, MCP/provider,
skill runtime, scheduler, cloud service, persisted verdict history, run IDs,
attempt IDs, latest-wins semantics, evidence repair, or generalized fixture or
retry framework is implemented.

All other sections describe architectural intent or future boundaries and
must not be read as claims about the current M1 runtime.

## 3. High-Level Architecture

```text
                         HUMAN
                           │
                           ▼
                    COMMAND / API
                           │
                           ▼
                  ┌─────────────────┐
                  │ SUREFLOW CORE   │
                  │                 │
                  │ Router          │
                  │ State Engine    │
                  │ Policy Engine   │
                  │ Context Engine  │
                  │ Capability Mgr  │
                  │ Workflow Reg.   │
                  │ Scheduler       │
                  │ Verification    │
                  │ Evidence/Events │
                  └────────┬────────┘
                           │
          ┌────────────────┼────────────────┐
          ▼                ▼                ▼
   HOST ADAPTERS     STACK ADAPTERS     PROVIDERS
          │                │                │
          │          ┌─────┴─────┐     ┌───┴────────┐
          │          │ Skills    │     │ Models     │
          │          │ Recipes   │     │ Tools      │
          │          │ Boundaries│     │ MCP        │
          │          └─────┬─────┘     └────────────┘
          │                │
          └────────────────┼────────────────┐
                           ▼                │
                  DYNAMIC TASK GRAPH        │
                           │                │
                    ┌──────┼──────┐         │
                    ▼      ▼      ▼         │
                  WORKER  WORKER  WORKER     │
                    └──────┼──────┘         │
                           ▼                │
                       SYNTHESIS             │
                           ▼                │
                        EVIDENCE             │
                           ▼                │
                      VERIFICATION           │
                           ▼                │
                    ACCEPT / HALT            │
                           │
                 ┌─────────┴─────────┐
                 ▼                   ▼
              HUMAN             CHECKPOINT
              DECISION          / COMMIT /
                                MERGE / DEPLOY
```

The control plane owns policy, state, authority, context, verification, and
orchestration.

Workers perform bounded reasoning and implementation.

---

## 4. Core Architectural Model

Sureflow is built around:

```text
POLICY
   ↓
CAPABILITIES
   ↓
CONTEXT
   ↓
DYNAMIC TASK PLAN
   ↓
WORKERS
   ↓
EVIDENCE
   ↓
VERIFICATION
   ↓
ACCEPT / HALT
```

The model is responsible for reasoning within these boundaries.

The control plane is responsible for deciding what the system is permitted
to do.

---

## 5. Risk and Context Are Independent

Sureflow separates engineering risk from context depth.

### Risk

```text
R0 → R1 → R2 → R3
```

Risk represents the potential impact and complexity of the change.

### Context

```text
Z0 → Z1 → Z2 → Z3 → Z4
```

Context represents how much architectural/repository understanding is
required.

They are intentionally independent.

```text
High risk ≠ automatically maximum context
Low risk  ≠ automatically shallow context
```

A small change can require deep architectural context.

A high-risk operation may sometimes require narrow context for a specific
verification action.

The system escalates context when evidence is insufficient.

---

## 6. Minimum Sufficient Context

Sureflow treats context as an engineering resource.

The target is not minimum tokens.

The target is:

> **Minimum sufficient context required to perform and verify the task
> correctly.**

The context engine resolves task requirements into the smallest useful set of:

- files
- symbols
- dependencies
- configuration
- documentation
- stack knowledge
- design rules
- previous decisions
- verification evidence

### Context resolution

```text
Task
 ↓
Context requirements
 ↓
Context resolver
 ├─ repository
 ├─ symbols
 ├─ dependencies
 ├─ Git
 ├─ tests
 ├─ documentation
 ├─ stack adapters
 └─ skills
 ↓
Minimum sufficient context
```

Context has provenance and freshness.

Stale or unknown-freshness information must not silently satisfy
freshness-sensitive tasks.

---

## 7. Policy and Authority

Policy is separate from workflow.

A workflow can describe what should happen.

It cannot grant itself authority.

```text
WORKFLOW
  ↓
INTENT

POLICY
  ↓
AUTHORITY

CAPABILITY
  ↓
ACTION
```

### Authority progression

```text
READ
  ↓
LOCAL MODIFY
  ↓
LOCAL EXECUTION
  ↓
REPOSITORY STATE CHANGE
  ↓
REMOTE SIDE EFFECT
  ↓
PRODUCTION SIDE EFFECT
```

High-impact operations may require explicit human approval.

Examples:

- production deployment
- production database migration
- protected-branch merge
- force push
- destructive data operations
- irreversible infrastructure changes

The policy layer defines the actual protected set.

---

## 8. Capabilities

Capabilities represent actions the system can perform.

Examples:

```text
repo.read
repo.write
repo.search
repo.test
repo.build
repo.install

git.diff
git.stage
git.commit
git.push
git.merge

db.read
db.migrate

deploy.preview
deploy.production

secret.read
network.external
```

Capabilities should be:

- explicit
- narrow
- scoped
- auditable
- policy-controlled

A capability must not silently grant unrelated authority.

---

## 9. Dynamic Workers

Sureflow does not require permanent frontend, backend, security, database,
or DevOps agents.

Workers are created dynamically from the needs of the current task.

A worker receives a bounded specification:

```text
objective
context
model/provider
capabilities
permissions
skills
constraints
verification requirements
evidence contract
```

Workers are disposable.

Durable engineering state exists outside the worker.

This allows workers and models to be replaced without losing project
continuity.

---

## 10. Execution Modes

### Solo

```text
Task → Worker → Verify
```

Default for simple tasks.

### Delegated

```text
Primary Worker
      │
      ├── Worker A
      ├── Worker B
      └── Worker C
             ↓
         Synthesis
             ↓
        Verification
```

Useful when specialized or isolated work can be delegated.

### Parallel

Independent task graph branches can execute concurrently.

Parallelization should be used only when the expected benefit exceeds:

- additional tokens
- coordination
- merge risk
- verification cost

Multi-agent execution is therefore **cost-gated**, not mandatory.

---

## 11. Multi-Agent Cost Gate

Before spawning additional workers, Sureflow estimates:

```text
Expected benefit
=
parallel time saved
+ context reduction
+ specialization gain
```

against:

```text
Expected cost
=
additional tokens
+ coordination
+ merge risk
+ verification
```

Parallel work should be created when the expected benefit justifies the
additional system cost.

Workers modifying the same workspace concurrently should normally use isolated
worktrees or equivalent isolation.

---

## 12. Skills, Recipes, and Capabilities

Sureflow retains an important architectural lesson from PromptKit OS without
copying its directory structure literally.

PromptKit concepts map approximately as follows:

| PromptKit OS | Sureflow |
|---|---|
| `docs/stacks/` | Stack / Project Adapters |
| `docs/recipes/` | Capabilities / Skills / Boundary Recipes |
| Workflows | Declarative Workflow Registry |
| Templates | Schemas / Artifact Templates |
| `docs/STATE.md` | Structured `.sureflow/state/` + projections |
| Protocols | Core contracts / policies |
| `DESIGN.md` | Design Source Resolver + Design Baseline |

The goal is to preserve the architectural lessons while moving from a
document/workflow-centric system toward a control-plane model.

---

## 13. Stack and Project Adapters

The core must remain technology-agnostic.

Stack-specific behavior belongs in adapters.

An adapter may provide:

- detection
- commands
- conventions
- invariants
- verification
- deployment mechanisms
- project-specific integration

Examples may include:

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

These are examples, not core dependencies.

---

## 14. Skills

Skills provide reusable knowledge and engineering procedures.

A skill should declare:

```text
name
version
applies_to
requires
produces
capabilities_requested
risk
verification
trust
```

Skills cannot grant themselves authority.

Skill loading should use progressive disclosure:

```text
metadata
   ↓
relevance check
   ↓
full skill
```

This prevents unnecessary context consumption.

---

## 15. Skill Supply Chain

Third-party skills are treated as potential supply-chain inputs.

Lifecycle:

```text
discover
  ↓
inspect
  ↓
validate
  ↓
test
  ↓
install
  ↓
measure
  ↓
maintain
  ↓
deprecate/remove
```

Trust metadata and capability requests should be explicit.

A skill should never silently expand its own permissions.

---

## 16. Host Adapters

Sureflow should adapt to existing coding-agent environments without replacing
their native instruction systems.

Examples:

```text
CLAUDE.md
AGENTS.md
GEMINI.md
.cursor/rules
.codex/
```

Host adapters normalize relevant constraints into Sureflow's context model.

Existing authoritative host/project instructions remain authoritative according
to the configured precedence rules.

---

## 17. MCP

MCP is an optional capability transport/provider.

It is not:

- the control plane
- the authority layer
- automatically trusted
- required for Sureflow

```text
Sureflow
   ↓
Policy
   ↓
Capability filter
   ↓
MCP provider
   ↓
Tool
```

MCP exposure should be task-specific where practical.

The system should evaluate provider trust, capabilities, data access,
credentials, network access, and side effects.

Sureflow must remain useful without MCP.

---

## 18. Model and Provider Adapters

Models are replaceable.

The control plane should not hardcode a single model as an architectural
requirement.

A provider adapter should normalize relevant differences in:

- model invocation
- context limits
- tool calling
- structured output
- token accounting
- streaming
- error handling

Provider-specific behavior should remain behind the adapter boundary.

---

## 19. Evidence Architecture

Evidence is a first-class object.

A model's statement that something works is not equivalent to verification.

Evidence may come from:

### Deterministic verification

- tests
- typecheck
- build
- lint
- schema validation
- migration checks
- dependency checks
- secret scans
- Git diff checks
- policy checks

### Semantic verification

- requirements
- architecture
- maintainability
- UX
- edge cases
- security reasoning

Evidence should include provenance and freshness where relevant.

---

## 20. Verification

Verification is separate from authorization.

```text
Evidence
   ↓
Verification
   ↓
Policy / Authority
   ↓
Accept / Halt
```

Passing tests does not authorize deployment.

Passing a review does not grant merge authority.

A task is accepted only when its applicable acceptance criteria and required
verification evidence are satisfied.

---

## 21. Bounded Repair

Automated repair must be bounded.

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

A configurable repair budget prevents infinite loops.

When the repair budget is exhausted, Sureflow halts and preserves evidence for
human review.

The system must not fabricate completion.

---

## 22. Durable State

Sessions are disposable.

State is durable.

Suggested structure:

```text
.sureflow/
├── state/
│   ├── project.json
│   ├── active.json
│   ├── tasks/
│   ├── sessions/
│   └── decisions/
├── evidence/
├── events/
├── views/
└── policy/
```

Structured state is authoritative.

For M1, the concrete runtime state is only `.sureflow/state/project.json`,
`.sureflow/state/active.json`, and validated task records under
`.sureflow/state/tasks/`; events and evidence are separate append-only
stores. Human-readable PromptKit documents are not runtime projections or
inputs.

Human-readable views are projections.

This distinction prevents documentation and runtime state from becoming
competing sources of truth.

---

## 23. State, Events, and Evidence

These concepts remain separate.

### State

Current durable facts.

### Events

Historical occurrences.

### Evidence

Proof supporting a claim or decision.

Example:

```text
STATE
task status = verification

EVENT
test command executed

EVIDENCE
exit code = 0
test suite = 214 passed
```

A log entry should not automatically become authoritative state.

---

## 24. Provenance, Freshness, and Uncertainty

Information should carry, where applicable:

```text
source
timestamp
freshness
retrieval method
confidence
uncertainty
```

Confidence is evidence about retrieval quality.

It is not authority.

Stale information must not silently satisfy freshness-sensitive operations.

---

## 25. Resource Scheduling

Sureflow manages more than model tokens.

Relevant resources include:

- model tokens
- tool calls
- MCP calls
- workers
- context
- wall-clock time
- verification capacity
- human attention

Human attention is treated as a scarce engineering resource.

The system should avoid unnecessary approval requests while preserving required
authority gates.

---

## 26. Autonomy Model

Sureflow may expose autonomy levels:

```text
A0 — Assisted
A1 — Bounded Autonomous
A2 — Delegated Autonomous
```

These describe orchestration behavior.

They do not replace capability permissions.

A highly autonomous worker can still have narrowly scoped authority.

A low-autonomy task may still require a high-risk approval.

---

## 27. Token Accounting

Sureflow measures context and model resource usage where telemetry is available.

Possible measurements:

- input tokens
- output tokens
- cached tokens
- context tokens
- tool-result tokens
- skill payload
- MCP payload
- discarded context
- worker count
- turns
- repair cycles
- verification cost

The primary engineering metric is:

> **Cost Per Accepted Change (CPAC)**

Token minimization is subordinate to correctness.

If less context causes defects or rework, the system should escalate rather
than knowingly operate with insufficient evidence.

---

## 28. Human Presentation Layer

Machine complexity should not become developer complexity.

The default UX should show:

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

Possible semantic states:

```text
PASS
NEEDS ATTENTION
BLOCKED
WAITING FOR HUMAN
INFO
```

Detailed orchestration data remains available on demand.

---

## 29. Design System Resolution

When a project contains a design system, Sureflow should preserve it.

Resolution order:

```text
Project DESIGN.md
      ↓
Existing project design system
      ↓
Detected coherent conventions
      ↓
Sureflow Default Design Baseline
      ↓
Generic accessibility fallback
```

The default baseline should emphasize:

- hierarchy
- readable typography
- semantic colors
- spacing consistency
- responsive behavior
- accessibility
- keyboard support
- focus visibility
- loading/error/empty/success states
- reduced motion
- semantic HTML

It should avoid gratuitous:

- gradients
- glassmorphism
- pill-everything
- uniform card grids
- fake browser chrome
- decorative icons
- fabricated statistics

Design ceremony should be adaptive:

```text
D0 — Micro
D1 — Component
D2 — Surface
D3 — System
```

---

## 30. Failure and Degradation

Sureflow should prefer safe degradation over hidden failure.

Examples:

```text
Provider unavailable
    ↓
Try configured fallback
    ↓
If unavailable → HALT

Required context unavailable
    ↓
Escalate / request additional context
    ↓
If insufficient → HALT

Verification unavailable
    ↓
Do not claim verified
    ↓
HALT / HUMAN REVIEW
```

The system must distinguish:

```text
PASS
FAIL
UNKNOWN
BLOCKED
```

Unknown must never silently become pass.

---

## 31. Git Safety

Git operations are capability-controlled.

A useful authority distinction is:

```text
git.diff
    ↓
git.stage
    ↓
git.commit
    ↓
git.push
    ↓
git.merge
    ↓
production release
```

Local modification authority does not imply remote authority.

Protected operations require explicit policy and, where configured, human
approval.

---

## 32. Concurrency and Conflict Handling

Parallel workers must not assume exclusive ownership of shared files.

Preferred strategy:

```text
Task Graph
   ↓
Isolated worktrees
   ↓
Independent changes
   ↓
Merge / synthesis
   ↓
Conflict verification
```

If two workers modify the same logical boundary, Sureflow should detect the
conflict and require synthesis or human resolution rather than silently
choosing one result.

---

## 33. Schema Evolution

Core state and evidence schemas must be versioned.

Changes should consider:

- compatibility
- migration
- rollback
- old projections
- provider versions
- interrupted sessions

Schema evolution must preserve recoverability.

---

## 34. Dry Run, Replay, and Recovery

Where practical, Sureflow should support:

### Dry run

Show intended actions without executing consequential operations.

### Replay

Reconstruct task/event/evidence history for debugging and audit.

### Recovery

Resume from durable state after:

- provider failure
- worker failure
- interrupted session
- machine restart
- partial execution

Recovery should never assume that an interrupted side effect did not occur.

---

## 35. Security Architecture

Security is enforced through:

- least privilege
- capability scoping
- policy evaluation
- explicit authority
- secret isolation
- worktree isolation
- provider trust controls
- skill trust controls
- deterministic security checks
- runtime enforcement where possible

Important boundaries:

```text
Model reasoning      ≠ Policy authority
Verification         ≠ Authorization
Skill knowledge      ≠ Authority
MCP provider         ≠ Trust boundary
Repository content   ≠ Instruction authority
Local Git permission ≠ Remote authority
```

See `SECURITY.md` for the detailed security model.

---

## 36. CLI and Command Model

The CLI expresses developer intent.

The router determines topology.

Example:

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

Task operations:

```bash
sureflow task create
sureflow task list
sureflow task show TASK-184
sureflow task run TASK-184
sureflow task pause TASK-184
sureflow task resume TASK-184
```

IDE or agent slash commands may expose the same operations.

They are presentation-layer aliases, not the architectural core.

M1 currently implements only `sureflow init`, `sureflow run <taskId>`,
`sureflow status`, and `sureflow verify <taskId>`. The other commands and task
operations shown above remain future architectural intent and are not part of
the shipped M1 runtime.

---

## 37. Installation

The intended installation experience is:

```bash
npx sureflow init
```

Initialization should detect the project environment and create only the
minimum required Sureflow state/configuration.

Sureflow should not require:

- cloud infrastructure
- a database
- a daemon
- mandatory MCP
- mandatory telemetry
- unnecessary generated framework code

---

## 38. Complexity Budget

Every subsystem must justify its complexity.

Before adding a subsystem, answer:

1. What problem does it solve?
2. Why can an existing boundary not solve it?
3. What simpler alternatives were considered?
4. What code/state/dependencies does it add?
5. What security surface does it add?
6. How will it be measured?
7. How can it be removed?

Prefer small contracts and replaceable components.

---

## 39. Benchmarking

Sureflow should be benchmarked against real alternatives rather than judged
from architecture alone.

The benchmark should measure:

- accepted changes
- defects
- rework
- tokens
- context
- wall-clock time
- verification
- human intervention
- multi-agent coordination cost
- CPAC

PromptKit OS is an important architectural reference.

No claim of superiority should be made until equivalent real-world benchmark
evidence exists.

See `BENCHMARKS.md`.

---

## 40. What Sureflow Deliberately Does Not Do

Sureflow is not intended to become:

- a replacement IDE
- a general cloud platform
- a mandatory MCP runtime
- a permanent collection of specialist agents
- a universal autonomous deployment system
- a database-backed SaaS requirement
- a giant prompt library
- a framework-specific coding system
- a telemetry platform that requires user data collection

The control plane should remain small.

---

## 41. Architectural Invariants

The following are intended as architectural invariants:

1. Policy owns authority.
2. Workflows express intent, not authority.
3. Risk and context are independent.
4. Context must be sufficient for correctness.
5. Workers are disposable.
6. Durable state survives worker replacement.
7. Skills cannot grant themselves authority.
8. MCP is optional.
9. Evidence is distinct from confidence.
10. Verification is distinct from authorization.
11. Human approval cannot be simulated by model output.
12. Unknown verification cannot become pass.
13. Local Git authority does not imply remote authority.
14. Parallel workers require conflict control.
15. Token efficiency cannot override correctness.
16. Every subsystem must justify its complexity.

---

## 42. Failure Philosophy

When uncertain:

```text
UNKNOWN
   ↓
ESCALATE
   ↓
VERIFY
   ↓
ACCEPT or HALT
```

Never:

```text
UNKNOWN
   ↓
ASSUME
   ↓
CLAIM SUCCESS
```

The system should prefer an explicit halt over silent degradation when the
missing evidence affects correctness, security, or authority.

---

## 43. Evolution

Sureflow should evolve through measured increments.

Preferred sequence:

```text
small implementation
      ↓
verification
      ↓
benchmark
      ↓
real-world use
      ↓
evidence
      ↓
architectural adjustment
```

Do not add complexity merely because a theoretical architecture can support it.

---

## 44. Final Architecture

```text
                         HUMAN
                           │
                           ▼
                    COMMAND / API
                           │
                           ▼
                 ┌──────────────────┐
                 │  SUREFLOW CORE   │
                 │                  │
                 │ Policy           │
                 │ State            │
                 │ Context          │
                 │ Capabilities     │
                 │ Workflows        │
                 │ Scheduling       │
                 │ Verification     │
                 │ Evidence/Events  │
                 └────────┬─────────┘
                          │
             ┌────────────┼────────────┐
             ▼            ▼            ▼
          HOST          STACK       PROVIDERS
        ADAPTERS      ADAPTERS      / MCP
             │            │            │
             └──────┬─────┴────────────┘
                    ▼
             SKILLS / RECIPES
                    │
                    ▼
            DYNAMIC TASK GRAPH
                    │
          ┌─────────┼─────────┐
          ▼         ▼         ▼
       WORKER A  WORKER B  WORKER C
          └─────────┼─────────┘
                    ▼
                SYNTHESIS
                    ▼
                 EVIDENCE
                    ▼
              VERIFICATION
                    ▼
              ACCEPT / HALT
                    │
              ┌─────┴─────┐
              ▼           ▼
           HUMAN       DURABLE
          DECISION       STATE
```

The architecture can be summarized as:

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

> **Reason freely. Act within bounds. Prove the result.**
