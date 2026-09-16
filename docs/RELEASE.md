# Release Process

1. Confirm the milestone is complete and `npm run verify` passes.
2. Update `CHANGELOG.md` and the package version.
3. Merge through a reviewed pull request.
4. Create an annotated semantic-version tag matching the package version, currently `v0.1.0-beta.2`.
5. The release workflow builds the application, packages the artifact, and creates a GitHub prerelease for beta tags.
6. Verify the deployed demo and downloadable archive before announcing the release.

Only the product owner approves production releases.
