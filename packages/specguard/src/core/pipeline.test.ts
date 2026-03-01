import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@getcorespec/corespec', () => ({
  checkFramework: vi.fn(),
  judgeFramework: vi.fn(),
  judgeDiff: vi.fn(),
}));

import { runPipeline } from './pipeline.js';
import { checkFramework, judgeFramework, judgeDiff } from '@getcorespec/corespec';

const mockCheckFramework = vi.mocked(checkFramework);
const mockJudgeFramework = vi.mocked(judgeFramework);
const mockJudgeDiff = vi.mocked(judgeDiff);

describe('runPipeline', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('chains the 3 tools together', async () => {
    mockCheckFramework.mockReturnValue({
      signals: [{ signal: 'openspec/ directory', framework: 'openspec', path: 'openspec/' }],
      candidates: ['openspec'],
    });

    mockJudgeFramework.mockResolvedValue({
      framework: 'openspec',
      confidence: 0.95,
      reasoning: 'OpenSpec detected',
    });

    mockJudgeDiff.mockResolvedValue({
      files: [{ file: 'src/index.ts', score: 0.9, pass: true }],
      result: 'pass',
      threshold: 0.7,
    });

    const result = await runPipeline({
      repoRoot: '/tmp/test-repo',
      diff: 'diff --git a/src/index.ts ...',
      model: 'anthropic/claude-sonnet-4-20250514',
      threshold: 0.7,
    });

    expect(mockCheckFramework).toHaveBeenCalledWith('/tmp/test-repo');
    expect(mockJudgeFramework).toHaveBeenCalled();
    expect(mockJudgeDiff).toHaveBeenCalled();
    expect(result.framework.framework).toBe('openspec');
    expect(result.diff.result).toBe('pass');
  });
});
