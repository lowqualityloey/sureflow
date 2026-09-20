# Discovery Intake Spec: Sureflow control plane

<a id="PLAN-sureflow-discovery-intake"></a>

- **Author**: Cline (AI coding agent)
- **Status**: In Review
- **Created**: 2026-09-20
- **Target Release**: Milestone 0 (discovery only, no code)
- **Task Record**: `docs/tasks/2026-09-20-sureflow-discovery-intake.md`

## 1. Repository findings (observed, this turn)

| Area | Observed evidence |
|---|---|
| Root files | `ARCHITECTURE.md` (26KB, 44 sections), `README.md`, `SECURITY.md`, `BENCHMARKS.md`, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `CHANGELOG.md`, `LICENSE`, `PROMPTKIT.md` (template, unfilled), `AGENTS.md`, `GEMINI.md` |
| Code | Zero implementation files. No `src/`, `tests/`, manifests (`package.json`, `pyproject.toml`, `Cargo.toml`, `go.mod`), configs, or CI for host code. `find -maxdepth 2` returns docs/config only. |
| Git | `No commits yet on main`. All host docs untracked (`??`). Only staged entry is `.promptkit` submodule. Cannot quote a revision; nothing committed. |
| Docs dirs | `docs/{adrs,specs,tasks,tests}` all exist but empty (this task adds first files). `docs/STATE.md` is unfilled template (`not tracked` everywhere). |
| PromptKit | Engine present as submodule `.promptkit` (24 workflows). `PROMPTKIT.md` placeholders unanswered: `size`, `intake-status`, stack, commands all `[e.g. ...]`. No `DESIGN.md`. `tracking: local`, `projection: github`. |
| Toolchain (host probe) | `python3 3.12.3`, `node v24.20.0`, `npm 11.19.0` present on machine; `rustc`/`go` absent. Informational only — none adopted by repo. |
## 2. Stack detection result: nothing adopted

- **Language/runtime**: not adopted. No manifest, no source, no toolchain pin.
- **Package manager / build / test / lint / typecheck**: not adopted. `CONTRIBUTING.md` is explicit: "The exact development commands should be defined by the implementation once the repository exists. Do not assume a package manager, runtime, framework, or CI provider unless the repository has adopted it."
- **Classification**: documentation-only greenfield with brownfield PromptKit engine attached. `pk:onboard` Phase 0 (greenfield intake) is the correct next workflow, not brownfield scan.
- **Constraint honored**: no stack invented. Host has python3/node available, but availability is not adoption.

## 3. Implementation status: 0% implemented

- `README.md` Status section: "Sureflow is currently an architectural target / design proposal."
- `CHANGELOG.md`: "No released implementation versions yet." Unreleased = docs only.
- Therefore the full 44-section ARCHITECTURE.md (policy, state, context, capabilities, workflows, scheduler, verification, evidence/events, host/stack/provider adapters, skills/recipes, task graph, workers, synthesis, accept/halt, CLI) is **target, not code**.

## 4. Architecture-to-code gap (selected, highest leverage)

1. Policy/authority: deterministic evaluation specified (ARCH §7, §35; SECURITY.md) — no policy file, schema, or test exists.
2. Durable state: `.sureflow/state|evidence|events|views|policy` layout proposed (ARCH §22) — directory does not exist; PromptKit `docs/STATE.md` template is the only state artifact, unfilled.
3. Context engine (minimum-sufficient, R/Z independence, provenance/freshness — ARCH §5/§6/§24): no resolver, no adapter interface.
4. Capabilities (ARCH §8, SECURITY capability model): identifiers listed in prose only; no registry, scoping, or enforcement point.
5. Workflows/skills/adapters: registry, skill metadata/trust lifecycle (ARCH §14/§15), stack/host/MCP/provider adapters — all prose, no contracts.
6. Orchestration: task graph, scheduler, worker lifecycle, cost gate, synthesis, bounded repair (ARCH §9–§11, §21, §25/§26) — no runner.
7. Evidence/verification: evidence objects, verification gates, PASS/FAIL/UNKNOWN/BLOCKED semantics (ARCH §19/§20/§30) — no schema or runner.
8. Git safety, worktree isolation, concurrency (ARCH §31/§32): no controls.
9. CLI (`sureflow init/run/status/review/verify/diff/checkpoint/commit/approve/stop`, task subcommands — ARCH §36): no binary; `npx sureflow init` is aspirational.
10. Benchmarks/CPAC (BENCHMARKS.md): no logging, fixtures, or calculators; roadmap step 1 (session/task event logging) unbuilt.
## 5. Contradictions, missing decisions, risks

