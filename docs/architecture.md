# Architecture

Both respec and specguard run as **agents triggered by GitHub events**. Three deployment modes: CLI (local), GitHub Action, or GitHub App (bot).

## Core

```
┌─────────────────────────────────────────────┐
│                 Shared Core                  │
│                                              │
│  Event ──► Agent Runner ──► LLM ──► Output   │
│                                              │
│  - Reads PR diff, repo files, existing specs │
│  - Calls LLM (Claude) with context + prompt  │
│  - Posts results as PR comments / checks     │
└─────────────────────────────────────────────┘
```

The agent runner takes an **event** (PR opened, comment, manual trigger), gathers **context** (diff, file tree, existing specs), runs an **LLM task**, and writes **output** (PR comment, check status, generated spec files).

## Three Deployment Modes

### CLI (Local)

Run directly from the terminal against local files or a checked-out repo. Useful for development, testing, and one-off spec generation.

```
$ respec generate src/
  ──► reads local files ──► LLM ──► writes spec files to disk

$ specguard check src/
  ──► reads local files ──► checks spec coverage ──► prints report
```

Secrets (API keys) live in environment variables or `.env` files. Output goes to stdout or local files.

### GitHub Action

User adds a workflow file. Secrets (API keys) live in GitHub Actions secrets. Triggered by workflow events.

```yaml
on:
  pull_request:
  issue_comment:
    types: [created]

jobs:
  respec:
    runs-on: ubuntu-latest
    steps:
      - uses: gaspodewonder/corespec/packages/respec@v1
        with:
          command: generate
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
```

Runs in the PR's CI. Has access to the repo checkout, PR diff via `GITHUB_EVENT_PATH`, and posts back via `GITHUB_TOKEN`.

### GitHub App (Bot)

A hosted service that receives webhooks. Secrets (API keys) configured per-installation. Responds to `@respec` mentions and auto-runs on PR events.

```
GitHub ──webhook──► App Server ──► Agent Runner ──► GitHub API
                        │
                    Secrets Store
                 (per-installation)
```

Built with [Probot](https://probot.github.io/) or raw GitHub App. Can be self-hosted or we host it. Reacts to:
- `pull_request.opened` / `pull_request.synchronize` — auto-run
- `issue_comment.created` containing `@respec` — on-demand

## How Secrets Work

| Mode | Where secrets live | Who pays for LLM |
|------|-------------------|-------------------|
| CLI | Local env vars / `.env` | User (their API key) |
| GitHub Action | Repo's Actions secrets | User (their API key) |
| GitHub App | App's per-installation config | User (their API key) or us (hosted tier) |

All modes pass secrets to the agent runner as environment variables. The core never knows which mode triggered it.

## What Each Tool Does

| Event | specguard | respec |
|-------|-----------|--------|
| PR opened | Check: do changed files have specs? Post pass/fail check. | Analyze diff, generate draft specs, post as PR comment. |
| `@specguard` / `@respec` comment | Re-run check on demand. | Generate or regenerate specs for this PR. |
| PR updated (new commits) | Re-run check. | Re-analyze, update spec suggestions. |
| CLI invocation | Check spec coverage for local files. Print report. | Generate specs from local source files. Write to disk. |

## Monorepo Structure

```
corespec/                       # gaspodewonder/corespec
  package.json                  # workspace root
  pnpm-workspace.yaml           # pnpm workspace config
  tsconfig.json                 # shared TypeScript config
  packages/
    respec/                     # @gaspodewonder/respec
      package.json
      src/
        cli/                    # CLI entry point (commander)
        core/                   # spec parsing, diffing, generation
        action/                 # GitHub Action entry point
        bot/                    # GitHub App entry point
        index.ts                # library exports
      bin/
      dist/
    specguard/                  # @gaspodewonder/specguard
      package.json
      src/
        cli/                    # CLI entry point
        core/                   # spec coverage checking
        action/                 # GitHub Action entry point
        bot/                    # GitHub App entry point
      bin/
  docs/                         # shared documentation
```

## Shared Code

Both packages share the same `core/` structure pattern: event parsing, LLM calls, GitHub API interaction. As overlap grows, shared logic can extract into a third internal package (e.g., `packages/shared/`) referenced via pnpm workspace dependencies.

For now, each package owns its own `core/` to keep boundaries clear and avoid premature abstraction.
