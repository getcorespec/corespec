import type { Webhooks } from '@octokit/webhooks';
import type { Octokit } from '@octokit/core';
import { createSpecguardHandler } from './handlers/specguard.js';

export interface WebhookDeps {
  webhooks: Webhooks;
  getInstallationOctokit: (installationId: number) => Promise<Octokit>;
}

export function registerHandlers({ webhooks, getInstallationOctokit }: WebhookDeps) {
  webhooks.on(
    ['pull_request.opened', 'pull_request.synchronize', 'pull_request.reopened'],
    createSpecguardHandler(getInstallationOctokit),
  );

  webhooks.onError((error) => {
    console.error('Webhook handler error:', error.message);
  });
}
