# npm Publish Pipeline Design

## Overview

Automated npm publishing for all `@getcorespec` packages using release-please and GitHub Actions.

## Architecture

Two workflows:

- **cicd.yaml** — build, test, then run release-please on main. If a release is created, triggers the release workflow.
- **release.yaml** — `workflow_dispatch` that checks out a git tag and publishes to npm. Can be triggered automatically by cicd or manually.

## Flow

```
PR → build-and-test
Main push → build-and-test → check-release (release-please) → trigger-release
                                                                     ↓
                                                              release.yaml
                                                                     ↓
                                                              pnpm -r publish
```

## Packages

All three packages are included in the release-please config:

| Package | npm Name | Version |
|---------|----------|---------|
| packages/corespec | @getcorespec/corespec | 0.0.1 |
| packages/specguard | @getcorespec/specguard | 0.0.1 |
| packages/respec | @getcorespec/respec | 0.0.1 |

## Secrets Required

- `NPM_TOKEN` — npm granular access token scoped to `@getcorespec`

## Decisions

- **Public access** — packages published with `--access public`
- **All packages included** — even respec (stub), can be excluded later
- **Separate release workflow** — matches agents-at-scale-ark pattern, allows manual re-runs
- **bump-minor-pre-major** — while pre-1.0, `feat:` bumps patch not minor
