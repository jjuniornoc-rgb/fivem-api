# Changelog

All notable changes to this project will be documented in this file.

## [2.1.0] - 2026-02-08

### Added
- Native `fetch` support (Node.js 18+) replacing axios dependency
- Auto-cleanup for TTL cache to prevent memory leaks
- Periodic cleanup for cfx.re resolver cache
- Enhanced `Player` class with typed getters (`name`, `id`, `identifiers`)
- Helper methods: `getIdentifier()` and `hasIdentifier()`
- Stricter TypeScript compiler options

### Changed
- **BREAKING**: Minimum Node.js version is now 18.0.0
- Polling algorithm optimized from O(n²) to O(n) using Set-based lookups
- Parallel requests in polling (50% faster)
- Resource change detection now uses Set for O(1) lookup
- Renamed utility files to lowercase (`error.ts`, `util.ts`)

### Removed
- `axios` dependency (~300KB bundle reduction)
- `fetchWithRetry.ts` (replaced by `httpClient.ts`)
- All code comments for cleaner codebase

### Fixed
- Memory leaks from expired cache entries
- Case-sensitivity issues on Windows

## [2.0.7] - Previous Version

Initial optimized release.
