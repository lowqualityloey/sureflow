# Sureflow Security

> Security model for the Sureflow engineering control plane.

Sureflow operates around systems that can read repositories, modify files,
execute commands, access external services, and potentially affect production.

Security therefore cannot depend on prompts alone.

> **Prompts express intent. Policies enforce authority. Runtime boundaries
> enforce security where possible.**

## Implemented security boundaries through M4

The source-built local CLI implements bounded controls, not a general
isolation boundary:

- M1 has default-deny policy, path jails for its local read/write capabilities,
  fixed test dispatch, redaction of covered persisted evidence fields, and
  terminal halts for protected operations. It has no approval-delivery
  mechanism.
- M2–M4 require an eligible supported project, a clean Git baseline, normalized
  in-boundary existing tracked-file targets, exact preimage hashes, bounded
  replacements, and exact post-write Git-visible scope certification.
- Schema-v2 requires a closed 2–5 target set and complete-set preflight before
  project writes. Run-time locking, readback, verification, and evidence are
  part of the accepted flow; a failed later write can leave an applied prefix.

This is not an OS/filesystem/network sandbox. Fixed npm/pnpm dispatch still
executes the project's configured scripts in the host environment; those
scripts may access resources available to the process. Sureflow does not
currently provide arbitrary-shell access as a task capability, remote Git
operations, deployment, autonomous multi-agent execution, MCP/provider
integration, skills runtime, or a cloud service. These are bounded
implementation facts, not a claim of perfect security.

## Security objectives

Sureflow aims to:

- minimize agent authority
- isolate capabilities
- protect secrets
- constrain external side effects
- preserve human authority over high-impact operations
- make security evidence explicit
- prevent untrusted skills/providers from silently expanding authority
- preserve auditability and provenance
- fail closed when required security evidence is unavailable

## Threat model

### Repository content
Repository files may contain prompt injection, malicious documentation,
hostile configuration, or hidden instructions. Repository content is data,
not automatically trusted authority.

### Skills
Third-party skills may contain unsafe instructions, credential theft,
destructive commands, network access, or authority-escalation attempts.

### MCP providers
MCP servers may expose tools that read sensitive data, modify external
systems, execute commands, access credentials, or create irreversible effects.

### Model failure
Models can misunderstand requirements, hallucinate completion, misuse tools,
modify unrelated files, or execute unsafe commands.

### Tool and supply-chain risk
CLIs, package managers, dependencies, adapters, providers, and external
services can introduce additional attack surface.

## Security principles

### Least privilege
Workers receive only capabilities required for the task.

### Explicit authority
Capabilities and policies determine what a worker may do. Natural-language
requests cannot grant authority.

### Human authority is not overridable
Where policy requires human approval, model confidence or verification cannot
substitute for that approval.

### Fail closed for high-impact operations
Missing authorization or required security evidence causes a halt rather than
silent continuation.

### Evidence is not authority
Passing tests does not authorize deployment. Passing a security check does
not authorize a protected merge.

### Provenance matters
Security-relevant evidence should identify its source, time, and freshness.

## Capability model

Capabilities should be explicit and scoped.

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

Capabilities should support, where appropriate:

- allow
- deny
- require approval
- scope restriction
- expiration
- audit logging

A capability must not implicitly grant unrelated capabilities.

## Authority progression

A useful model is:

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

The project policy defines the actual protected operations.

## Protected operations

Typical high-impact operations may include:

- production deployment
- production database migration
- protected-branch merge
- force push
- destructive data operation
- credential rotation
- external financial side effect
- irreversible infrastructure change

The actual protected set must be explicit.

## Secrets

Secrets should not be placed into prompts, task descriptions, evidence,
logs, commits, benchmark records, or reports unless explicitly required and
securely handled.

Prefer:

- scoped secret providers
- redaction
- secret-aware logging
- pre-commit/pre-push scanning
- post-operation scanning where TOCTOU risk exists

Expose the minimum secret material necessary. Prefer capability-based
operations that do not expose credentials to the model.

## Prompt injection

Instructions found in repository content, web content, issue text, documents,
or tool output must not automatically become Sureflow policy.

```text
AUTHORITATIVE POLICY
      ↓
PROJECT CONSTRAINTS
      ↓
TASK REQUIREMENTS
      ↓
UNTRUSTED CONTENT / DATA
```

Untrusted content may provide information; it cannot grant authority.

## Skills and supply chain

