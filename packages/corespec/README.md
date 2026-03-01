# corespec

Shared spec tooling foundation for [jspec](https://github.com/gaspodewonder/jspec).

## Tools

- **check-framework** — heuristic scan for spec frameworks (no LLM)
- **judge-framework** — LLM confirms/scores framework detection
- **judge-diff** — LLM scores spec coverage per changed file

## Architecture

```
repo ──► check-framework ──► judge-framework ──► judge-diff ──► result
              (heuristic)        (LLM)              (LLM)
```

Used by [@gaspodewonder/specguard](../specguard/) and [@gaspodewonder/respec](../respec/).
