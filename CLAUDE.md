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

## Before committing or creating a PR

Always run the full CI check locally before committing:

```
pnpm install && pnpm -r build && pnpm -r test
```

CI runs `pnpm install --frozen-lockfile`, so if you change dependencies you **must** commit the updated `pnpm-lock.yaml` or the build will fail.

## Key patterns

- Config precedence: CLI flags > .yml > defaults
- LLM provider from model string: `anthropic/model-name` or `openai/model-name`
- Pipeline: check-framework (heuristic) → judge-framework (LLM) → judge-diff (LLM)
- Exit 0 = pass, exit 1 = fail

## Model config vs operation config

**Model config** (in `.specguard.yml` only, never CLI flags): `model`, `baseURL`, and future LLM params like temperature and top-k. These options can grow complex and belong consolidated in the config file (KISS).

**Operation config** (CLI flags allowed): `threshold`, `--staged`, `--output`, `--config`. These are per-run options that users legitimately want to vary per invocation.

This separation prevents CLI option explosion as model parameters grow.

## baseURL for custom/local LLM endpoints

`baseURL` in `ModelConfig` works for both Anthropic (`createAnthropic({ baseURL })`) and OpenAI-compatible providers (`createOpenAI({ baseURL })`). Use cases: self-hosted Anthropic endpoints, Ollama, LM Studio. Always config-file-only — not exposed as a CLI flag.

## Pre-commit hook pattern

`specguard hook install` writes `.git/hooks/pre-commit` using `npx specguard check --staged`. The `hook` command uses commander's subcommand pattern: `hookCommand.addCommand(installHookCommand)`. Subsequent subcommands (e.g. `hook uninstall`) follow the same pattern.

## Running CLIs during development

Each CLI package (`specguard`, `respec`) has a `start` script that builds then runs:

```bash
cd packages/specguard
pnpm start check main..HEAD       # one-shot build + run
pnpm start check --staged
pnpm start hook install
```

**pnpm quirk**: don't put `--` between `start` and the CLI args — pnpm passes `--` through as a literal token. `pnpm start check ...` works; `pnpm start -- check ...` does not.

The script is split as `prestart: tsc` + `start: node ./bin/<name>.js` so args reach the binary cleanly.

### Terminal title

On TTY output, the CLI sets the terminal title to the invoked subcommand (e.g. `specguard check`) via the xterm escape sequence `\x1b]2;…\x07`. This makes terminal screenshots self-labelling. It's a no-op for non-TTY output (CI, pipes) so captured logs stay clean.

## Terminal screenshots

For README screenshots using shellwright, use a minimal prompt (`$ `) with no path/git info:

```bash
# Start session with minimal prompt
export PS1='$ '
```

Run the CLI as `specguard check …` (global bin via `make install`) rather than `pnpm start …` so the title bar and prompt both read as the end-user flow.

If the command needs to be faked (e.g. LLM calls unavailable), alias the command name:

```bash
alias respec='npx tsx scratch/demo-respec.ts'
```

## CLI progress patterns

For any CLI command that makes LLM calls or processes multiple items:
- Print a brief status line before long-running work starts (e.g. `Analyzing codebase...`)
- Show item count after discovery (e.g. `Found 12 source files`)
- Print per-item progress as `[n/total] item-name` using `chalk.dim()`
- Keep progress to stderr-style dim text — don't pollute structured output (JSON mode)
