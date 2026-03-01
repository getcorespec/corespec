# corespec - Research

## What is corespec?

corespec is **spec validation + retroactive functional spec generation** for existing codebases. Packages: `@getcorespec/respec` and `@getcorespec/specguard`.

Existing SDD tools are **spec-first** (write specs, then code). corespec is **code-first** (analyze existing code/PRs, generate or verify specs retroactively).

## SDD Landscape

| Tool | What it does | Retroactive? | PR gating? |
|------|-------------|-------------|------------|
| **OpenSpec** (Fission-AI) | In-repo specs as markdown, GIVEN/WHEN/THEN scenarios, spec deltas | No (community proposal exists, not shipped) | No |
| **Kiro** (AWS) | Claude-powered IDE, requirements -> architecture -> code | No | No |
| **GitHub Spec Kit** | CLI toolkit for spec-first workflow | No (open issues #264, #438, #1436 requesting it) | No |
| **Tessl** | Spec registry + framework, `@describe` for existing code | Partial | No |
| **Semcheck** | LLM-based spec-code compliance in CI | No (requires manual spec-code linking) | Yes (format only) |
| **retrospec** (igolaizola) | Reverse-engineers spec prompts per-commit via Copilot SDK | Yes (per-commit) | No |
| **SpecFact.dev** | Extracts code structure, enriches with AI | Yes | Unclear |
| **Specmatic** | API contract testing from OpenAPI specs | No | Yes (API specs only) |
| **Danger.js** | PR automation framework (80+ plugins) | No | Framework only, zero spec plugins |

## The Gap

Three things **nobody ships**:

1. **PR gate for spec coverage** — no tool checks "does this code change have a spec"
2. **Spec coverage metric** — like test coverage, but for specs. Doesn't exist.
3. **Retroactive generation + PR gating combined** — no tool does both

Martin Fowler notes all SDD tools are "mostly spec-first and vague about spec maintenance." OpenSpec explicitly says retroactive generation is something they're exploring but haven't shipped. Spec Kit has multiple open issues requesting brownfield support.

## Name Availability

**"respec"** — taken by W3C ReSpec (HTML preprocessor for standards docs) and go-respec (small Go OpenAPI CLI). Both unrelated domains. `@getcorespec/respec` is available.

**"specguard"** — no dev tooling use exists. Two academic uses: robotic vehicle security (UBC/CCS 2024) and computer vision (ICCV 2025). Name is fully available for dev tools. Works as a companion tool for PR gating.

**"corespec"** — monorepo name grouping both tools under `getcorespec/corespec`.

## Sources

- https://openspec.dev / https://github.com/Fission-AI/OpenSpec
- https://kiro.dev
- https://github.com/github/spec-kit
- https://martinfowler.com/exploring-gen-ai/sdd-3-tools.html
- https://github.com/igolaizola/retrospec
- https://github.com/rejot-dev/semcheck
- https://specfact.dev
- https://specmatic.io
- https://github.com/danger/danger-js
- https://github.com/DependableSystemsLab/specguard (unrelated - robotics)
- https://github.com/speced/respec (unrelated - W3C)
