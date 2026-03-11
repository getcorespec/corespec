import 'dotenv/config';
import { serve } from '@hono/node-server';
import { loadEnv } from './env.js';
import { createApp } from './app.js';

const env = loadEnv();
const { app } = createApp({
  appId: env.appId,
  privateKey: env.privateKey,
  webhookSecret: env.webhookSecret,
});

serve({ fetch: app.fetch, port: env.port }, (info) => {
  console.log(`Bot listening on http://localhost:${info.port}`);
  console.log(`Webhooks: POST http://localhost:${info.port}/api/github/webhooks`);
  console.log(`Health:   GET  http://localhost:${info.port}/health`);
});
