# Specguard Phase 1 Design

## Overview

specguard checks that code changes in a PR have associated specs. It runs as a CLI (`specguard check main..HEAD`) and as a GitHub Action. It uses corespec — the shared foundation library that also powers respec.

## Architecture

```
                        specguard / respec
                     ┌──────────────────────┐
                     │   CLI / Action / Bot  │
                     └──────────┬───────────┘
                                │
                     ┌──────────▼───────────┐
                     │       corespec        │
                     │                       │
                     │  ┌─────────────────┐  │
                     │  │ check-framework │  │  heuristic scan
                     │  │   (no LLM)      │  │  for spec frameworks
                     │  └────────┬────────┘  │
                     │           │           │
                     │  ┌────────▼────────┐  │
                     │  │ judge-framework │  │  LLM confirms/scores
                     │  │   (LLM)        │  │  framework detection
                     │  └────────┬────────┘  │
                     │           │           │
                     │  ┌────────▼────────┐  │
                     │  │   judge-diff    │  │  LLM scores spec
                     │  │   (LLM)        │  │  coverage per file
                     │  └────────┬────────┘  │
                     │           │           │
                     │  ┌────────▼────────┐  │
                     │  │   LLM provider  │  │  Vercel AI SDK
                     │  │   (ai + @ai-sdk)│  │  multi-provider
                     │  └─────────────────┘  │
                     └───────────────────────┘
```

## corespec — 3 tools

### check-framework (heuristic, no LLM)

Scans a repo file tree for spec framework signals. Returns structured evidence.

**Signals detected:**
- Directory patterns: `openspec/`, `.claude/skills/`, `specs/`, `docs/specs/`
- Config files: `openspec.config.*`, `.specguard.yml`, `kiro.config.*`
- File naming: `*.spec.md`, `*.requirements.md`, `*.feature`
- Known structures: OpenSpec scenario format, Superpowers skill files, Kiro specs, Spec Kit patterns
- Generic patterns: `docs/` with markdown specs, `specs/` directory

**Input:** repo root path
**Output:** `FrameworkCheckResult` — list of signals found, candidate frameworks, file paths

### judge-framework (LLM)

Takes check-framework output. Asks the LLM to interpret the evidence and determine which spec framework/protocol is in use.

**Input:** `FrameworkCheckResult` from check-framework
**Output:** `FrameworkJudgment` — framework name (or "none"), confidence 0-1, reasoning

### judge-diff (LLM)

Takes judge-framework output + a git diff. Asks the LLM to score spec coverage for each changed file.

**Input:** `FrameworkJudgment` + git diff (as text, consistent with git diff format)
**Output:** `DiffJudgment` — per-file score 0-1, pass/fail per threshold, gap explanations, overall result

## specguard CLI

```
specguard check [diff-range]

  diff-range    git diff range (default: main..HEAD)
                e.g. main..HEAD, origin/main..feature-branch, HEAD~3..HEAD

Options:
  --model       LLM model (default: from config or SPECGUARD_MODEL env)
  --threshold   confidence threshold for pass/fail (default: 0.7)
  --output      output format: human (default) or json
  --config      config file path (default: .specguard.yml)
```

### Human-readable output (default)

```
$ specguard check main..HEAD

  Framework Detection
  ─────────────────────────────────────
  openspec           0.95   detected
  superpowers        0.10   not found

  Spec Coverage (threshold: 0.7)
  ─────────────────────────────────────
  src/auth/login.ts          0.85  ✓
  src/auth/middleware.ts      0.20  ✗  no spec covers auth middleware

  Result: FAIL
  1 of 2 files below threshold
```

### JSON output (--output json)

```json
{
  "framework": {
    "detected": "openspec",
    "confidence": 0.95,
    "signals": ["openspec/ directory", "openspec.config.ts"]
  },
  "coverage": [
    {
      "file": "src/auth/login.ts",
      "score": 0.85,
      "pass": true
    },
    {
      "file": "src/auth/middleware.ts",
      "score": 0.20,
      "pass": false,
      "gap": "no spec covers auth middleware"
    }
  ],
  "result": "fail",
  "threshold": 0.7
}
```

## Configuration

### .specguard.yml (project-level)

```yaml
model: anthropic/claude-sonnet-4-20250514
threshold: 0.7
```

### Environment variables

```bash
SPECGUARD_MODEL=anthropic/claude-sonnet-4-20250514
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
```

### Precedence

CLI flags > environment variables > config file > defaults

## LLM Provider

Uses the Vercel AI SDK (`ai` + `@ai-sdk/anthropic`, `@ai-sdk/openai`, etc.):

```typescript
import { generateText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';

const { text } = await generateText({
  model: anthropic('claude-sonnet-4-20250514'),
  prompt: buildPrompt(frameworkResult, diff),
});
```

Provider is inferred from the model string. API key from matching env var.

## GitHub Action

```yaml
- uses: gaspodewonder/corespec/packages/specguard@v1
  with:
    threshold: '0.7'
  env:
    ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
```

The action:
1. Checks out the repo
2. Gets the PR diff via `GITHUB_EVENT_PATH`
3. Runs the same pipeline as CLI (check-framework → judge-framework → judge-diff)
4. Posts result as a PR check (pass/fail) with coverage details in the check summary

## Package Structure

```
packages/
  corespec/                     # @gaspodewonder/corespec
    src/
      tools/
        check-framework.ts      # heuristic framework detection
        judge-framework.ts      # LLM framework judgment
        judge-diff.ts           # LLM diff coverage scoring
      llm/
        provider.ts             # Vercel AI SDK wrapper
      types.ts                  # shared types
      index.ts                  # public API
  specguard/                    # @gaspodewonder/specguard
    src/
      cli/
        index.ts                # commander CLI
        commands/
          check.ts              # specguard check command
      core/
        pipeline.ts             # orchestrates the 3 tools
        config.ts               # config file + env loading
        formatter.ts            # human/json output formatting
      action/
        index.ts                # GitHub Action entry point
      index.ts
  respec/                       # @gaspodewonder/respec (future)
    ...                         # will also use corespec tools
```

## Decisions

- Vercel AI SDK for multi-provider LLM support
- Git diff range as input (consistent with git CLI conventions)
- 0-1 confidence scores with configurable threshold
- Heuristic-first design — LLM only judges pre-gathered evidence
- corespec tools are independently testable and reusable by respec
