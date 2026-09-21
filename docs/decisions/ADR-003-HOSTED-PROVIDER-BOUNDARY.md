# ADR-003: Hosted provider trust boundary

- Status: Proposed
- Date: 2026-09-21

## Context

ADR-002 established that hosted providers must be reached through a server-side adapter, but left the adapter unbuilt. Until it exists, the roadmap's remaining v0.2 items — server-side secret handling, rate limits, and generation instrumentation — have nowhere to live.

Adding a server changes Toneara's trust boundary. The release candidate has no backend, collects no telemetry, and keeps every prompt on the device. Any server-side component can undo all three by accident.

## Decision

The adapter lives in `server/` and never ships to the browser. It is a library, not a running service: nothing in this change starts a listener, opens a port, or contacts a provider. Wiring it to a deployment is a separate, owner-approved step.

Three constraints hold for anything added under `server/`:

1. **Credentials stay in the process environment.** `readProviderConfig` reads `TONEARA_PROVIDER_URL` and `TONEARA_PROVIDER_KEY` from the environment, requires HTTPS, and returns the key only to the request signer. No credential is logged, returned in an error, or written to disk. No `.env` file is committed.
2. **Every provider call is bounded.** Requests carry a timeout, retries stop at a configured maximum, and only transient failures (timeouts, connection resets, and 408/425/429/5xx) are retried. Backoff is exponential with jitter and capped. Cancellation is reported as cancellation, never as a provider failure.
3. **Instrumentation records shape, not content.** `createMetrics` accepts a provider id, an outcome from a fixed set, a duration, and a failure code. It has no parameter that can carry a prompt, a track name, or a user identifier, so telemetry cannot quietly widen data collection.

Rate limiting keys are opaque strings chosen by the caller. The limiter never sees request content.

## Consequences

- The remaining v0.2 roadmap items are implementable and tested without a live provider.
- The browser's zero-dependency, zero-telemetry posture is unchanged, because none of this code reaches the client.
- Deploying the adapter still requires a new privacy review, an authenticated request path, and an incident-response plan. This ADR does not authorize a deployment.
- If a future change adds a parameter to `createMetrics` that can carry free text, this decision is void and needs revisiting.
