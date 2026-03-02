<p align="center">
  <h2 align="center"><code>specguard</code></h2>
  <h3 align="center">PR gating for spec coverage.</h3>
  <p align="center">
    <a href="#quickstart">Quickstart</a> |
    <a href="#github-action">GitHub Action</a>
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

Optionally create a `.specguard.yml`:

```yaml
# LLM model — any Vercel AI SDK provider/model works
model: anthropic/claude-sonnet-4-20250514
# minimum coverage score (0-1) for a file to pass
threshold: 0.7
```

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
