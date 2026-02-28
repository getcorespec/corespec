<p align="center">
  <h2 align="center"><code>jspec</code></h2>
  <h3 align="center">Spec-driven development tools for existing codebases.</h3>
  <p align="center">
    <a href="https://github.com/gaspodewonder/jspec/actions/workflows/cicd.yaml"><img src="https://github.com/gaspodewonder/jspec/actions/workflows/cicd.yaml/badge.svg" alt="cicd"></a>
  </p>
</p>

## Packages

### [corespec](./packages/corespec/)

Shared foundation library. Spec framework detection, LLM integration, GitHub API helpers, and common utilities that respec and specguard build on.

### [respec](./packages/respec/)

Retroactive spec generation. Analyzes existing code and PRs to generate structured specifications. Built on corespec.

### [specguard](./packages/specguard/)

PR gating for specs. Checks that code changes have an associated specification before merge. Built on corespec.
