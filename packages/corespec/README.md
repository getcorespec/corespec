# corespec

Shared spec tooling foundation for [corespec](https://github.com/getcorespec/corespec).

## Tools

- **check-framework** — heuristic scan for spec frameworks (no LLM)
- **judge-framework** — LLM confirms/scores framework detection
- **judge-diff** — LLM scores spec coverage per changed file

## Architecture

```
repo ──► check-framework ──► judge-framework ──► judge-diff ──► result
              (heuristic)        (LLM)              (LLM)
```

Used by [@getcorespec/specguard](../specguard/) and [@getcorespec/respec](../respec/).
