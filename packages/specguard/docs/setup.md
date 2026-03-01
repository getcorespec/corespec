# Setup

## LLM Credentials

specguard uses an LLM to evaluate spec coverage. You need an API key for your chosen provider.

### GitHub Actions

Add your API key as a repository secret:

1. Go to **Settings > Secrets and variables > Actions**
2. Click **New repository secret**
3. Add `ANTHROPIC_API_KEY` (or `OPENAI_API_KEY` if using OpenAI models)

Then pass it to the action:

```yaml
- uses: gaspodewonder/corespec/packages/specguard@main
  with:
    anthropic-api-key: ${{ secrets.ANTHROPIC_API_KEY }}
```

### Local (CLI)

Set the environment variable directly or use a `.env` file:

```bash
export ANTHROPIC_API_KEY=sk-ant-...
```

Or create a `.env` file in your project root:

```
ANTHROPIC_API_KEY=sk-ant-...
```

## Configuration

Create a `.specguard.yml` in your project root (optional):

```yaml
model: anthropic/claude-sonnet-4-20250514
threshold: 0.7
```

| Key | Default | Description |
|-----|---------|-------------|
| `model` | `anthropic/claude-sonnet-4-20250514` | LLM model for spec evaluation |
| `threshold` | `0.7` | Minimum coverage score (0-1) to pass |
