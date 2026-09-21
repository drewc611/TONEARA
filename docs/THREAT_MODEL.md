# Threat Model

## Assets

- User prompts and locally saved settings
- Generated audio
- Exported project files
- Repository integrity and release artifacts
- Future provider credentials

## Current threats and controls

| Threat | Current control |
|---|---|
| Prompt disclosure | Browser-local processing and storage |
| Script injection through names or prompts | Escaping before library rendering |
| Oversized or malformed project import | 1 MB browser limit, strict schema and field validation, 100-track limit, no imported HTML execution |
| Sensitive values hidden in imported records | Allowlisted track fields; unknown fields are discarded before storage |
| Tampered browser storage | Stored tracks are re-validated through the generation contract on every read; entries that fail are dropped, not repaired |
| Markup injection through any rendered value | The application builds DOM nodes and sets `textContent`; it contains no `innerHTML` |
| Dependency compromise | Runtime has no third-party dependencies; dependency review runs on every pull request |
| Workflow supply-chain compromise | Every action pinned to a commit SHA, least-privilege `permissions` on every workflow and job, `persist-credentials: false` on every checkout, all enforced by `npm run check` |
| Malicious repository changes | Pull-request checks, CodeQL with `security-extended`, dependency review, supply-chain scorecard, owner approval |
| Stale or forged build output | `dist/` is never tracked in git and is rebuilt from source in CI |
| Release tampering | Tag-driven build from repository source |
| Provider credential disclosure | Credentials read from the server process environment only, never returned in a response or an error, never present in browser code |
| Telemetry widening data collection | `server/metrics.mjs` accepts no parameter capable of carrying prompt or track content |
| Provider abuse or runaway cost | Bounded retries, per-request timeouts, and a fixed-window rate limiter in `server/` |

The `server/` adapter is a library with no listener, no deployment, and no live provider. Running it changes the trust boundary and needs the review below first.

Uploads, authentication, payments, and cross-device storage remain outside the current trust boundary and require a new review. See [ADR-003](decisions/ADR-003-HOSTED-PROVIDER-BOUNDARY.md) and [security operations](SECURITY_OPERATIONS.md).
