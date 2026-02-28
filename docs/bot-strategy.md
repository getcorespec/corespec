# Bot / GitHub App Strategy

Research for jspec (respec + specguard) bot deployment.

## 1. Framework Comparison

### Option A: Probot

Probot is a Node.js framework for building GitHub Apps. It wraps Octokit and handles JWT auth, webhook verification, and event routing.

| Aspect | Details |
|--------|---------|
| Status | Active — v14.2.4 (published Jan 2026). Receives updates. |
| Auth | Handles JWT generation, installation tokens, webhook secret verification automatically |
| DX | `create-probot-app` scaffolder, built-in `smee.io` integration for local dev |
| TypeScript | Written in TypeScript, full type support |
| Hosting | Ships as Express middleware — needs a long-running server or serverless adapter |
| Edge/Workers | Not natively compatible. Depends on Node.js APIs (`crypto`, `http`). Adapters exist but add friction. |
| Bundle size | Heavy — pulls in Express, pino logger, LRU cache, and full Octokit suite |

**Verdict:** Good for getting started fast. Adds weight and opinions we don't need. The framework's value has decreased as its internals got extracted into standalone Octokit modules.

### Option B: @octokit/app + @octokit/webhooks (recommended)

Use the same underlying libraries Probot uses, without the framework layer.

| Aspect | Details |
|--------|---------|
| Packages | `@octokit/app` (auth, installation tokens), `@octokit/webhooks` (event routing, signature verification) |
| Auth | `@octokit/auth-app` handles JWT + installation token lifecycle |
| DX | More setup than Probot, but each piece is well-documented. `createNodeMiddleware()` provides Express-compatible handler. |
| TypeScript | Full types, auto-generated from GitHub's OpenAPI spec |
| Hosting | No server framework baked in — works with any HTTP handler (Node, Express, Hono, Cloudflare Workers) |
| Edge/Workers | `@octokit/webhooks` works in Workers with minor adjustments (PKCS8 key format for WebCrypto). `@octokit/app` has a `createNodeMiddleware` but the core classes are runtime-agnostic. |
| Bundle size | Much lighter — only import what you need |

**Verdict:** Right choice for jspec. We control the HTTP layer. Easy to swap hosting. Aligns with our TypeScript-first, ESM-first project setup.

### Option C: Raw Webhooks (no framework)

Receive POST requests, manually verify HMAC signature, manually generate JWTs, manually manage installation tokens.

| Aspect | Details |
|--------|---------|
| Control | Total |
| Effort | High — reimplements what Octokit already provides |
| Risk | Easy to get signature verification or token refresh wrong |
| Maintenance | Must track GitHub API changes manually |

**Verdict:** No benefit over Option B. Octokit's modules are thin enough that "raw" provides no meaningful advantage.

### Recommendation: Option B — `@octokit/app` + `@octokit/webhooks`

Probot is a framework over these same libraries. We skip the framework, keep the useful parts:

```
@octokit/app          → GitHub App auth (JWT, installation tokens)
@octokit/webhooks     → Webhook event routing + signature verification
@octokit/rest         → GitHub API calls (PRs, comments, checks)
```

## 2. Webhook Events Needed

### respec (spec generation)

| Event | Action | Trigger |
|-------|--------|---------|
| `pull_request.opened` | Auto-analyze diff, generate spec suggestions, post as PR comment | Automatic |
| `pull_request.synchronize` | Re-analyze on new commits, update spec suggestions | Automatic |
| `issue_comment.created` | Parse for `@respec` mention, run on-demand generation | User-triggered |

### specguard (spec gating)

| Event | Action | Trigger |
|-------|--------|---------|
| `pull_request.opened` | Check if changed files have associated specs, post check run (pass/fail) | Automatic |
| `pull_request.synchronize` | Re-run spec coverage check | Automatic |
| `issue_comment.created` | Parse for `@specguard` mention, re-run check on demand | User-triggered |

### GitHub App Permissions Required

| Permission | Access | Why |
|------------|--------|-----|
| Pull requests | Read & Write | Read PR diffs, post PR comments |
| Contents | Read | Read repo files (existing specs, source code for context) |
| Checks | Read & Write | Create check runs for specguard pass/fail status |
| Issues | Read | Read issue comments for `@mention` triggers (issue_comment events cover PR comments too) |
| Metadata | Read | Required for all GitHub Apps |

### Webhook Subscriptions

