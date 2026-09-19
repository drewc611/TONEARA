# Release Readiness

## Automated gates

- [x] Repository validation
- [x] Unit and contract tests
- [x] Production build
- [ ] Pull-request CI on Node.js 24
- [ ] CodeQL analysis
- [x] PWA artifact inspection and local HTTP smoke test

## Product gates

- [x] Prompt to generated instrumental
- [x] Playback, seeking, regeneration, and WAV download
- [x] Device-local track library
- [x] Portable project import and export
- [x] Keyboard-accessible primary playback controls
- [x] Installable offline application shell
- [ ] Manual Chrome, Edge, Firefox, and Safari qualification
- [ ] Manual phone and tablet qualification

## Security and privacy gates

- [x] No runtime dependencies
- [x] No provider credentials in browser code
- [x] No third-party runtime network requests
- [x] Content Security Policy
- [x] Strict project-import validation
- [x] Privacy and threat-model documentation

## Owner-controlled release gates

- [ ] Enable GitHub Pages with GitHub Actions as the source
- [ ] Complete manual release smoke tests
- [ ] Approve and merge the release-candidate pull request
- [ ] Create and push the annotated `v0.1.0-rc.1` tag
- [ ] Verify the GitHub prerelease artifact and hosted application

The local edition is release-candidate ready when all automated and manual gates above are complete. A hosted music provider is a separate post-release integration and is not part of this release scope.
