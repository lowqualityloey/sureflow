# Project Architectural Profile (`PROMPTKIT.md`)

> **Instructions for AI**: Read this file during every session. Adhere strictly to the project domain boundaries, commands, documentation targets, and non-negotiable architectural rules defined below. Placeholders marked `[e.g. ...]` are **intake questions, not defaults**: when a value is unknown, report it to the user via the bounded intake (`protocols/discovery-intake.md`) instead of inventing a value.

## 0. PromptKit OS Profile
- **Profile**: balanced
- **Installed**: [YYYY-MM-DD]
- **Engine**: `.promptkit`
- **Description**:
  - `lite`: 6 utility workflows (route, debug, commit, checkpoint, sync, profile) <1,500 tok, 80% value — onboarding
  - `balanced`: the full 24-workflow set, Level 0-3 adaptive ceremony (default) — teams, production
  - `turbo`: experimental, Balanced + parallel subagent waves, up to ~2x measured token cost, still requires human L3 approval
- **Upgrade Path**: Run `.promptkit/init.sh --balanced` for full, `--lite` for minimal, `--turbo --experimental` for parallel waves — or switch in-session with `pk:profile`

profile: balanced

status-cards: on
> `status-cards: on` (default) emits the 3-line telemetry card on completion; `off` suppresses the decorative card only — `> [!IMPORTANT]` / `> [!WARNING]` halts still fire. A missing line means `on`.

size: [small | medium | large]
intake-status: [unanswered | partial | complete]
> `size:` and `intake-status:` are written by `pk:onboard` (greenfield Phase 0 interview, or a brownfield estimate marked `legacy-partial` when fields predate intake). `unanswered` or `partial` instructs `pk:plan` Step 0 to run the bounded intake in `protocols/discovery-intake.md` before proposing architecture. Never guess these values.

---

## 1. Project Overview & Domain
- **Project Name**: Sureflow
- **Domain / Purpose**: Experimental source-built local CLI for bounded changes in supported Node.js/TypeScript projects; implementation is limited to the accepted M1–M4 behavior.
- **Primary Users**: Developers who want local project checks, bounded existing-file replacements, and verification evidence through `init`, `preflight`, `run`, `status`, and `verify`.

---

## 2. Active Technology Stack
- **Language & Runtime**: TypeScript (`strict: true`); Node.js `^24.0.0` and npm `>=11` per `package.json` (Node engine is a range, not an exact pin). The package lock pins development dependencies.
- **Frontend Framework**: N/A — local CLI, no UI
- **Styling & Design System**: N/A — no UI
- **State & Data Fetching**: Local `.sureflow/` JSON state, task contracts, and evidence; no database
- **Backend & Database**: N/A — standalone local CLI, no server or database
- **Testing**: Vitest (unit) — human §9 decision 2026-09-20; typecheck `tsc --noEmit`; lint ESLint

---

## 3. Project Commands & Evidence-Gated Verification
PromptKit OS enforces Evidence-Gated Verification. Every completion claim requires executed evidence matching the task ceremony level:
- **Fast Tier (Level 0/1)**: `npm run typecheck`
- **Required Tier (Level 1/2)**: `npm test` (Vitest — human §9 decision 2026-09-20)
- **Extended Tier (Level 2/3)**: `npm test`, `npm run typecheck`, `npm run lint`, and `npm run build`, selected to match the task.
- **Cross-OS Execution Bridge (Optional)**: `N/A`

### 3a. Active Stack Playbooks (JIT Loaded)
> Candidate manifests detected by `pk:onboard` map to bounded playbooks in `docs/stacks/`. Loaded strictly just-in-time; never loaded all at once.
- **Active Playbooks**: `[e.g. docs/stacks/fullstack-nextjs.md, docs/stacks/database-turso.md | N/A]`

- **Standard Commands**:
  - **Install**: `npm ci` (in the Sureflow source checkout)
  - **Build**: `npm run build`
  - **Typecheck**: `npm run typecheck`
  - **Test**: `npm test`
  - **Lint**: `npm run lint`
  - **Dev Server**: N/A — CLI, no dev server

