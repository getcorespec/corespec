## Why

Specguard evaluates every file in a diff, including files that never need spec coverage (lockfiles, markdown, config). This wastes tokens and produces false positives — the CI check on PR #19 failed because the LLM flagged `package.json` and an import-path change as needing specs.

## What Changes

- Add `ignore` glob patterns to `.specguard.yml` config — files matching any pattern are stripped from the diff before the LLM call
- Add a commented `.specguard.yml` to this project with ignore patterns for our codebase
- Improve the `judge-diff` prompt to guide the LLM on scoring structural/wiring changes (re-exports, import path changes) as passing

## Capabilities

### New Capabilities
- `diff-filtering`: Ignore-list support — parse glob patterns from config, filter diff hunks by file path before LLM evaluation

### Modified Capabilities
<!-- No existing specs to modify -->

## Impact

- `packages/corespec/src/tools/judge-diff.ts` — accepts ignore patterns, filters diff, prompt update
- `packages/specguard/src/core/config.ts` — parse `ignore` array from YAML
- `.specguard.yml` — project config with ignore patterns
- New dependency: glob-matching library (e.g., `picomatch`) or simple hand-rolled matching
