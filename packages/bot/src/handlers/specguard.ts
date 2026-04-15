import { execSync } from 'child_process';
import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import type { EmitterWebhookEvent } from '@octokit/webhooks';
import type { Octokit } from '@octokit/core';
import { runPipeline, loadConfig } from '@getcorespec/specguard';
import { createCheckRun, updateCheckRun, upsertComment } from '../lib/github.js';
import { formatPrComment, formatCheckRunOutput } from '../lib/format.js';

type PullRequestEvent = EmitterWebhookEvent<'pull_request'>;

export function createSpecguardHandler(
  getInstallationOctokit: (installationId: number) => Promise<Octokit>,
) {
  return async ({ payload }: PullRequestEvent) => {
    const pr = payload.pull_request;
    const repo = payload.repository;
    const owner = repo.owner.login;
    const repoName = repo.name;
    const installationId = (payload as { installation?: { id: number } }).installation?.id;

    if (!installationId) {
      console.error('[specguard] No installation ID on webhook payload');
      return;
    }

    console.log(`[specguard] PR #${pr.number} on ${repo.full_name}: ${pr.title}`);

    const octokit = await getInstallationOctokit(installationId);
    const checkRunId = await createCheckRun(octokit, owner, repoName, pr.head.sha);

    let tmpDir: string | undefined;

    try {
      // Fetch diff
      const { data: diff } = await octokit.request(
        'GET /repos/{owner}/{repo}/pulls/{pull_number}',
        {
          owner,
          repo: repoName,
          pull_number: pr.number,
          mediaType: { format: 'diff' },
        },
      );

      // Shallow clone using installation token
      const { data: { token } } = await octokit.request(
        'POST /app/installations/{installation_id}/access_tokens',
        { installation_id: installationId },
      );

      tmpDir = mkdtempSync(join(tmpdir(), 'specguard-'));
      const cloneUrl = `https://x-access-token:${token}@github.com/${repo.full_name}.git`;
      execSync(`git clone --depth 1 --branch ${pr.head.ref} ${cloneUrl} ${tmpDir}`, {
        stdio: 'pipe',
      });

      const config = loadConfig({ cwd: tmpDir });

      const result = await runPipeline({
        repoRoot: tmpDir,
        diff: diff as unknown as string,
        model: config.model,
        threshold: config.threshold,
        ignore: config.ignore,
      });

      const conclusion = result.diff.result === 'pass' ? 'success' : 'failure';
      const prCtx = { repoFullName: repo.full_name, headRef: pr.head.ref };
      const output = formatCheckRunOutput(result, prCtx);
      await updateCheckRun(octokit, owner, repoName, checkRunId, conclusion, output);
      await upsertComment(octokit, owner, repoName, pr.number, formatPrComment(result, prCtx));

      console.log(`[specguard] PR #${pr.number}: ${conclusion}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[specguard] PR #${pr.number} error:`, message);

      await updateCheckRun(octokit, owner, repoName, checkRunId, 'cancelled', {
        title: 'specguard: ERROR',
        summary: message,
      });
    } finally {
      if (tmpDir) {
        rmSync(tmpDir, { recursive: true, force: true });
      }
    }
  };
}
