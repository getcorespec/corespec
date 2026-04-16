# diff-filtering Specification

## Purpose
Controls what specguard's judge-diff tool sends to the LLM and how the LLM returns its verdict. Covers (1) filtering files out of the diff via the `ignore` config, (2) loading existing spec documents from the repo so the LLM can cross-reference them, and (3) the per-file `reason` field describing why each file passed or failed.

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

### Requirement: Prompt exempts test files from requiring separate specs
The judge-diff prompt SHALL instruct the LLM to score test files (matching `*.test.*` or `*.spec.*` patterns) as passing with reason "test file, self-documenting", because test files document their own behavior.

#### Scenario: Test file in diff
- **WHEN** a diff modifies `src/foo.test.ts`
- **THEN** the LLM SHALL score it 1.0 with a reason noting it is a test file

### Requirement: Existing spec documents are supplied to the LLM as context
When judging a diff, the pipeline SHALL load the framework's spec documents from disk and pass them to `judgeDiff` via the `specs` parameter. The `judgeDiff` function SHALL include these documents in the LLM prompt under an "Existing spec documents" section so the LLM can assess whether changed code is covered.

#### Scenario: OpenSpec framework with spec files on disk
- **WHEN** the detected framework is `openspec`
- **AND** `openspec/specs/**/*.md` files exist in the repo
- **THEN** the pipeline SHALL load each spec file's contents and path
- **AND** pass them to `judgeDiff` as `SpecDocument[]`

#### Scenario: Spec documents appear in the LLM prompt
- **WHEN** `judgeDiff` is called with a non-empty `specs` array
- **THEN** the built prompt SHALL contain each spec's path and full content
- **AND** instruct the LLM to cross-reference the diff against those specs

#### Scenario: Unknown framework
- **WHEN** the detected framework is not a recognised one with a known spec directory
- **THEN** `loadSpecs` SHALL return an empty array
- **AND** the prompt SHALL omit the "Existing spec documents" section

### Requirement: Non-JSON LLM responses produce actionable error messages
When the LLM returns a response that is not parseable JSON, `judgeDiff` SHALL throw `LlmJsonParseError` carrying the raw response, the model name, and the underlying parse error. The error message SHALL include (1) the model name, (2) a short preview of the raw response, and (3) remediation guidance (e.g. try a more capable model, reduce prompt size). Bare `JSON.parse` errors SHALL NOT surface to CLI users.

#### Scenario: LLM returns markdown prose instead of JSON
- **WHEN** the LLM responds with `# Analysis\n\nThe diff looks good`
- **THEN** `judgeDiff` SHALL throw `LlmJsonParseError`
- **AND** the error message SHALL include the model name, a preview of the response, and guidance to try a more capable model or reduce prompt size

#### Scenario: CLI surfaces the error cleanly
- **WHEN** `specguard check` catches an `LlmJsonParseError`
- **THEN** the CLI SHALL print `Error: <message>` with the actionable context
- **AND** SHALL NOT print the raw `SyntaxError: Unexpected token` stack

### Requirement: Per-file reason field explains both passes and fails
Every `FileCoverage` entry returned by `judgeDiff` SHALL have a `reason` field containing a one-line explanation of the score. For passing files it describes the covering spec or exemption; for failing files it describes the gap.

#### Scenario: Passing file with covering spec
- **WHEN** the LLM scores `src/foo.ts` at 0.9 because it's covered by `openspec/specs/foo/spec.md`
- **THEN** the returned `FileCoverage.reason` SHALL be a one-line explanation referencing the spec (e.g. "covered by foo spec")

#### Scenario: Failing file
- **WHEN** the LLM scores `src/bar.ts` at 0.3 with no matching spec
- **THEN** the returned `FileCoverage.reason` SHALL describe what spec coverage is missing

#### Scenario: Backward compatibility with legacy `gap` field
- **WHEN** an older LLM response provides `gap` instead of `reason`
- **THEN** `judgeDiff` SHALL populate `reason` from the `gap` value

