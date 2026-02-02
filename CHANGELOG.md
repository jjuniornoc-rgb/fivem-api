# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

- **MAJOR** (x.0.0): Breaking changes to the public API.
- **MINOR** (0.x.0): New features and options, backward compatible.
- **PATCH** (0.0.x): Bug fixes and internal improvements, backward compatible.

## [Unreleased]

## [2.0.7] - 2026-02-02

### Added

- TypeScript migration: full codebase in TypeScript with strict mode and declaration files.
- New options: `cacheTtlMs`, `retry`, `circuitBreaker` for resilience and performance.
- New methods: `filterPlayers(players, predicate)`, `sortPlayers(players, key, order)`.
- **MultiServerManager**: manage multiple FiveM servers (addServer, removeServer, getServer, getAllStatus, fromEntries); events re-emitted with `serverId`.
- Jest test suite: unit tests (util, structures), integration tests (DiscordFivemApi, MultiServerManager), fixtures for FiveM API mocks.
- CI: GitHub Actions workflow (lint, format check, build, test).
- Documentation: TypeDoc (`npm run docs`), README with TypeScript examples, MIGRATION.md.
- package.json: `exports` for Node resolution, `sideEffects: false` for tree shaking.
- Source maps and declaration maps in build output.

### Changed

- **Package renamed:** `discord-fivem-api` → `varlet-fivem-api`. Install with `npm install varlet-fivem-api`. Repository: https://github.com/jjuniornoc-rgb/varlet-fivem-api.
- **Breaking:** Package entry point is now `./dist/index.js` (was `./src/index.js`). Run `npm run build` before publishing.
- Defaults for options are applied correctly when passing a partial `options` object (fix for port, useStructure, interval).
- `useStructure` default is now `false` (was previously inconsistent).

### Fixed

- Constructor options bug: defaults for `port`, `useStructure`, and `interval` were overwritten by `options`; now merged correctly.

## [2.0.6]

- Previous release (JavaScript codebase). See repository history for earlier changes.
