# ADR-001: Browser-first beta

- Status: Accepted
- Date: 2026-09-16

## Decision

Ship the first beta as a static browser application with deterministic local audio generation.

## Rationale

This delivers a complete prompt-to-playback experience without provider cost, secret management, accounts, or a backend. It also establishes the interface and engine boundary needed for a later hosted model.

## Consequences

Audio quality and duration are intentionally limited. Settings are device-local. A future provider integration requires a server-side adapter and expanded security, privacy, and reliability controls.
