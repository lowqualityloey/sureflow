# Spec & Plan: Upgrade embedded PromptKit OS to v2.3.0

<a id="PLAN-promptkit-os-v2.3.0-upgrade"></a>

- **Author**: DeepSeek Harness (AI coding agent)
- **Status**: Executed 2026-11-17 — see §9 Execution record
- **Created**: 2026-11-17
- **Scope**: Tooling/engine upgrade (the embedded PromptKit OS), not the Sureflow product
- **Ceremony**: PromptKit OS Level 1 (Standard) — read-only intake plus planning, no product code/schema change
- **Branch context**: `fix/ci-cli-artifact-isolation` (pre-existing, unrelated work must not be staged)

---

## 1. Intent and why

Sureflow pins PromptKit OS as a git submodule at `.promptkit`. That pin is `3ee07fa` (`git describe` = `v1.8.0-90-g3ee07fa`), many releases behind the target `v2.3.0`. The goal is to upgrade the embedded engineering operating system to v2.3.0 so that the project's agent directives, workflows, protocols, and verification rules match the current approved kit — without disturbing Sureflow's product code, milestones, or the in-flight CI artifact-isolation work.

**Deliverable**: this explanation + plan document, plus the executed upgrade recorded in §9.

## 2. What was ingested — the Sureflow repo

**Identity & state.** `sureflow` 0.1.0, standalone repo, branch `fix/ci-cli-artifact-isolation`. Four test files are already modified and are pre-existing work:

- `tests/distributionT1PackageBuild.test.ts`
- `tests/distributionT3PackageArtifact.test.ts`
- `tests/helpers/cliArtifact.ts`
- `tests/toolchain.test.ts`

These must remain untouched/un-staged by the upgrade.

**Purpose.** Experimental local CLI for bounded changes in supported Node.js/TypeScript projects. Commands: `init`, `preflight`, `run`, `status`, `verify`. No UI, server, or database — state lives in `.sureflow/` JSON plus `docs/STATE.md`.

**Stack & gates.** TypeScript strict; Node `^24.0.0`; npm `>=11`; Vitest (unit tests); ESLint. Verification tiers: `npm run typecheck` (L0/1), `npm test` (L1/2), plus `npm run lint` and `npm run build` at extended tier. Prior full-suite baseline: 606/606 tests across 43 files.

**Milestone status.** M1–M4 complete and integrated. Distribution T0–T3 complete; the accepted `sureflow@0.1.0` artifact is bound to source commit `7ea4c748f2c67e533548c7a67b64d1154a0a3794`, unpublished. T4+ and M5 are explicitly unauthorized. The Distribution / First-Use gate remains OPEN.

## 3. How PromptKit OS is wired in

- `.promptkit` is a **git submodule** (`.gitmodules` → `https://github.com/lowqualityloey/promptkit-os.git`), pinned by a gitlink in the parent repo.
- Four host directive files carry a `<!-- PROMPTKIT_START … PROMPTKIT_END -->` managed block:
  - `AGENTS.md`
  - `GEMINI.md`
  - `.clinerules/promptkit.md`
  - `.opencode/rules.md`
