# Checkpoint Record: M1.1 H2 Remote Acceptance

- **Task ID**: `TASK-2026-09-21-m1-1-reliability-hardening`
- **Specification**: `docs/specs/2026-09-21-m1-1-reliability-hardening.md`
- **Checkpoint State**: `completed` — H2 accepted; hard stop before H3
- **Objective**: Align TypeScript Node definitions with the supported Node 24 runtime, then validate the exact pushed revision remotely.
- **Completed Work**: Changed `@types/node` from Node 26 to the Node 24 major line; added a narrow declaration-major regression test; committed and pushed `505daa10f43410a6eefb28a5b758af94227c1fbe` non-force to `origin/main`.
- **Remaining Work**: H3–H7 remain gated and unauthorized.
- **Branch / Revision**: `main` and `origin/main` both resolve to `505daa10f43410a6eefb28a5b758af94227c1fbe`.
- **Changed Files**: H2 commit: `package.json`, `package-lock.json`, `tests/toolchain.test.ts`, `docs/tasks/2026-09-21-m1-1-reliability-hardening.md`, and `docs/STATE.md`. This checkpoint adds only the H2 acceptance record.
- **Decisions / Invariants**: Sureflow’s declared runtime remains `^24.0.0`; it now compiles with Node 24 type definitions. H1 remains accepted. H3–H7 remain gated and unauthorized.
- **Verification / CI Evidence**: Local `npm ci`, typecheck, 91 tests, lint, build, diff check, Node type-resolution, reference validation, and harness preflight passed. GitHub Actions CI run `35574889277` (<https://github.com/lowqualityloey/sureflow/actions/runs/35574889277>) tested `505daa10f43410a6eefb28a5b758af94227c1fbe` and concluded `success`: its `test` job plus `npm ci`, typecheck, tests, lint, build, diff, and cleanliness steps all passed.
- **Blockers**: None for H2. Separate human authorization is required before H3.
- **Scope Changes**: None.
- **Prioritized Next Action**: STOP. Do not begin H3.
