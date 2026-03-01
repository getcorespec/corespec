<p align="center">
  <h2 align="center"><code>specguard</code></h2>
  <h3 align="center">PR gating for spec coverage.</h3>
  <p align="center">
    <a href="#quickstart">Quickstart</a> |
    <a href="#documentation">Documentation</a>
  </p>
  <p align="center">
    <a href="https://github.com/gaspodewonder/corespec/actions/workflows/cicd.yaml"><img src="https://github.com/gaspodewonder/corespec/actions/workflows/cicd.yaml/badge.svg" alt="cicd"></a>
    <a href="https://www.npmjs.com/package/@gaspodewonder/specguard"><img src="https://img.shields.io/npm/v/%40gaspodewonder/specguard" alt="npm version"></a>
  </p>
</p>

## Quickstart

Install specguard:

```bash
npm install -g @gaspodewonder/specguard
```

Check spec coverage on a PR:

```bash
specguard check
```

![specguard check output](./docs/screenshots/specguard-check-fail.png)

## GitHub Action

Add specguard to your CI pipeline:

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
      - uses: gaspodewonder/corespec/packages/specguard@main
        with:
          anthropic-api-key: ${{ secrets.ANTHROPIC_API_KEY }}
```

See [setup docs](./docs/setup.md) for configuring API keys and options.

## Documentation

- [Setup](./docs/setup.md) — credentials and configuration

