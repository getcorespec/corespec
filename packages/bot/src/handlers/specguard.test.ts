import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@getcorespec/specguard', () => ({
  runPipeline: vi.fn(),
  loadConfig: vi.fn(),
}));

vi.mock('child_process', () => ({
  execSync: vi.fn(),
}));

vi.mock('fs', () => ({
  mkdtempSync: vi.fn(() => '/tmp/specguard-test'),
  rmSync: vi.fn(),
}));

vi.mock('os', () => ({
  tmpdir: vi.fn(() => '/tmp'),
}));

import { createSpecguardHandler } from './specguard.js';
import { runPipeline, loadConfig } from '@getcorespec/specguard';
import { execSync } from 'child_process';
import { rmSync } from 'fs';

const mockRunPipeline = vi.mocked(runPipeline);
const mockLoadConfig = vi.mocked(loadConfig);
const mockExecSync = vi.mocked(execSync);
const mockRmSync = vi.mocked(rmSync);

function makeMockOctokit() {
  return {
    request: vi.fn(),
  };
}

function makePayload(overrides: Record<string, any> = {}) {
  return {
    payload: {
      action: 'opened',
      installation: { id: 42 },
      pull_request: {
        number: 7,
        title: 'Add feature',
        head: { sha: 'abc123', ref: 'feat/test' },
        ...overrides.pull_request,
      },
      repository: {
        name: 'corespec',
        full_name: 'getcorespec/corespec',
        owner: { login: 'getcorespec' },
        ...overrides.repository,
      },
      ...overrides,
    },
  };
}

describe('createSpecguardHandler', () => {
  let mockOctokit: ReturnType<typeof makeMockOctokit>;
  let getInstallationOctokit: ReturnType<typeof vi.fn>;
  let handler: ReturnType<typeof createSpecguardHandler>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockOctokit = makeMockOctokit();
    getInstallationOctokit = vi.fn().mockResolvedValue(mockOctokit);
    handler = createSpecguardHandler(getInstallationOctokit);

    mockLoadConfig.mockReturnValue({ model: 'anthropic/claude-haiku-4-5-20251001', threshold: 0.7, ignore: [] });
  });

  it('skips when no installation ID', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    await handler(makePayload({ installation: undefined }) as any);
    expect(getInstallationOctokit).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it('creates check run, clones, runs pipeline, posts results', async () => {
    // create check run
    mockOctokit.request.mockResolvedValueOnce({ data: { id: 99 } });
    // fetch diff
    mockOctokit.request.mockResolvedValueOnce({ data: 'diff content' });
    // get installation token
    mockOctokit.request.mockResolvedValueOnce({ data: { token: 'ghs_test' } });

    mockRunPipeline.mockResolvedValue({
      signals: { signals: [], candidates: [] },
      framework: { framework: 'openspec', confidence: 0.95, reasoning: '' },
      diff: {
        files: [{ file: 'src/index.ts', score: 0.9, pass: true }],
        result: 'pass',
        threshold: 0.7,
      },
    });

    // update check run
    mockOctokit.request.mockResolvedValueOnce({});
    // list comments (empty)
    mockOctokit.request.mockResolvedValueOnce({ data: [] });
    // create comment
    mockOctokit.request.mockResolvedValueOnce({});

    await handler(makePayload() as any);

    expect(getInstallationOctokit).toHaveBeenCalledWith(42);

    // Check run created
    expect(mockOctokit.request).toHaveBeenCalledWith(
      'POST /repos/{owner}/{repo}/check-runs',
      expect.objectContaining({ status: 'in_progress', head_sha: 'abc123' }),
    );

    // Clone executed
    expect(mockExecSync).toHaveBeenCalledWith(
      expect.stringContaining('git clone --depth 1'),
      expect.any(Object),
    );

    // Pipeline ran
    expect(mockRunPipeline).toHaveBeenCalledWith(
      expect.objectContaining({ repoRoot: '/tmp/specguard-test', diff: 'diff content' }),
    );

    // Check run updated with success
    expect(mockOctokit.request).toHaveBeenCalledWith(
      'PATCH /repos/{owner}/{repo}/check-runs/{check_run_id}',
      expect.objectContaining({ conclusion: 'success' }),
    );

    // Temp dir cleaned up
    expect(mockRmSync).toHaveBeenCalledWith('/tmp/specguard-test', { recursive: true, force: true });
  });

  it('marks check run cancelled on error and cleans up', async () => {
    // create check run
    mockOctokit.request.mockResolvedValueOnce({ data: { id: 99 } });
    // fetch diff throws
    mockOctokit.request.mockRejectedValueOnce(new Error('API error'));
    // update check run (cancelled)
    mockOctokit.request.mockResolvedValueOnce({});

    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    await handler(makePayload() as any);
    spy.mockRestore();

    expect(mockOctokit.request).toHaveBeenCalledWith(
      'PATCH /repos/{owner}/{repo}/check-runs/{check_run_id}',
      expect.objectContaining({ conclusion: 'cancelled' }),
    );
  });
});