- `pull_request` (opened, synchronize, reopened)
- `issue_comment` (created)
- `check_run` (rerequested) — allows users to re-run from the Checks tab

## 3. Hosting Options

### Cloudflare Workers

| Aspect | Assessment |
|--------|-----------|
| Cost | Generous free tier (100K requests/day). Paid: $5/mo for 10M requests. |
| Latency | Global edge deployment, ~10-30ms P50 worldwide |
| Cold start | Near-zero (V8 isolates, not containers) |
| Runtime | V8 isolates — no full Node.js. Limited to Web APIs + some Node compat. |
| Secrets | Encrypted environment variables via `wrangler secret` |
| State | KV store for simple key-value. Durable Objects for stateful logic. |
| Gotchas | Private key must be PKCS8 format for WebCrypto. Some npm packages won't work. CPU time limit (10-50ms per invocation on free tier). LLM calls that take seconds need a different pattern (queue + response). |
| Fit for jspec | **Poor for the core bot.** Our webhook handler calls an LLM (seconds of wall time). Workers are designed for fast edge responses, not long-running LLM calls. Would need Workers + Queues + a separate compute backend. Over-engineered for our needs. |

### Vercel Functions

| Aspect | Assessment |
|--------|-----------|
| Cost | Hobby: free (100GB bandwidth). Pro: $20/mo/member. |
| Latency | Single region (free/pro), 10-30ms near region, 50-150ms globally |
| Cold start | 250-500ms typical |
| Runtime | Full Node.js runtime |
| Secrets | Environment variables in dashboard, encrypted at rest |
| Time limit | 10s (Hobby), 60s (Pro), 300s (Enterprise) |
| Fit for jspec | **Possible but tight.** LLM calls could exceed the 10s Hobby limit. Pro's 60s limit would work. But Vercel is frontend-focused — using it for a pure webhook backend feels awkward. No persistent process for future features (websockets, queuing). |

### Railway

| Aspect | Assessment |
|--------|-----------|
| Cost | Hobby: $5/mo + usage credits. Pro: $20/mo. Usage-based (RAM, CPU, bandwidth). |
| Latency | Single region, container-based |
| Cold start | None — always-on containers |
| Runtime | Full Node.js, any language, Docker support |
| Secrets | Environment variables per service, encrypted |
| Time limit | None — long-running process |
| Deploys | Git push to deploy, preview environments |
| Fit for jspec | **Good fit.** Always-on server handles long LLM calls naturally. Simple deployment. Reasonable cost. No runtime restrictions. Easy to add a database later if needed. |

### Self-hosted (Docker / VPS)

| Aspect | Assessment |
|--------|-----------|
| Cost | ~$5-10/mo for a small VPS (Hetzner, DigitalOcean) |
| Control | Total |
| Runtime | Full Node.js, no limits |
| Ops burden | SSL, uptime monitoring, updates, scaling — all manual |
| Fit for jspec | **Fine for personal use, bad for a product.** Too much ops work. Only makes sense if we want to offer self-hosting as a deployment option for users. |

### Recommendation: Railway (primary), with self-hosted Docker as a user option

**Why Railway:**
- Always-on container handles LLM calls (5-30s) without timeout issues
- Git-push deployment, preview environments
- $5/mo baseline, usage-based scaling
- No runtime restrictions (full Node.js)
- Simple to migrate away from — it's just a Docker container

**Why not edge/serverless:**
- Our webhook handler calls an LLM and waits for a response (seconds, not milliseconds)
- Edge functions add complexity (queues, async patterns) for no benefit
- We're not latency-sensitive — a PR comment arriving in 10s vs 10.05s doesn't matter

**Self-hosted Docker** should be documented as an option so users can run their own instance.

## 4. Per-Installation Secret Management

Users need to provide their own Anthropic API key. The GitHub App itself has its own credentials (private key, webhook secret). These are separate concerns.

### GitHub App Credentials (we manage)

```
APP_ID              → GitHub App ID
APP_PRIVATE_KEY     → RSA private key for JWT auth
WEBHOOK_SECRET      → HMAC secret for verifying webhook payloads
```

Stored as environment variables on Railway. Never exposed to users.

### User Credentials (per-installation)

Each installation (org/user that installs our GitHub App) needs to provide an Anthropic API key.

**Approach: Repository variable + encrypted storage**

