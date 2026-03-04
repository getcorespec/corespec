import type { Octokit } from '@octokit/core';

const COMMENT_MARKER = '<!-- specguard-bot -->';

interface CheckRunOutput {
  title: string;
  summary: string;
  text?: string;
}

export async function createCheckRun(
  octokit: Octokit,
  owner: string,
  repo: string,
  headSha: string,
): Promise<number> {
  const { data } = await octokit.request('POST /repos/{owner}/{repo}/check-runs', {
    owner,
    repo,
    name: 'specguard',
    head_sha: headSha,
    status: 'in_progress',
  });
  return data.id;
}

export async function updateCheckRun(
  octokit: Octokit,
  owner: string,
  repo: string,
  checkRunId: number,
  conclusion: 'success' | 'failure' | 'cancelled',
  output: CheckRunOutput,
): Promise<void> {
  await octokit.request('PATCH /repos/{owner}/{repo}/check-runs/{check_run_id}', {
    owner,
    repo,
    check_run_id: checkRunId,
    status: 'completed',
    conclusion,
    output,
  });
}

export async function upsertComment(
  octokit: Octokit,
  owner: string,
  repo: string,
  prNumber: number,
  body: string,
): Promise<void> {
  const markedBody = `${COMMENT_MARKER}\n${body}`;

  const { data: comments } = await octokit.request(
    'GET /repos/{owner}/{repo}/issues/{issue_number}/comments',
    { owner, repo, issue_number: prNumber },
  );

  const existing = comments.find(
    (c: { body?: string }) => c.body?.includes(COMMENT_MARKER),
  );

  if (existing) {
    await octokit.request(
      'PATCH /repos/{owner}/{repo}/issues/comments/{comment_id}',
      { owner, repo, comment_id: existing.id, body: markedBody },
    );
  } else {
    await octokit.request(
      'POST /repos/{owner}/{repo}/issues/{issue_number}/comments',
      { owner, repo, issue_number: prNumber, body: markedBody },
    );
  }
}