- C1. Router/topology ambiguity: ARCH §3/§44 diagrams show core fanning to host/stack/providers, while §36 says "the router determines topology" — no router contract defines how CLI intent maps to solo/delegated/parallel. Risk: M1 builds a runner that cannot honor the invariant.
- C2. State authority duality: ARCH §22 says structured `.sureflow/state` is authoritative with views as projections, but no migration/ownership rule vs PromptKit `docs/STATE.md` (the active tracker). Risk: two sources of truth. M1 must declare one.
- C3. Human-approval surface: policy "defines the actual protected set" (ARCH §7) but no default protected-operation list is committed beyond examples. Without a default-deny baseline, M1 cannot demonstrate "halt without approval" deterministically.
- C4. Evidence schema: provenance/freshness required (ARCH §24, SECURITY provenance) but no required-fields schema; PASS/FAIL/UNKNOWN/BLOCKED (ARCH §30) has no transition table. Risk: UNKNOWN silently becomes PASS.
- C5. Repair budget: "configurable repair budget" (ARCH §21) with no default (e.g. N=1 vs 2), no per-task vs per-run scoping. Unbounded-repair risk.
- C6. Cost gate: benefit-vs-cost inequality (ARCH §11) with no units or threshold — unimplementable as specified; M1 must not build multi-agent on this.
- C7. MCP optionality vs capability filtering: "must remain useful without MCP" (ARCH §17) plus filtering requirements — implies capability-filter interface must exist before any MCP adapter. Order matters.
- C8. Stack-agnostic core vs verification concreteness: core must stay agnostic (CONTRIBUTING.md) yet verification needs concrete commands per stack. Missing: adapter interface that resolves `verify` per project without leaking stack into core.
- Missing decisions (need human intake before pk:plan): M-D1 language/runtime; M-D2 local vs GitHub issue tracking (PROMPTKIT.md says `tracking: local`, projection github — confirm); M-D3 default protected ops + default repair budget; M-D4 `.sureflow/` vs `docs/STATE.md` authority for M1; M-D5 whether M1 target fixture repo is this repo itself (dogfooding) or a sample fixture.
- Risks: R1 stack-by-default (agent's preferred stack becomes architecture — pk:onboard warns exactly of this); R2 building the full 12-subsystem core at once (violates complexity budget, ARCH §38); R3 token-heavy context engine before any accepted-change evidence; R4 claiming security from prose (SECURITY.md forbids this); R5 benchmark theater (BENCHMARKS.md forbids unmeasured claims).
## 6. MVP boundary and first milestone (proposal, not decision)

- **MVP boundary principle**: smallest slice that exercises human request -> control plane -> task/state -> scoped execution -> evidence -> deterministic verification -> accept/halt, against a single fixture task, single worker, no network, no MCP, no multi-agent. Every subsystem beyond that is deferred per ARCH §38/§43.
- **Proposed M1**: `Deterministic local task gate on one fixture repo`.
  - CLI (or script entry): `init`, `run <task>`, `status`, `verify` only. Other ARCH §36 commands deferred.
  - Policy: static default-deny file with explicit protected-op list + human-approve gate that defaults to HALT when approval absent. No policy language beyond that.
  - State: one declared authority for M1 (recommend `.sureflow/state/*.json` with `docs/STATE.md` as projection, or vice versa — human confirms M-D4).
  - Execution: single disposable worker = one scoped shell step with an allowlisted capability set (e.g. `repo.read, repo.write, repo.test` only). No scheduler, no parallelism, no synthesis.
  - Evidence: append-only JSONL event+evidence log with required fields (who/what/when/task/capability/decision/target/result/provenance).
  - Verification: one deterministic check runner (exit-code + artifact assertion) with PASS/FAIL/UNKNOWN/BLOCKED; UNKNOWN and missing evidence => HALT. Bounded repair max 1 retry, then HALT.
  - Fixture: one trivial T0 task (e.g. add/rename a marker file + assertion script) so the loop is end-to-end without stack commitment.
- **Explicit non-goals (M1)**: multi-agent/parallel/delegated execution; cost-gate optimizer; MCP/provider/model adapters; skill supply-chain; stack adapters beyond the single fixture; design-system resolution; autonomy levels; scheduler; dry-run/replay UI; telemetry platform; cloud/DB/daemon.
- **Deferred (post-M1, in order)**: D1 real stack adapter + concrete verify commands; D2 capability-filter interface then optional MCP; D3 skill metadata/trust; D4 git safety controls; D5 bounded-repair tuning + CPAC logging; D6 multi-agent behind measured cost-gate baseline.
- **Required verification for M1**: (a) negative tests: denied capability => DENY; protected op without approval => BLOCK; stale/missing evidence => HALT, never PASS; (b) determinism: same fixture + same policy => same accept/halt; (c) docs label measured vs estimated; no security/performance claims beyond executed checks.
- **Assumptions**: A1 docs are the design baseline (no hidden specs); A2 host python3/node presence is not stack adoption; A3 `.promptkit` engine is tooling, not Sureflow code; A4 human will answer M-D1..M-D5 before planning.
## 7. Dogfooding measurements to capture (from M0 onward)

- Speed: wall-clock per milestone; turns per accepted change.
- Context efficiency: files read vs files used; re-fetches; context-induced rework. (Host telemetry unavailable here: label `estimated` per BENCHMARKS.md measurement-status rule; never present as measured.)
- Rework: repair cycles, reopened decisions, discarded approaches.
- Verification effectiveness: gates run vs passed; UNKNOWN=>HALT occurrences; defect escapes.
- Human intervention: approval requests beyond defined gates; clarifications needed.
- Friction: architectural contradictions hit (C1..C8); missing decisions blocking progress (M-D1..M-D5).
- Overhead: docs/state ceremony time vs implementation time; PromptKit workflow token/time cost per invocation.
- Prevents-mistakes log: cases where PromptKit ceremony (task record, AC, approval boundary) blocked an error.
- Creates-overhead log: cases where ceremony added no value. Record both honestly; do not optimize for PromptKit.
- Quality of accepted changes: acceptance criteria pass rate, review findings, negative-test coverage.

## 8. Verification performed this turn

- `find` inventory + `git status` (no commits, untracked docs) + `git log` failure (no commits) — executed.
- Full reads: ARCHITECTURE.md (all 44 sections), README, SECURITY, BENCHMARKS, CONTRIBUTING, CHANGELOG, PROMPTKIT.md, docs/STATE.md — executed.
- Toolchain probe: python3/node present, rustc/go absent — informational only.
- No test suite exists, so no test/typecheck/lint evidence is claimable. Next verifiable step after human stack intake: `pk:plan` spec + `pk:tasks` record for M1.