```
Option A: Repository/org secret via setup command
  - User runs `@respec setup` in a PR comment
  - Bot responds with a link to a settings page
  - Settings page stores the API key, encrypted, in our database
  - Bot retrieves key per-installation when processing webhooks

Option B: Repository variable (simpler, MVP)
  - User adds ANTHROPIC_API_KEY as a repo/org secret
  - In GitHub Action mode: available directly via ${{ secrets.ANTHROPIC_API_KEY }}
  - In GitHub App mode: bot reads from a config file (.respec.yml)
    with a reference to where the key is stored

Option C: Config file with API key reference
  - User creates .respec.yml in repo root:
      anthropic_api_key_env: ANTHROPIC_API_KEY
  - In Action mode: reads from env
  - In App mode: user provides key through our hosted settings page
```

### Recommended Approach (phased)

**Phase 1 (MVP — GitHub Action only):** API key comes from `${{ secrets.ANTHROPIC_API_KEY }}`. No per-installation management needed. The Action reads it from the environment.

**Phase 2 (GitHub App):** Simple settings page per installation. When a user installs the app, they visit a configuration page to enter their Anthropic API key. We store it encrypted (AES-256-GCM) in a database (Railway Postgres or similar). The bot retrieves it per webhook event using the `installation.id`.

**Phase 3 (Hosted tier):** We provide API keys for paying customers. Users who don't bring their own key use our pooled key with rate limits and billing.

### Key Security Requirements

- API keys encrypted at rest (AES-256-GCM or similar)
- Keys never logged, never included in error reports
- Keys transmitted only over HTTPS
- Per-installation isolation — one compromised installation can't access another's key
- Key rotation support (user can update their key via settings page)

## 5. Local Development Workflow

### smee.io (Webhook Proxy)

