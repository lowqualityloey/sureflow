# Changelog

All notable changes to Sureflow will be documented in this file.

The project follows a human-readable changelog format inspired by
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

Versioning is intended to follow [Semantic Versioning](https://semver.org/)
once Sureflow has a released implementation.

## [Unreleased]

### Added

- Initial project documentation and architectural specification.
- M1–M4 local CLI implementation for bounded tasks on supported Node/TypeScript
  projects, including schema-v1 single-file and schema-v2 2–5-file contracts.
- Executable deterministic `fixtures/t0-basic/` acceptance fixture.
- M4 complete-set preflight, ordered bounded writes, post-write scope
  certification, per-target evidence, and integrated npm/pnpm task flow.

### Changed

- Current-facing documentation now distinguishes accepted M1–M4 behavior
  from future architecture and gives a first-time source-build/use path.

### Fixed

- M1 status now surfaces persisted completed task lifecycle state.
- M1 verification reconciles stale accepted state to `halted` on FAIL/UNKNOWN.

### Security

- M1 adds default-deny policy, protected-operation terminal halts,
  path-jail enforcement for repo.read/repo.write, closed npm-test dispatch,
  pre-write redaction, and bounded negative-path coverage.
- M1 does not claim OS sandboxing or perfect secret prevention.

## Release policy

Until the first implementation release is published, documentation and
implementation changes may be recorded under `[Unreleased]`.

Once releases begin:

- Keep entries concise and user-facing.
- Group changes under `Added`, `Changed`, `Deprecated`, `Removed`, `Fixed`,
  and `Security` where applicable.
- Link releases, issues, and pull requests when useful.
- Do not claim a feature is implemented when it is only architectural.
- Record security fixes without exposing sensitive vulnerability details.

## Version history

No released implementation versions yet.
