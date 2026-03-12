<p align="center">
  <h2 align="center"><code>specguard</code></h2>
  <h3 align="center">PR gating for spec coverage.</h3>
  <p align="center">
    <a href="#quickstart">Quickstart</a> |
    <a href="#pre-commit-hook">Pre-commit hook</a> |
    <a href="#github-action">GitHub Action</a> |
    <a href="#local-llms">Local LLMs</a>
  </p>
  <p align="center">
    <a href="https://github.com/getcorespec/corespec/actions/workflows/cicd.yaml"><img src="https://github.com/getcorespec/corespec/actions/workflows/cicd.yaml/badge.svg" alt="cicd"></a>
    <a href="https://www.npmjs.com/package/@getcorespec/specguard"><img src="https://img.shields.io/npm/v/%40getcorespec/specguard" alt="npm version"></a>
  </p>
</p>

## Quickstart

Install specguard:

```bash
npm install -g @getcorespec/specguard
```

Check spec coverage on a PR:

```bash
specguard check
```

![specguard check output](./docs/screenshots/specguard-check-fail.png)

## Setup

specguard uses the [Vercel AI SDK](https://sdk.vercel.ai/) — any supported provider works. Set the API key for your chosen provider:

```bash
# Anthropic (default)
export ANTHROPIC_API_KEY=sk-ant-...

# OpenAI
export OPENAI_API_KEY=sk-...
```

Override the default model (`claude-haiku-4-5`) via CLI flag or config file:

```bash
specguard check --model anthropic/claude-sonnet-4-20250514
```

Or create a `.specguard.yml`:

```yaml
model: anthropic/claude-sonnet-4-20250514
threshold: 0.7
```

## Pre-commit hook

Run specguard automatically before every commit to catch unspec'd changes early.

**Install the hook** (one-time setup per repo):

```bash
specguard hook install
```

This writes a `.git/hooks/pre-commit` script that runs `specguard check --staged` against your staged changes. If spec coverage is below the threshold, the commit is blocked.

To overwrite an existing pre-commit hook:

```bash
specguard hook install --force
```

To remove the hook, delete `.git/hooks/pre-commit`.

> **Note:** The pre-commit hook uses `npx specguard`, so you don't need specguard installed globally — it will be fetched from npm if needed. For faster local commits, install specguard globally: `npm install -g @getcorespec/specguard`.

## GitHub Action

Add specguard to your CI pipeline. Set your LLM provider's API key as a [repository secret](https://docs.github.com/en/actions/security-for-github-actions/security-guides/using-secrets-in-github-actions):

```yaml
# .github/workflows/specguard.yml
name: specguard
on: [pull_request]

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - uses: getcorespec/corespec/packages/specguard@main
        with:
          anthropic-api-key: ${{ secrets.ANTHROPIC_API_KEY }}
```

See it in action: [demo PR with specguard failing unspec'd code](https://github.com/getcorespec/corespec/pull/3)

![specguard failing a PR](./docs/screenshots/failed-pr.png)

## Local LLMs

You can use any OpenAI-compatible local endpoint (e.g. [Ollama](https://ollama.com/), [LM Studio](https://lmstudio.ai/)) or a self-hosted Anthropic endpoint by setting `baseURL` in your config file:

```yaml
# .specguard.yml
model: openai/llama3.2
baseURL: http://localhost:11434/v1
```

For Ollama, start the server and pull a model first:

```bash
ollama serve
ollama pull llama3.2
```

> **Note:** `baseURL` is intentionally config-file-only (not a CLI flag) to keep model configuration consolidated. All model settings (`model`, `baseURL`, and future options like temperature) live in `.specguard.yml`.
