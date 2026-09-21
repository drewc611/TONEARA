# Changelog

All notable changes follow [Keep a Changelog](https://keepachangelog.com/) and semantic versioning.

## [Unreleased]

### Added

- Named projects with create, rename, archive, restore, and delete controls
- Automatic migration of the v1 flat track library into a named project
- Section markers, five-second skip controls, and a spoken waveform description
- Skip link, reduced-motion support, and focus indicators on every interactive control
- Automated accessibility smoke test covering accessible names, ARIA references, heading order, and focus styles
- Server-side hosted-provider adapter with per-request timeouts and bounded, jittered retries
- Fixed-window rate limiter and generation instrumentation that cannot carry prompt content
- Dependency review and supply-chain scorecard workflows
- Browser and device support matrix, security operations runbook, and ADR-003

### Changed

- Every GitHub Action pinned to a commit SHA, with least-privilege permissions on every workflow and job
- Checkouts no longer persist credentials; release and Pages write access scoped to the jobs that need it
- CodeQL runs the `security-extended` and `security-and-quality` query packs
- Repository validation now enforces action pinning, workflow permissions, untracked build output, and the absence of inline event handlers
- The library renders through DOM nodes and `textContent` instead of `innerHTML`
- Stored tracks are re-validated through the generation contract on every read

### Fixed

- Stale, incomplete `dist/` build output removed from version control
- Offline navigation no longer fails when the cached shell is missing
- Library actions no longer act on out-of-range indices

### Security

- Threat model updated with storage tampering, workflow supply chain, credential disclosure, and telemetry-widening rows

## [0.1.0-rc.1] - 2026-09-19

### Added

- Installable progressive web application manifest and install prompt
- Offline application shell and module caching
- Automated PWA manifest and service-worker validation
- Release-readiness checklist

### Changed

- Removed third-party font requests for a private, self-contained runtime
- Added a strict browser Content Security Policy
- Updated CI, CodeQL, Pages, and artifact actions to current supported major versions
- Moved GitHub-hosted build jobs to Node.js 24

## [0.1.0-beta.3] - 2026-09-16

### Added

- Versioned Toneara project files for portable JSON export and import
- Strict project and track validation with safe unknown-field removal
- Duplicate prevention, 1 MB import limit, and clear import status messages
- Project-file round-trip and invalid-input tests

## [0.1.0-beta.2] - 2026-09-16

### Added

- Provider-neutral generation request and result contract
- Queued, processing, completed, failed, and cancelled job states
- Primary-provider failure fallback to the local music engine
- Request validation and provider lifecycle tests
- Architecture decision record for future hosted music providers
- Keyboard-accessible seeking, accurate playback labels, focus indicators, and live busy state

## [0.1.0-beta.1] - 2026-09-16

### Added

- Browser-based instrumental generation with no API key
- Prompt, genre, mood, tempo, duration, naming, and variation controls
- Deterministic 12-variation local music engine
- Waveform, playback, seeking, regeneration, and WAV export
- Device-local recent track library
- Automated validation, tests, security scanning, Pages deployment, and tagged releases
- Repository documentation and guarded Copilot custom-agent team