---

## 4. Monorepo & Workspace Topology (If Applicable)
> Set to `N/A (Standalone Repository)` if not operating within a multi-package monorepo.

- **Workspace Manager**: N/A — standalone repository, not a workspace or monorepo
- **Package Graph & Directory Map**:
  - `src/`: CLI and bounded local task runtime
  - `tests/`: unit and integration tests
  - `fixtures/`: isolated T0/M2/M3/M4 acceptance projects
  - `docs/`: architecture, current state, and task records

- **Scoped Workspace Commands (`--filter`)**:
  - N/A — no workspace packages

- **Strict Architectural Import Boundaries**:
  - [ ] **Presentation Isolation**: `packages/ui` must never import from application targets (`apps/*`) or server-only packages (`packages/db`).
  - [ ] **Client / Server Boundary**: Client components in `apps/web` (`"use client"`) must never import directly from `@repo/db` or internal server secrets.
  - [ ] **Public Package Exports Only**: Never reach across workspace boundaries using relative deep paths (for example `../../packages/db/src/internal.ts`). Always consume packages through exports declared in their `package.json` (`@repo/db`).
  - [ ] **Workspace Protocol**: Inter-package dependencies must declare explicit workspace protocols in `package.json` (e.g. `"@repo/ui": "workspace:*"`).

---

## 5. Active MCP Capabilities (Optional)
> Record detected or configured Model Context Protocol (MCP) servers (via Docker Desktop MCP, stdio `npx`, or native client configs). PromptKit OS follows a **Progressive Enhancement** model: MCP tools serve as optional accelerators. When available, assistants prioritize native MCP tool calls; when unavailable, assistants seamlessly fall back to structured Markdown and terminal CLI commands with zero errors.

> Sureflow's current product runtime does not integrate MCP or external model/provider services. The fields below describe optional PromptKit host tooling only, not Sureflow capabilities.

- **Reasoning / Scratchpad MCP**: [e.g. `sequential-thinking` (`@modelcontextprotocol/server-sequential-thinking`) for `pk:debug` hypothesis branching & `pk:plan` tradeoffs | N/A]
- **Documentation / Web Reader MCP**: [e.g. `fetch` (`@modelcontextprotocol/server-fetch`) or Jina reader for clean primary doc lookups | N/A]
- **Task Tracking System**: Local Markdown (`docs/tasks/` + `docs/STATE.md`)
- **Task Tracking Selector (machine-readable)**: `tracking: local` (options: `local|github|jira|linear`; Jira/Linear = manual import, board is projection only, Local Task Record authoritative)
- **GitHub MCP**: [e.g. `github-mcp-server` for PR creation, issue reading, commit search | N/A]
- **Database MCP**: [e.g. `postgres-mcp` or `sqlite-mcp` for read-only schema discovery & `pk:data` checks | N/A]
- **Browser / UI MCP**: [e.g. `playwright` for `pk:design` visual and E2E verification | N/A]
- **Execution Precedence**: Native MCP Tools $\rightarrow$ Native IDE Search/Edit Tools $\rightarrow$ Terminal CLI Commands $\rightarrow$ Structured Markdown Fallback

### 5a. LSP Capabilities (Optional)
> Record detected language-server capabilities for range-accurate diagnostics (`file:line:col`) consumed by `pk:review`. Progressive Enhancement applies: LSP is an optional accelerator, disabled by default, with zero token overhead for Lite-profile users. When unavailable, assistants fall back to the Section 3 typecheck/lint commands with zero errors. The assistant never starts or enables a language server; humans configure in-host.

- **LSP Enabled**: [false (default) | true | not measured]
- **LSP Servers**: [e.g. `tsserver`, `pyright`, `rust-analyzer` | none]
- **Evidence Source**: [lsp-mcp | tsc-cli | not measured]

---

