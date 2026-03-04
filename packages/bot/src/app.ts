import { Hono } from 'hono';
import type { Webhooks } from '@octokit/webhooks';
import { App } from '@octokit/app';
import { registerHandlers } from './webhook.js';

export interface CreateAppOptions {
  appId: string;
  privateKey: string;
  webhookSecret: string;
}

export function createApp(options: CreateAppOptions): { app: Hono; webhooks: Webhooks } {
  const app = new Hono();
  const githubApp = new App({
    appId: options.appId,
    privateKey: options.privateKey,
    webhooks: { secret: options.webhookSecret },
  });

  registerHandlers({
    webhooks: githubApp.webhooks,
    getInstallationOctokit: githubApp.getInstallationOctokit.bind(githubApp),
  });

  app.get('/health', (c) => {
    return c.json({ status: 'ok' });
  });

  app.post('/api/github/webhooks', async (c) => {
    const id = c.req.header('x-github-delivery') ?? '';
    const name = c.req.header('x-github-event') ?? '';
    const signature = c.req.header('x-hub-signature-256') ?? '';
    const body = await c.req.text();

    try {
      await githubApp.webhooks.verifyAndReceive({
        id,
        name: name as any,
        signature,
        payload: body,
      });
      return c.json({ ok: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Webhook processing failed';
      console.error('Webhook error:', message);
      return c.json({ error: message }, 400);
    }
  });

  return { app, webhooks: githubApp.webhooks };
}
