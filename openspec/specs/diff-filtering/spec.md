# diff-filtering Specification

## Purpose
TBD - created by archiving change specguard-ignore-list. Update Purpose after archive.
## Requirements
### Requirement: Config supports ignore patterns
The `.specguard.yml` config file SHALL support an `ignore` key containing a list of glob patterns. Each pattern matches file paths in the diff.

#### Scenario: Config with ignore patterns
- **WHEN** `.specguard.yml` contains an `ignore` key with glob patterns
- **THEN** `loadConfig` SHALL return the patterns in an `ignore` string array

#### Scenario: Config without ignore key
- **WHEN** `.specguard.yml` has no `ignore` key
- **THEN** `loadConfig` SHALL return an empty `ignore` array

### Requirement: Ignored files are excluded from LLM evaluation
Files matching any ignore pattern SHALL be removed from the diff before the LLM call. They SHALL NOT appear in the `DiffJudgment` results.

#### Scenario: File matches an ignore pattern
- **WHEN** a diff contains changes to `pnpm-lock.yaml` and ignore includes `*.lock`... wait, that won't match. Let me fix — `*.yaml` or `pnpm-lock.yaml`
- **WHEN** a diff contains changes to `README.md` and ignore includes `*.md`
- **THEN** `README.md` SHALL NOT be sent to the LLM and SHALL NOT appear in the coverage results

#### Scenario: File does not match any ignore pattern
- **WHEN** a diff contains changes to `src/index.ts` and ignore includes `*.md`
- **THEN** `src/index.ts` SHALL be sent to the LLM for evaluation as normal

#### Scenario: All files are ignored
- **WHEN** every file in the diff matches an ignore pattern
- **THEN** `judgeDiff` SHALL return a passing result with an empty files array

### Requirement: Glob patterns use standard semantics
Ignore patterns SHALL support standard glob syntax: `*` (single segment), `**` (recursive), `?` (single char), `{a,b}` (alternation).

#### Scenario: Recursive glob pattern
- **WHEN** ignore includes `packages/*/config.*`
- **THEN** files like `packages/corespec/config.ts` and `packages/specguard/config.json` SHALL be ignored

### Requirement: Prompt guides LLM on structural changes
The judge-diff prompt SHALL instruct the LLM to score structural/wiring changes (re-exports, import path changes, barrel file updates) as passing when they don't alter behavior.

#### Scenario: Re-export added to barrel file
- **WHEN** a diff adds a re-export line to an index.ts barrel file
- **THEN** the LLM is guided to score it as 1.0 (no spec needed)