## 6. Documentation & Artifact Storage Paths
All artifacts generated by PromptKit workflows must be saved to these host project paths:
- **Architectural Decision Records (ADRs)**: `docs/adrs/`
- **Technical RFC Specs**: `docs/specs/`
- **Incident Post-Mortems (RCAs)**: `docs/rca/`
- **Technical Spikes & Benchmarks**: `docs/spikes/`
- **Design Tokens & UI Specs**: `docs/design/`
- **Data Models & Schemas**: `docs/data/`
- **Authentication & RBAC Matrices**: `docs/auth/`
- **API Contracts & Envelopes**: `docs/api/`
- **Test Strategy & Plans**: `docs/tests/`
- **Release Checklists & Reports**: `docs/releases/`

### Standard Root Documentation (Optional / Detected)
> Pre-existing repository documentation detected during `pk:onboard` or `context-sync`. PromptKit respects these as authoritative references. Set to `N/A` if not present.
- **Architecture Blueprint**: [e.g. `./ARCHITECTURE.md` or N/A]
- **Strategic Roadmap**: [e.g. `./ROADMAP.md` or N/A]
- **Operations Runbook**: [e.g. `./RUNBOOK.md` or `./OPERATIONS.md` or N/A]
- **Code Style Guide**: [e.g. `./STYLE.md` or `./STYLEGUIDE.md` or N/A]

---

## 7. Non-Negotiable Architecture Rules & Guardrails (scope each item to the applicable stack; mark `N/A - <reason>` where not applicable)
- [ ] **Zero `any` / Loose Casting** (TypeScript projects): Strict TypeScript at all times. Use native validation (e.g. Zod/Valibot for TypeScript) for boundary parsing; otherwise `N/A - <reason>`.
- [ ] **No Business Logic in UI** (projects with a UI layer): Presentation components only render props and dispatch intents; business logic lives in domain hooks or service layers; otherwise `N/A - <reason>`.
- [ ] **Database Invariants First** (projects with a relational database): Foreign keys, unique constraints, and check constraints live in the database schema, not just application code; otherwise `N/A - <reason>`.
- [ ] **WCAG 2.2 AA Compliance** (projects with a user-facing UI): All interactive elements must support keyboard navigation, visible focus rings, and proper ARIA labels; otherwise `N/A - <reason>`.
- [ ] **Deterministic Error Handling**: No silent `catch {}` blocks. Use typed `Result<T, E>` or centralized error boundaries.
- [ ] **Anti-Slop & Structured Scannable Output**: Output all status updates, plans, and diffs in structured scannable markdown (tables, checklists, short bullets). Prohibit long narrative conversational essays.
- [ ] **Absolute Secret Hygiene & `.env.example`**: Never paste, expose, or request secrets, API keys, or credentials in chat. Maintain `.env.example` with placeholder keys and instruct developers to manage `.env` locally.
- [ ] **Context Window Reset Threshold (~30 Turns)**: When conversation approaches ~30 turns or high token saturation, run `pk:checkpoint` to synchronize `docs/STATE.md` and recommend continuing in a fresh session via `pk:route`.
- [ ] **Standardized Human Action Callouts**: When terminating a turn that requires user decision, approval, or local action (e.g. merging PR, editing `.env`), terminate with a high-contrast `> [!IMPORTANT]` block titled `### 🛑 Action Required From You:`. If blocked, terminate with `> [!WARNING]` titled `### ⚠️ Blocked: Waiting on Human Input`.
- [ ] **Strict Milestone Git Boundaries**: Never start a new milestone or major task phase carrying this task's own uncommitted changes (pre-existing dirt — including fresh `init.sh` scaffold output — is surfaced and recommended for commit, never a stall reason). working tree. Upon completing a milestone, run test verification, prompt for or execute atomic staging (`pk:commit`), update `docs/STATE.md`, and obtain human confirmation with `> [!IMPORTANT]` before proceeding.
<!-- Optional: Uncomment if using GitHub Issues or external issue tracker -->
<!-- - [ ] **Issue Tracker Synchronization**: Decompose all feature milestones and bugs into atomic issues with Gherkin AC via `pk:tasks` before active coding. Commits must reference issue IDs (`Closes #N`). -->

tracking: local

projection: github