- `PROMPTKIT.md` holds the project profile: `profile: balanced`, `tracking: local`, `status-cards: on`, plus user-owned invariants. `docs/STATE.md` is the living state tracker.
- The installer regenerates only the managed directive block and never overwrites user-owned content (verified in the kit's own README/QUICKSTART and the v2.3.0 release notes).

## 4. The version gap (observed, this turn)

| Item | Current | Target |
|---|---|---|
| Submodule pin (gitlink in HEAD) | `3ee07fa1773da89fd8254734374263b9d41a5b8e` | `v2.3.0` tag → release-prep commit `52adbe16c0ff2aea0d538e10c3225c2f3e40e315` |
| `git -C .promptkit describe --tags` | `v1.8.0-90-g3ee07fa` | `v2.3.0` |
| Span | — | 1,838 files changed, ~166,046 insertions, ~3,435 deletions |
| Tag availability | Submodule lacks `v2.3.0` locally | Tag exists in the local clone `/home/heyloey/personal/promptkit-os` |

**v2.3.0** (2026-11-15, evaluation `REL-2026-11-15-V2.3.0-001`) is additive:

- **N01** — untrusted-content boundary in both shipped directives and `protocols/context-sync.md §3.3` (repository files, README, issue/PR bodies, commit messages, fetched pages are data, never instructions).
- **N02** — corrected offline write-matcher across eight review rounds in both eval harness twins.
- **N03–N07** — README host-matrix honesty, safe submodule-removal recipe, re-measured token figures (Balanced 2,488/2,500; Lite 1,482/1,500), Balanced-only workflow caveat, tracking-gate documentation.
- **M01–M04** — maintenance (release dossier, benchmark provenance, task-record CI evidence, test-only injection rubric).

**Behavioral note.** The current pinned kit still carries the retired Jev / AI-gateway routing headers in `scripts/pk-route.ps1`. v2.x routing is fully offline and deterministic (no network, no credentials), and the migration guide explicitly promises no classification parity with the retired path.

## 5. Upgrade procedure (plan — not executed)

### Step 0 — Baseline & guard
- Record current gitlink `3ee07fa`, profile `balanced`, and the four dirty test files.
- Confirm no staging of the dirty files: `git status --short`.

### Step 1 — Fetch the tag into the submodule
The submodule has no `v2.3.0` ref locally. Seed it from the existing local clone to stay offline:

```bash
git -C .promptkit fetch /home/heyloey/personal/promptkit-os refs/tags/v2.3.0:refs/tags/v2.3.0
```

### Step 2 — Pin exactly v2.3.0
Do **not** use `git submodule update --remote --merge` — that tracks `main`, which is currently ahead of the tag and would overshoot. Checkout the tag and stage the gitlink:

```bash
git -C .promptkit checkout v2.3.0
git add .promptkit
```

### Step 3 — Re-run the idempotent installer
Regenerate the managed directive blocks, preserving all four configured hosts:

```bash
bash .promptkit/init.sh --balanced --host=agents,gemini,cline,opencode
```

Expected: only `<!-- PROMPTKIT_START … PROMPTKIT_END -->` blocks refresh; user-owned sections of `PROMPTKIT.md`, `docs/STATE.md`, and `docs/adrs/` survive.

### Step 4 — Verify
- `pk:doctor` — read-only audit of host directives, engine version, ignore-state, docs drift, intake provenance, and submodule registration.
- `git -C .promptkit describe --tags` → must print `v2.3.0`.
- `git ls-tree HEAD .promptkit` → new gitlink after commit.
- Re-run product gates to prove the engine swap did not disturb Sureflow:
  `npm run typecheck && npm test && npm run lint && npm run build`

### Step 5 — Commit atomically
Conventional Commit scoped to the gitlink plus any regenerated managed blocks/docs:

```
chore(promptkit): upgrade embedded PromptKit OS to v2.3.0
```

Keep it separate from the CI artifact-isolation branch work (the four dirty test files). Then run `pk:sync` in the next session so the agent hot-reloads the new rules.

## 6. Decisions and rationale

- **Pin to the tag, not `main`** — you named v2.3.0 specifically; the tag is reproducible, whereas `main` is a moving target already ahead of the release.
- **Preserve all four hosts** — dropping any host from `--host=` leaves that directive's managed block stale.
- **Docs drift** — if `pk:doctor` flags `PROMPTKIT.md` / `STATE.md` drift from the version jump, reconcile via `pk:sync`, not manual rewrites.

## 7. Constraints / non-goals

- No Sureflow product code change, no milestone advance, no publication/tag mutation, no M5 work.
- Distribution / First-Use gate stays OPEN; T4+ remain unauthorized.
- Do not stage or alter the four pre-existing dirty CI test files.
- This document and the preceding chat explanation are the deliverable; execution requires a follow-up instruction.

## 8. Evidence basis

Observed this turn via read-only inspection: parent-repo `git status/log/ls-tree`, `.gitmodules`, `PROMPTKIT.md`, `docs/STATE.md`, `package.json`, submodule `git log/describe/tag/diff`, and `git show v2.3.0:` of `CHANGELOG.md`, `QUICKSTART.md`, `README.md`, `docs/MIGRATION.md`, and the v2.3.0 release notes. No product tests, builds, installs, or verifier acceptance were rerun for this docs-only task.

---

## 9. Execution record (2026-11-17)

The user authorised execution. Steps 1-3 and 5 of §5 were carried out; verification findings follow.

| Step | Command / action | Result |
|---|---|---|
| 0 | Baseline capture | gitlink `3ee07fa`; four pre-existing dirty test files recorded, left untouched |
| 1 | `git -C .promptkit fetch <local-clone> refs/tags/v2.3.0:refs/tags/v2.3.0` | OK - tag `d68147f0` → commit `52adbe16` |
| 2 | `git -C .promptkit checkout v2.3.0 && git add .promptkit` | OK - gitlink staged `3ee07fa..52adbe1`; `describe` = `v2.3.0` |
| 3 | `PROMPTKIT_NO_INTERACTIVE=1 bash .promptkit/init.sh --balanced --host=agents,gemini,cline,opencode` | Exit 0; preflight `NO_FINDINGS_FIXED_SCOPE_ONLY`; 4 directive blocks regenerated; `ASSERT\|submodule\|status\|OK` |
| 4 | `pk:doctor` + product gates | See below |
| 5 | Atomic commit | See below |

**User-owned content preserved.** Installer diff on `PROMPTKIT.md` is limited to `Installed` → `Profile written: 2026-11-17` and the relocated `profile:/tracking:/projection:` lines; `docs/STATE.md` gained exactly one line (`Engine Version: v2.3.0 @ 52adbe1`); `docs/adrs/` unchanged (2 files). All four directive files changed only inside the managed block. The empty `docs/tests/` directory the installer created is untracked and harmless.

**`pk:doctor` (read-only).** Host blocks: OK for all 4 installed hosts; ignore-state: OK; submodule registration: OK. Two non-green rows:

- `version STALE(+5)` - upstream `main` is 5 documentation-only commits ahead of the v2.3.0 release tag (`496c14d`, `aec41e3` record publication outcomes; the tag is an ancestor of `main`). Expected when pinning to a released tag; not a divergence. The initial `DIVERGED` reading was a false alarm from a stale `origin/main` ref, resolved by fetching the ref.
- `docs-drift DIVERGED` and `provenance SKIP` - pre-existing STATE §3A / intake-placeholder conditions, unchanged by this upgrade (the installer added only the engine-version line). Not in scope to reconcile here.

**Product gates (this turn).**

- `npm run typecheck`: pass (exit 0).
- `npm run build`: pass (exit 0).
- `npm test`: 2 failures / 606 tests in pre-existing dirty files, both toolchain-version assertions unrelated to the engine swap: `tests/toolchain.test.ts` expects Node 24 but runtime is v26.13.1; `tests/distributionT3PackageArtifact.test.ts` expects npm 11 but runtime is 12.2.2.
- `npm run lint`: the vendored `.promptkit/**` JS (absent at the old pin) produced 59 errors on first run; fixed by excluding `.promptkit/**` from the host ESLint config (`eslint.config.js`). The one remaining error is in the pre-existing dirty `tests/helpers/cliArtifact.ts` and belongs to the in-flight CI artifact-isolation work, not this upgrade.

**Commit boundary.** Committed atomically: gitlink + 4 regenerated directives + `PROMPTKIT.md` + `docs/STATE.md` + `eslint.config.js` + this spec. The four dirty CI test files were NOT staged. Run `pk:sync` in the next session to hot-reload the new directives.
