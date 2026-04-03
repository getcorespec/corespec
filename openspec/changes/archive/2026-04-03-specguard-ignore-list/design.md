## Context

Specguard sends the full git diff to the LLM for evaluation. Files like lockfiles, markdown, and config get scored, producing false positives and wasting tokens. The YAML config parser is hand-rolled (line-by-line regex), doesn't support arrays, and will need extending.

## Goals / Non-Goals

**Goals:**
- Filter ignored files from the diff before the LLM call
- Parse `ignore` patterns from `.specguard.yml`
- Improve the judge-diff prompt to handle structural code changes
- Ship a `.specguard.yml` for this project with commented ignore patterns

**Non-Goals:**
- Built-in default ignore patterns (users define their own)
- `specguard init` command (future work)
- Complex YAML parsing library

## Decisions

### 1. Filtering happens in `judgeDiff`, not in the CLI

The diff filtering belongs in `judge-diff.ts` (corespec) since that's where the diff meets the LLM. The pipeline passes ignore patterns through as a new option. This keeps the filtering co-located with the prompt.

Alternative: filter in the CLI command before calling the pipeline. Rejected because other consumers of `judgeDiff` (e.g. the GitHub Action bot) would also benefit from filtering.

### 2. Diff filtering by parsing `diff --git` headers

A unified diff has `diff --git a/<path> b/<path>` markers between file hunks. Split on these markers, check each file path against ignore patterns, reassemble only the non-ignored hunks.

Alternative: run `git diff -- ':(exclude)pattern'` with pathspec. Rejected because it couples filtering to git CLI invocation and won't work when the diff is provided as a string.

### 3. Use `picomatch` for glob matching

It's zero-dependency, fast, and already the glob engine under `micromatch`/`glob`. Handles standard glob patterns (`*.md`, `**/*.json`).

Alternative: hand-roll simple extension matching. Rejected because users will expect glob semantics like `packages/*/config.*`.

### 4. Extend the YAML parser to support list items

Add support for `- value` lines under a key. When a line matches `^(\w+):$` (key with no value), collect subsequent `^\s+-\s+(.+)$` lines as array items. Minimal change to the existing parser.

Alternative: add a YAML library. Rejected — overkill for the config complexity we have.

### 5. Prompt improvement is additive

Add a paragraph to the existing judge-diff prompt instructing the LLM to score structural/wiring changes (re-exports, import path changes, barrel file updates) as 1.0. This doesn't change the response format.

## Risks / Trade-offs

- **Diff parsing is fragile** → Use the well-defined `diff --git` marker as the split point. Add tests for edge cases (renamed files, binary files).
- **Glob matching adds a dependency** → `picomatch` is tiny (single file, no deps) and widely used.
- **Prompt changes are non-deterministic** → The guidance is a nudge, not a guarantee. The ignore list handles the deterministic cases; the prompt handles the fuzzy ones.
