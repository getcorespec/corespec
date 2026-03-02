<p align="center">
  <h2 align="center"><code>respec</code></h2>
  <h3 align="center">Retroactive spec generation and verification for existing codebases.</h3>
  <p align="center">
    <a href="#quickstart">Quickstart</a> |
    <a href="#setup">Setup</a>
  </p>
  <p align="center">
    <a href="https://github.com/getcorespec/corespec/actions/workflows/cicd.yaml"><img src="https://github.com/getcorespec/corespec/actions/workflows/cicd.yaml/badge.svg" alt="cicd"></a>
    <a href="https://www.npmjs.com/package/@getcorespec/respec"><img src="https://img.shields.io/npm/v/%40getcorespec/respec" alt="npm version"></a>
  </p>
</p>

## Quickstart

Install respec:

```bash
npm install -g @getcorespec/respec
```

Generate specs from an existing codebase:

```bash
respec generate
```

![respec generate output](./docs/screenshots/respec-generate.png)

## Setup

respec uses the [Vercel AI SDK](https://sdk.vercel.ai/) — any supported provider works. Set the API key for your chosen provider:

```bash
# Anthropic (default)
export ANTHROPIC_API_KEY=sk-ant-...

# OpenAI
export OPENAI_API_KEY=sk-...
```

Override the default model (`claude-haiku-4-5`) via CLI flag or config file:

```bash
respec generate --model anthropic/claude-sonnet-4-20250514
```

Or create a `.respec.yml`:

```yaml
model: anthropic/claude-sonnet-4-20250514
outputDir: specs
```
