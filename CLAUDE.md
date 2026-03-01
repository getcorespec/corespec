# CLAUDE.md

## Project

Monorepo: `getcorespec/corespec` — spec-driven dev tools. npm scope: `@getcorespec`.

## Packages

- `packages/corespec` — shared foundation (framework detection, LLM via Vercel AI SDK, types)
- `packages/specguard` — PR gating CLI + GitHub Action
- `packages/respec` — retroactive spec generation (stub)

## Stack

TypeScript, ESM, Node >= 20, pnpm workspaces, Vercel AI SDK (`ai`, `@ai-sdk/anthropic`, `@ai-sdk/openai`), commander, chalk, vitest.

## Commands

```
pnpm install && pnpm -r build    # install + build all
pnpm -r test                     # run all tests
make install                     # build + install CLIs globally
```

## Key patterns

- Config precedence: CLI flags > env vars > .specguard.yml > defaults
- LLM provider from model string: `anthropic/model-name` or `openai/model-name`
- Pipeline: check-framework (heuristic) → judge-framework (LLM) → judge-diff (LLM)
- Exit 0 = pass, exit 1 = fail