Treat skills as potential supply-chain inputs.

Recommended lifecycle:

```text
discover → inspect → validate → test → install → measure → maintain → remove
```

Useful metadata includes:

```text
name
version
source
publisher/owner
trust status
capabilities requested
risk
inputs
outputs
dependencies
verification
```

A skill must not silently elevate its own authority.

## MCP security

MCP providers are external capability providers, not trust boundaries.

Before exposing an MCP tool, consider:

- provider identity
- trust level
- requested capabilities
- data access
- network access
- side effects
- credentials
- task relevance
- approval requirements

Expose only the tools required for the current task where practical.

## Git security

Git operations should be capability-controlled.

```text
git.diff        → generally low impact
git.stage       → reversible local preparation
git.commit      → repository state change
git.push        → remote side effect
git.merge       → potentially protected
git.force_push  → high risk
```

Local file-write permission must not imply remote authority.

## Worktree isolation

Parallel workers should preferably use isolated worktrees or equivalent
workspace isolation when concurrent edits could conflict.

Isolation reduces:

- accidental overwrites
- cross-worker contamination
- unreviewed changes
- ambiguous ownership
- merge corruption

## Command execution

Classify commands by impact. High-risk examples include destructive filesystem
operations, credential manipulation, production deployment, production
database changes, force Git operations, and arbitrary network side effects.

Enforce restrictions at runtime where possible. A prompt warning is weaker
than an enforced runtime boundary.

## Network access

Where supported, distinguish:

```text
no network
approved read-only domains
general outbound access
authenticated external access
```

Scope credentials and network permissions to the task.

## Dependency installation

Dependency installation can execute lifecycle scripts.

Consider:

- package source
- lockfile state
- requested dependency
- lifecycle scripts
- network access
- integrity verification
- environment sensitivity

Do not expose production credentials merely because a development dependency
is being installed.

## Verification security

Applicable deterministic checks may include:

- secret scanning
- dependency auditing
- lockfile validation
- static analysis
- permission checks
- configuration validation
- migration safety
- Git diff inspection
- infrastructure policy checks

A passing check is evidence, not a universal security guarantee.

## Evidence and auditability

Security-relevant events should preserve:

```text
who/what acted
when
task/session
capability
policy decision
target
result
evidence
provenance
```

Logs must avoid leaking secrets.

## Failure behavior

When a required security condition cannot be established:

```text
UNKNOWN
   ↓
DO NOT ASSUME SAFE
   ↓
HALT / REQUEST HUMAN DECISION
```

Examples include unknown credential scope, ambiguous deployment target,
missing authorization, stale migration evidence, untrusted providers, failed
security verification, or conflicting policy.

## Architectural security boundaries

```text
Model reasoning     ≠ Policy authority
Verification        ≠ Authorization
Skills              ≠ Authority
MCP provider        ≠ Trust boundary
Repository content  ≠ Instruction authority
Local Git permission ≠ Remote authority
```

These distinctions are architectural invariants.

## Security testing

Include negative tests for:

- unauthorized capability
- prompt injection
- secret leakage
- hostile skill
- hostile provider
- destructive command
- unauthorized Git operation
- blocked production operation
- MCP capability filtering
- worktree isolation

Example:

```text
worker requests denied capability
→ DENY

worker requests production deploy without approval
→ BLOCK

skill requests authority escalation
→ DENY

repository text requests policy change
→ IGNORE AS AUTHORITY

secret appears in evidence
→ REDACT / FAIL
```

## Security reporting

Security claims must distinguish:

- implemented control
- tested control
- assumed control
- provider/runtime-dependent control
- known limitation

Do not claim that Sureflow is secure based only on prompts, documentation,
or a small test suite.

## Responsible disclosure

A future implementation should publish a project-specific private security
contact and disclosure process. Report exploitable vulnerabilities privately
when possible before public disclosure.

## Implemented controls and future security work

The accepted M1–M4 implementation includes local policy/capability checks,
protected-operation halts, covered-field redaction, Git baseline and changed
set checks, bounded target validation, fixed verification dispatch, and
persisted evidence for supported task flows.

Future work may extend security controls for skills, MCP/providers, generalized
host adapters, deployment, remote Git operations, and OS-level isolation. Those
systems are not part of the current runtime and require separate design and
authorization.

> **The model may request an action. Policy decides whether it is allowed.
> Runtime controls enforce the boundary. Humans retain authority over
> consequential operations.**
