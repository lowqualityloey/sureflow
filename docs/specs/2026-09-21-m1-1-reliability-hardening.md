# M1.1 Reliability Hardening

- **Author**: Human authority and Codex
- **Status**: Approved for H1 only
- **Created**: 2026-09-21
- **Target Release**: M1.1

<a id="PLAN-m1-1-reliability-hardening"></a>

## Planning Record

- **Planning Record ID**: `PLAN-m1-1-reliability-hardening`
- **Planning Depth**: `Full`
- **Owner**: Human authority
- **Record Status**: `ready`
- **Local Task Record Link**: [TASK-2026-09-21-m1-1-reliability-hardening](../tasks/2026-09-21-m1-1-reliability-hardening.md#TASK-2026-09-21-m1-1-reliability-hardening)
- **Requested Outcome**: Add bounded, zero-cost public CI and then independently gated reliability hardening tasks.
- **Observable Completion Condition**: Each authorized H task is committed only after its local gates; H1 additionally requires a green GitHub Actions run before acceptance.
- **Scope Boundary**: H1–H7 only. H1 is limited to `.github/workflows/ci.yml`; H2–H7 remain planned and unauthorized. M1 stays completed and is not reopened.
- **TDD Enforcement Proposal**: `disabled`
- **Assumption Records**: None

## Approved Architecture and Safety Constraints

- M1 public surface and runtime invariants remain unchanged.
- H1 uses one GitHub-hosted `ubuntu-latest` job, Node 24, official `actions/checkout@v7` and `actions/setup-node@v7`, and `contents: read` only.
- H1 has no matrix, cache, artifacts, larger or self-hosted runner, `pull_request_target`, secrets, write permissions, deployment, publication, tag, release, external CI, or paid service.
- H1 runs `npm ci`, typecheck, tests, lint, build, `git diff --check`, and a tracked-tree cleanliness check.
- The zero-cost constraint applies to infrastructure and services. If a future design requires metered infrastructure, it must stop for human authorization.
- Later approved M1.1 tasks are: H2 Node 24 type alignment; H3 runtime namespace symlink containment; H4 per-file atomic state writes and inconsistent-state detection; H5 owner-token mutation lock; H6 event-corruption surfacing; H7 source-install and `init --force` documentation truth.

## Failure and Rollback Considerations

- A failing GitHub Actions run leaves H1 active and blocks H2; no automatic repair is authorized.
- The H1 workflow has no write capability, so rollback is removal or amendment in a separately authorized commit.
- No M1 runtime state, lifecycle, evidence, policy, or verification behavior is changed by H1.

## Verification Approach

- Inspect workflow structure and scope locally.
- Run the canonical local gates and hygiene guards before commit.
- Push only the H1 commit to `origin/main`, then inspect the resulting GitHub Actions run. H1 is accepted only on a green remote run.
