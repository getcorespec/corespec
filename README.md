<p align="center">
  <h2 align="center"><code>corespec</code></h2>
  <h3 align="center">Spec-driven development tools for existing codebases.</h3>
  <p align="center">
    <a href="https://github.com/getcorespec/corespec/actions/workflows/cicd.yaml"><img src="https://github.com/getcorespec/corespec/actions/workflows/cicd.yaml/badge.svg" alt="cicd"></a>
    <a href="https://www.npmjs.com/package/@getcorespec/specguard"><img src="https://img.shields.io/npm/v/@getcorespec/specguard" alt="npm specguard"></a>
  </p>
</p>

## Packages

### [corespec](./packages/corespec/)

Shared foundation library. Spec framework detection, LLM integration, GitHub API helpers, and common utilities that respec and specguard build on.

### [specguard](./packages/specguard/)

PR gating for specs. Checks that code changes have an associated specification before merge. Built on corespec.

<p>
  <img src="./packages/specguard/docs/screenshots/specguard-check-fail.png" width="420" alt="specguard CLI output">
  <img src="./packages/specguard/docs/screenshots/failed-pr.png" width="420" alt="specguard gating a PR">
</p>

### [respec](./packages/respec/)

Retroactive spec generation. Analyzes existing code and PRs to generate structured specifications. Built on corespec.

<p>
  <img src="./packages/respec/docs/screenshots/respec-generate.png" width="420" alt="respec CLI output">
  <img src="./packages/respec/docs/screenshots/respec-pr.png" width="420" alt="respec generate PR">
</p>

### [bot](./packages/bot/)

GitHub App that runs specguard on your pull requests automatically. Install it and every PR gets a spec coverage report.

<p>
  <img src="./packages/bot/docs/screenshots/bot-pr-comment.png" width="420" alt="bot PR comment with spec report">
  <img src="./packages/bot/docs/screenshots/bot-check-run.png" width="420" alt="bot check run in PR">
</p>

> **Get started instantly:** [Install the corespec GitHub App](https://github.com/apps/getcorespec) — no config needed.
