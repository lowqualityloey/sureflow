# Sureflow

Sureflow is an experimental, source-built local CLI for bounded changes in
supported Node.js/TypeScript projects. It checks a task's declared scope,
applies only bounded existing-file replacements, runs declared project checks,
and records evidence. Sureflow is a control tool, not a coding agent.

> **Reason freely. Act within bounds. Prove the result.**

## Experimental status

The accepted implementation currently reaches M4. It is designed for local
use and has no published npm implementation package. The package version is a
development placeholder, not a release. Build Sureflow from source as described
below; `npx sureflow` is not a supported installation path.

## What works today

- A local CLI with `init`, `preflight`, `run`, `status`, and `verify`.
- The original M1 local task-gate path and its executable T0 fixture.
- Schema-v1 tasks for one bounded replacement of an existing tracked file.
- Schema-v2 tasks for an exact set of 2–5 bounded replacements of existing
  tracked files.
- Project detection for supported standalone Node/TypeScript projects using
  npm, plus a narrow pnpm project shape.
- Read-only complete-set preflight, bounded writes, exact Git-visible change
  certification, per-target readback/evidence, and fixed-profile verification.

## Requirements

- Node.js `^24.0.0` (Node 24.x).
- npm `>=11` to install and build Sureflow.
- Git for project-boundary and changed-file checks.
- A supported project: standalone Node/TypeScript, with `package.json`,
  `tsconfig.json`, the appropriate lockfile, and scripts for the verification
  profiles you select.

Sureflow supports the npm adapter and a constrained pnpm adapter. Workspaces
and monorepos are not supported. The narrow pnpm shape requires a non-empty
`pnpm-lock.yaml`, no `package-lock.json`, no workspace markers, and consistent
package-manager metadata.

## Build Sureflow from source

```bash
git clone https://github.com/lowqualityloey/sureflow.git
cd sureflow
npm ci
npm run build
```

This builds the CLI at `dist/src/cli.js`. No global install or published npm
package is required. The Node engine is a version range, not an exact pin.

## Quick start on your own project

Run Sureflow with your project as the current working directory. The CLI uses
the current directory as the project root; it does not target the Sureflow
checkout unless you run it from there.

```bash
cd /path/to/your/project
node /path/to/sureflow/dist/src/cli.js init
```

`init` creates local `.sureflow/` state and the default policy. It does **not**
create `.sureflow/task.json`; write that task contract yourself. Before using
M2–M4, make sure the project is a Git repository with a clean baseline and that
each target is an existing tracked regular UTF-8 file.

Create `.sureflow/task.json` for a schema-v2 task. The following is a
schema-shape template, not a runnable task: replace both hash placeholders
with the exact SHA-256 hashes of the corresponding files in your project, and
replace paths/content with your intended changes.

Save the completed JSON as `.sureflow/task.json` in your project root after
running `init`.

```json
{
  "schemaVersion": 2,
  "taskId": "TASK-2026-09-update-profile",
  "adapter": "node-typescript/npm-scripts-v1",
  "operation": "replace-existing-files",
  "targets": [
    {
      "path": "src/profile.ts",
      "expectedBeforeSha256": "REPLACE_WITH_64_HEX_SHA256",
      "replacementContent": "export const profileName = \"Updated profile\";\n"
    },
    {
      "path": "src/profileLabel.ts",
      "expectedBeforeSha256": "REPLACE_WITH_64_HEX_SHA256",
      "replacementContent": "export const profileLabel = \"Updated label\";\n"
    }
  ],
  "requiredVerification": ["typecheck", "test", "lint", "build"]
}
```

Compute a file's hash before choosing replacement content, for example:

```bash
sha256sum src/profile.ts src/profileLabel.ts
```

On PowerShell, use `Get-FileHash -Algorithm SHA256 path`. Every value must
match the exact preimage bytes when the task is preflighted. The example hashes
are deliberately placeholders and will be rejected. A fixture contract is
available at
[`fixtures/m2-node-ts-project/task.m4.example.json`](fixtures/m2-node-ts-project/task.m4.example.json),
but its paths and hashes apply only to that fixture.

From the project root, use the task ID from the contract:

