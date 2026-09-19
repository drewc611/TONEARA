# Changelog

All notable changes follow [Keep a Changelog](https://keepachangelog.com/) and semantic versioning.

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
