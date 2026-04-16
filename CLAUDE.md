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

### Inventory — which file shows what

| File | Shows | Refresh when |
|------|-------|--------------|
| `packages/specguard/docs/screenshots/specguard-check-fail.png` | `specguard check main..HEAD` output, failing case, with per-file `Reason` lines under each failing row | CLI output format changes (columns, colours, reason text) |
| `packages/specguard/docs/screenshots/failed-pr.png` | GitHub PR screenshot showing the specguard check failing + its PR comment | PR comment format changes (framework hyperlink, Reason column) |
| `packages/bot/docs/screenshots/bot-pr-comment.png` | PR comment with the coverage table: framework name rendered as a markdown hyperlink, `File / Score / Status / Reason` columns, reasons populated for passing rows too | `formatPrComment` output changes |
| `packages/bot/docs/screenshots/bot-check-run.png` | GitHub check-run "Details" view produced by `formatCheckRunOutput` | Check-run text changes |
| `packages/respec/docs/screenshots/respec-generate.png` | `respec generate` CLI output | respec CLI changes |
| `packages/respec/docs/screenshots/respec-pr.png` | PR produced by respec | respec PR behaviour changes |

Target width in README is 420px. Always verify the new PNG renders cleanly at that width before committing.

### Capture setup

Use `make install` (or `pnpm -r build && npm link`) first so the global `specguard` / `respec` bins are current — this makes the prompt read like an end-user flow, and the CLI sets its terminal title (`specguard check`, etc.) automatically on TTY.

Minimal prompt with no path or git info:

```bash
export PS1='$ '
```

Use `toolkit:shellwright` to capture the session:

1. `shell_start` to open a recording shell in the iTerm window where you'll demo.
2. `shell_record_start` with a meaningful name (e.g. `specguard-check-fail`).
3. Run the command you want to capture.
4. `shell_record_stop` — this writes the PNG.
5. Move the file into the matching `packages/*/docs/screenshots/` folder, overwriting the old PNG with the same filename so READMEs don't need relinking.

### Reproducing a failing `specguard check` without a real API call

If your Anthropic key is expired, or you want deterministic output, either (a) point `baseURL` at a local mock server that returns a canned judge-diff JSON payload, or (b) alias `specguard` to a tsx script that bypasses the LLM:

```bash
alias specguard='npx tsx scratch/demo-specguard.ts'
```

The same pattern applies to `respec`:

```bash
alias respec='npx tsx scratch/demo-respec.ts'
```

Keep the demo scripts in `scratch/` (gitignored) so they don't ship.

## CLI progress patterns

For any CLI command that makes LLM calls or processes multiple items:
- Print a brief status line before long-running work starts (e.g. `Analyzing codebase...`)
- Show item count after discovery (e.g. `Found 12 source files`)
- Print per-item progress as `[n/total] item-name` using `chalk.dim()`
- Keep progress to stderr-style dim text — don't pollute structured output (JSON mode)