```bash
node /path/to/sureflow/dist/src/cli.js preflight TASK-2026-09-update-profile
node /path/to/sureflow/dist/src/cli.js run TASK-2026-09-update-profile
node /path/to/sureflow/dist/src/cli.js status
node /path/to/sureflow/dist/src/cli.js verify TASK-2026-09-update-profile
```

Preflight reports structural eligibility only. It is read-only and does not
authorize a run. `run` performs fresh checks and is the command that may
replace the declared files. `verify` evaluates persisted proof and fresh Git
scope without rerunning the project's verification commands.

## CLI commands

| Command | Purpose |
|---|---|
| `sureflow init` | Initialize local `.sureflow/` state in the current project; does not author a task contract. |
| `sureflow preflight <taskId>` | Read-only eligibility check for the matching task contract. |
| `sureflow run <taskId>` | Recheck eligibility, apply authorized replacements, run declared checks, and record evidence. |
| `sureflow status` | Show local task/project status. |
| `sureflow verify <taskId>` | Check persisted evidence against fresh project scope; does not rerun tests/builds. |

The same commands can be invoked with `node /path/to/sureflow/dist/src/cli.js`
when using the source build. `--help` and `-h` show CLI usage.

## Current limitations and safety semantics

- Supported targets are existing, tracked, regular UTF-8 files inside the
  project boundary. Schema-v2 accepts 2–5 targets; it does not create, delete,
  or rename files.
- Paths must be normalized and unique, the preimage digest must match, and a
  no-op replacement is refused. Control-plane data and repository metadata are
  not valid targets.
- Required checks are selected from the closed `typecheck`, `test`, `lint`,
  and `build` profiles and must resolve through the supported adapter.
- Sureflow dispatches fixed npm/pnpm scripts, not arbitrary task shell
  commands. Those project scripts still run as ordinary host processes and
  may access resources available to the user account.
- Preflight is read-only; successful preflight is not permission to mutate.
- A later write or verification failure may leave an earlier authorized target
  changed. Multi-file runs are not transactions and Sureflow does not roll back
  applied files automatically.
- There is no autonomous multi-agent execution, dynamic worker orchestration,
  skills runtime, MCP/provider integration, generalized host adapters,
  deployment orchestration, cloud service, or generalized repair loop.
- No OS/filesystem/network sandbox is provided.

## How Sureflow works

For a schema-v2 task, Sureflow loads the closed contract, detects the supported
project shape, and checks the complete declared target set before any project
write. A run takes the project mutation lock, refreshes those checks,
revalidates and replaces targets in deterministic order, observes the resulting
files and Git-visible changed set, runs declared verification, and records
per-target and aggregate evidence. Acceptance requires the supported
verification and scope evidence to pass. A failed operation halts; it does not
claim rollback or atomicity.

Schema v1 retains the earlier single-target contract. The original M1/T0 path
remains available separately.

## Future architecture

The architecture explores ideas beyond today's runtime, including dynamic
workers, parallel multi-agent task graphs, reusable skills and recipes, MCP
and provider integrations, generalized host/project adapters, broader
orchestration, deployment controls, and repair loops. These are design
direction only; they must not be read as implemented product features.

## Security

Sureflow applies bounded path, project, Git-scope, and evidence checks, but it
does not isolate project verification code from the host. Read the
[`Security model`](SECURITY.md) before running it on a project whose scripts
or dependencies you do not trust.

## Documentation

| Document | Purpose |
|---|---|
| [Architecture](ARCHITECTURE.md) | Implemented boundary and longer-term design direction |
| [Roadmap](ROADMAP.md) | Accepted capabilities and future candidates |
| [Changelog](CHANGELOG.md) | Unreleased implementation and documentation changes |
| [Security](SECURITY.md) | Security model, implemented controls, and limitations |
| [Contributing](CONTRIBUTING.md) | Source contribution guidance |
| [Current state](docs/STATE.md) | Milestone and execution-state record |
| [M4 Task Record](docs/tasks/2026-09-23-m4-bounded-multi-file-delivery.md) | M4 scope and acceptance history |

## Contributing and status

Sureflow remains experimental. M1 through M4 and the separate post-M4 size
remediation are complete and integrated into `main`; no next milestone is
currently authorized. See [CONTRIBUTING.md](CONTRIBUTING.md) for development
guidance. The repository's tests, typecheck, lint, and build commands are
available through npm scripts.

> **Reason freely. Act within bounds. Prove the result.**
