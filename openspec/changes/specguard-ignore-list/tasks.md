## Tasks

- [x] Add `picomatch` dependency to `packages/corespec`
- [x] Extend YAML parser in `config.ts` to support list items under `ignore` key
- [x] Add `ignore` to `SpecguardConfig` interface
- [x] Add diff-filtering function in `judge-diff.ts` — split on `diff --git` headers, match file paths against ignore patterns, reassemble
- [x] Pass `ignore` patterns through `PipelineOptions` → `judgeDiff`
- [x] Handle edge case: all files ignored → return passing result
- [x] Improve judge-diff prompt with structural change guidance
- [x] Add tests for diff filtering (ignore match, no match, all ignored)
- [x] Add tests for YAML parser with ignore patterns
- [x] Create `.specguard.yml` for this project with commented ignore patterns
- [x] Build and test all packages
