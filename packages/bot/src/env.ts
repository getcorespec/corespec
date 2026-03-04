export interface BotEnv {
  appId: string;
  privateKey: string;
  webhookSecret: string;
  port: number;
}

export function loadEnv(): BotEnv {
  const appId = process.env.APP_ID;
  const privateKey = process.env.APP_PRIVATE_KEY;
  const webhookSecret = process.env.WEBHOOK_SECRET;
  const port = parseInt(process.env.PORT ?? '2772', 10);

  const missing: string[] = [];
  if (!appId) missing.push('APP_ID');
  if (!privateKey) missing.push('APP_PRIVATE_KEY');
  if (!webhookSecret) missing.push('WEBHOOK_SECRET');

  if (missing.length > 0) {
    throw new Error(`Missing required env vars: ${missing.join(', ')}`);
  }

  return {
    appId: appId!,
    privateKey: privateKey!,
    webhookSecret: webhookSecret!,
    port,
  };
}
