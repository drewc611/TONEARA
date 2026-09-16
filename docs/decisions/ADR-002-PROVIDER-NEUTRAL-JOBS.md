# ADR-002: Provider-neutral generation jobs

- Status: Accepted
- Date: 2026-09-16

## Context

Toneara must support its credential-free local engine today and hosted generation providers later. Connecting the interface directly to either implementation would spread vendor behavior through the product and make failures hard to manage.

## Decision

All generation runs through a small job service. It validates an immutable request, publishes queued and processing updates, selects a provider, returns a normalized completed result, and publishes terminal failed or cancelled states. A configured fallback may complete a job when the primary provider fails.

Hosted providers must be reached through a server-side adapter. Provider credentials, billing identifiers, and privileged controls must never be included in browser code.

## Consequences

- The interface remains stable when providers change.
- Local generation remains available without credentials or network access.
- Job status, cancellation, and provider failures have one testable contract.
- A future hosted adapter still requires an authenticated backend, persistence, rate limits, and operational monitoring.
