<p align="center">
  <h2 align="center"><code>@getcorespec/bot</code></h2>
  <h3 align="center">GitHub App that runs corespec tools on pull requests.</h3>
  <p align="center">
    <a href="#quickstart">Quickstart</a> |
    <a href="#setup">Setup</a>
  </p>
</p>

## Quickstart

Copy the sample env file, fill in your values, and start the server:

```bash
cp .env.sample .env
# edit .env with your App ID, private key, and webhook secret
pnpm dev
```

## Setup

Create a [GitHub App](https://docs.github.com/en/apps/creating-github-apps) named **corespec** with homepage `https://github.com/getcorespec/corespec` and the following permissions:

- **Checks**: Read & Write
- **Pull requests**: Read & Write
- **Contents**: Read

Subscribe to the **Pull request** webhook event. Under "Where can this GitHub App be installed?", select **Any account**.

After creating the app, generate a private key from the app's settings page (**Private keys > Generate a private key**). Configure your webhook URL to point at `/api/github/webhooks` when deployed.

### Environment variables

| Variable | Required | Description |
| --- | --- | --- |
| `APP_ID` | yes | GitHub App ID |
| `APP_PRIVATE_KEY` | yes | PEM private key |
| `WEBHOOK_SECRET` | yes | Webhook secret |
| `PORT` | no | Server port (default: 2772) |

## Endpoints

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/health` | Health check — returns `{ "status": "ok" }` |
| `POST` | `/api/github/webhooks` | GitHub webhook receiver |

## How it works

1. GitHub sends a `pull_request` webhook (opened, synchronize, reopened)
2. Bot creates a check run on the PR's head commit
3. Repo is shallow-cloned using an installation access token
4. Enabled tools run against the PR diff (currently: specguard)
5. Check run and PR comment are updated with the result

## Testing locally

Use [smee.io](https://smee.io) to forward GitHub webhooks to your local machine. Create a channel at https://smee.io, paste the URL as the **Webhook URL** in your GitHub App settings, then run:

```bash
# terminal 1 — proxy webhooks to localhost
npx smee -u https://smee.io/YOUR-CHANNEL -t http://localhost:2772/api/github/webhooks

# terminal 2 — start the bot
pnpm dev
```

Install the app on a test repo and open a PR to verify.

## Development

```bash
pnpm dev        # start with hot reload (tsx watch)
pnpm build      # compile TypeScript
pnpm test       # run tests
```
