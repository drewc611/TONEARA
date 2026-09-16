# Security Policy

## Supported versions

Only the latest beta release is supported during early development.

## Reporting

Do not open public issues for vulnerabilities. Use GitHub's private vulnerability reporting feature when enabled, or contact the repository owner privately.

Include affected version, reproduction steps, impact, and any suggested remediation. Never include real credentials or private user data.

## Current posture

Toneara runs generation in the browser, has no backend, collects no telemetry, and stores track settings only in local browser storage. Generated audio exists in browser memory until downloaded. Future hosted providers require a separate threat model and approved architecture decision.