[smee.io](https://smee.io/) is the standard approach for local GitHub App development. It's maintained by the Probot team and recommended in GitHub's official docs.

**How it works:**
1. Visit smee.io, get a unique webhook proxy URL
2. Configure GitHub App to send webhooks to the smee.io URL
3. Run `smee-client` locally — it receives events via SSE and forwards to `localhost:3000`
4. Your local server processes the webhook as if it were in production

```bash
# Install
npm install -g smee-client

# Run (forwards smee.io events to localhost:3000)
smee --url https://smee.io/YOUR_CHANNEL --target http://localhost:3000/api/github/webhooks
```

**Limitations:**
- Not authenticated — anyone with the channel URL can see payloads
- Development only, not for production
- Occasional reliability issues (SSE disconnects)

### Full Local Dev Setup

```bash
# 1. Create a test GitHub App (separate from production)
#    - Set webhook URL to your smee.io channel
#    - Download private key

# 2. Set environment variables
export APP_ID=123456
export APP_PRIVATE_KEY="$(cat ./test-app.pem)"
export WEBHOOK_SECRET=development-secret
export ANTHROPIC_API_KEY=sk-ant-...

# 3. Start webhook proxy
npx smee -u https://smee.io/YOUR_CHANNEL -t http://localhost:3000/api/github/webhooks &

# 4. Start the bot server
pnpm dev

# 5. Create a test PR in a repo where the test app is installed
#    → Webhook fires → smee proxies → local server processes
```

### Alternative: `gh webhook` (GitHub CLI)

GitHub CLI has a `webhook` extension for forwarding webhooks. Less common than smee but doesn't require a third-party service.

```bash
gh extension install cli/gh-webhook
gh webhook forward --events=pull_request,issue_comment --repo=owner/repo --url=http://localhost:3000/api/github/webhooks
```

### Testing Without Webhooks

For unit and integration testing, use recorded webhook payloads:

```typescript
import { Webhooks } from "@octokit/webhooks";

const webhooks = new Webhooks({ secret: "test-secret" });
webhooks.on("pull_request.opened", handler);

// Simulate event with fixture data
await webhooks.receive({
  id: "test-id",
  name: "pull_request",
  payload: loadFixture("pull_request.opened.json"),
});
```

This is faster and more reliable than end-to-end webhook testing for most development.

## 6. Recommended Approach

### Architecture

```
GitHub ──webhook POST──► Railway (Node.js server)
                              │
                         @octokit/webhooks (verify + route)
                              │
                    ┌─────────┴─────────┐
                    │                   │
               respec handler      specguard handler
                    │                   │
              Anthropic API        Check file mappings
              (user's key)         (no LLM needed)
                    │                   │
              Post PR comment      Post check run
              (via @octokit/rest)  (via @octokit/rest)
```

### Technology Stack

| Component | Choice | Why |
|-----------|--------|-----|
| Framework | None (Hono or bare `http`) | Lightweight, no Express overhead |
| GitHub auth | `@octokit/app` | Handles JWT + installation tokens |
| Webhooks | `@octokit/webhooks` | Event routing + HMAC verification |
| GitHub API | `@octokit/rest` | Type-safe API calls |
| HTTP server | [Hono](https://hono.dev/) | Lightweight, runs everywhere (Node, Workers, Deno). Easy to migrate later. |
| Hosting | Railway | Always-on, handles long LLM calls |
| Local dev | smee.io + smee-client | Standard GitHub App dev workflow |
| Secret storage | Railway env vars (app) + encrypted DB (user keys) | Simple, secure |

### Why Hono over Express

- 15x smaller than Express
- TypeScript-first
- Runs on Node, Cloudflare Workers, Deno, Bun — future migration flexibility
- `@octokit/webhooks` provides `createNodeMiddleware()` that works with any standard HTTP handler

### Why Not Probot

Probot adds Express, pino, LRU cache, and its own CLI. We need:
- Webhook verification → `@octokit/webhooks`
- App auth → `@octokit/app`
- API calls → `@octokit/rest`

That's it. Probot wraps these same packages with opinions we don't need.

## 7. Implementation Roadmap

### Phase 1: CLI + GitHub Action (build first)

No bot needed yet. The core spec generation and gating logic runs as:
- CLI: `respec generate`, `specguard check`
- GitHub Action: triggered by workflow events, reads `ANTHROPIC_API_KEY` from secrets

This validates the core product without any hosting infrastructure.

### Phase 2: Bot Foundation

Build the webhook server with minimal functionality:

1. **GitHub App registration** — create the app on GitHub with required permissions
2. **Webhook server** — Hono + `@octokit/webhooks` on Railway
3. **Event handlers** — wire `pull_request.opened` and `issue_comment.created` to the existing core logic
4. **Secret management** — app credentials in Railway env vars, user API keys stored encrypted in SQLite/Postgres

Deliverable: Bot that responds to PRs and `@respec`/`@specguard` mentions using the same core logic as the CLI.

### Phase 3: Polish

- Settings page for users to configure API keys post-installation
- Rate limiting per installation
- Error handling and retry logic
- Monitoring and alerting (Sentry or similar)
- Usage analytics (track which events are processed)

### Phase 4: Scale (if needed)

- Queue system for webhook processing (Bull/BullMQ + Redis)
- Multiple workers for parallel processing
- Hosted tier with our own API keys
- Self-hosted Docker image for enterprise users

### What to Defer

- **OAuth login flow** — not needed until we have a settings UI
- **Marketplace listing** — not needed until the bot is stable
- **Multi-region deployment** — Railway single-region is fine for a bot
- **Cloudflare Workers migration** — only consider if Railway costs become a concern and we've solved the long-running LLM call problem

## Sources

- [Probot framework](https://probot.github.io/)
- [@octokit/app.js](https://github.com/octokit/app.js)
- [@octokit/webhooks.js](https://github.com/octokit/webhooks.js)
- [Build your own Probot](https://jasonet.co/posts/build-your-own-probot/)
- [Probot App or GitHub Action?](https://jasonet.co/posts/probot-app-or-github-action-v2/)
- [Deploy GitHub App to Cloudflare Workers](https://dev.to/opensauced/deploy-a-github-application-to-cloudflare-workers-2gpm)
- [GitHub Docs: Building a GitHub App](https://docs.github.com/en/apps/creating-github-apps/writing-code-for-a-github-app/building-a-github-app-that-responds-to-webhook-events)
- [GitHub Docs: Choosing permissions](https://docs.github.com/en/apps/creating-github-apps/registering-a-github-app/choosing-permissions-for-a-github-app)
- [GitHub Docs: Check Runs API](https://docs.github.com/en/rest/guides/using-the-rest-api-to-interact-with-checks)
- [GitHub Docs: Using webhooks with GitHub Apps](https://docs.github.com/en/apps/creating-github-apps/registering-a-github-app/using-webhooks-with-github-apps)
- [smee.io](https://smee.io/)
- [Railway pricing](https://railway.com/pricing)
- [Cloudflare Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/)
- [Hono](https://hono.dev/)
