# Security Policy

## Supported versions

Only the latest beta release is supported during early development.

## Reporting

Do not open public issues for vulnerabilities. Use GitHub's private vulnerability reporting feature when enabled, or contact the repository owner privately.

Include affected version, reproduction steps, impact, and any suggested remediation. Never include real credentials or private user data.

## Current posture

Toneara runs generation in the browser, has no backend, collects no telemetry, and stores track settings only in local browser storage. Generated audio exists in browser memory until downloaded.

The `server/` directory holds a hosted-provider adapter that is not deployed and not reachable from the browser. It reads credentials from the process environment, never from repository secrets consumed by client code.

Supply-chain controls, and the settings only the repository owner can enable, are listed in [docs/SECURITY_OPERATIONS.md](docs/SECURITY_OPERATIONS.md). Deploying a hosted provider requires a separate threat model and an approved architecture decision.
