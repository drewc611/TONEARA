# Toneara repository instructions

- Read `docs/PRODUCT_REQUIREMENTS.md`, `docs/ARCHITECTURE.md`, and the relevant ADR before changing product behavior.
- Keep the beta browser-first, dependency-light, accessible, and usable on mobile.
- Preserve deterministic output for identical generation settings.
- Never move provider credentials or other secrets into client code.
- Do not add analytics, tracking, uploads, accounts, payments, or external generation providers without an approved issue and ADR.
- Escape all user-controlled content before HTML rendering.
- Run `npm run verify` for every change.
- Keep changes issue-scoped. Update tests, documentation, and changelog when behavior changes.
- Never merge, publish, modify licensing, weaken a check, or bypass owner approval.
