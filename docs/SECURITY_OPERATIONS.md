# Security operations

What the repository enforces on its own, and what only the owner can switch on.

## Enforced in the repository

| Control | Where |
|---|---|
| Every GitHub Action pinned to a commit SHA | `.github/workflows/`, enforced by `scripts/validate.mjs` |
| Every workflow declares least-privilege `permissions` | `.github/workflows/`, enforced by `scripts/validate.mjs` |
| Checkouts do not persist credentials in `.git/config` | `persist-credentials: false` on every checkout |
| Write access scoped to the job that needs it | `release.yml`, `pages.yml`, `codeql.yml` |
| Dependency review on every pull request | `.github/workflows/dependency-review.yml` (inert until the dependency graph is enabled, see below) |
| CodeQL with `security-extended` and `security-and-quality` | `.github/workflows/codeql.yml` |
| Supply-chain scorecard into code scanning | `.github/workflows/scorecard.yml` |
| Build output never tracked in git | enforced by `scripts/validate.mjs` |
| No inline event handlers, so the CSP holds | enforced by `scripts/validate.mjs` |
| Stored tracks re-validated before use | `app/project-library.mjs` |
| No `innerHTML` anywhere in the application | `app/app.js` builds DOM nodes and sets `textContent` |

Scorecard results stay in this repository's code-scanning view. `publish_results` is `false`; publishing to the public OpenSSF API is an owner decision.

## Owner-only settings

These cannot be set from a pull request. Each one needs a visit to repository settings.

- [ ] **Branch protection on `main`** — require pull requests, require CI / CodeQL / Dependency review to pass, require branches to be up to date, block force pushes and deletions, and include administrators. <https://github.com/drewc611/TONEARA/settings/branches>
- [ ] **Dependency graph** — `dependency-review.yml` cannot compare anything without it and reports the gate as inert on every pull request until it is on. <https://github.com/drewc611/TONEARA/settings/security_analysis>
- [ ] **Private vulnerability reporting** — `SECURITY.md` tells reporters to use it, so it has to be on. <https://github.com/drewc611/TONEARA/settings/security_analysis>
- [ ] **Secret scanning and push protection** — blocks a credential from reaching history in the first place. Same page as above.
- [ ] **Restrict `GITHUB_TOKEN` default permissions to read-only** — workflows already declare what they need. <https://github.com/drewc611/TONEARA/settings/actions>
- [ ] **Require approval for all outside-collaborator workflow runs** — same page as above.
- [ ] **GitHub Pages source set to GitHub Actions** — a release-readiness gate. <https://github.com/drewc611/TONEARA/settings/pages>
- [ ] **Tag protection for `v*`** — releases build from tags, so the tag is the release. <https://github.com/drewc611/TONEARA/settings/tag_protection>

## Rotating a provider credential

`TONEARA_PROVIDER_KEY` has no deployment yet. When one exists:

1. Issue the replacement at the provider before revoking anything.
2. Update the deployment environment, not the repository. The key is never a repository secret consumed by browser code.
3. Revoke the old key at the provider.
4. Confirm `server/hosted-provider.mjs` still refuses to start without both variables set.

## Responding to a report

1. Acknowledge privately. Never move the discussion into a public issue.
2. Reproduce against the current `main`.
3. Fix on a private fork or a branch that does not name the vulnerability.
4. Release, then publish the advisory.
