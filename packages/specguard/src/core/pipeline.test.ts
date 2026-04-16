import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@getcorespec/corespec', () => ({
  checkFramework: vi.fn(),
  judgeFramework: vi.fn(),
  judgeDiff: vi.fn(),
  loadSpecs: vi.fn(() => []),
}));

import { runPipeline } from './pipeline.js';
import { checkFramework, judgeFramework, judgeDiff, loadSpecs } from '@getcorespec/corespec';

const mockCheckFramework = vi.mocked(checkFramework);
const mockJudgeFramework = vi.mocked(judgeFramework);
const mockJudgeDiff = vi.mocked(judgeDiff);
const mockLoadSpecs = vi.mocked(loadSpecs);

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
      files: [{ file: 'src/index.ts', score: 0.9, pass: true, reason: 'covered by index spec' }],
      result: 'pass',
      threshold: 0.7,
    });

    mockLoadSpecs.mockReturnValue([
      { path: 'openspec/specs/index/spec.md', content: '# Index spec' },
    ]);

    const result = await runPipeline({
      repoRoot: '/tmp/test-repo',
      diff: 'diff --git a/src/index.ts ...',
      model: 'anthropic/claude-sonnet-4-20250514',
      threshold: 0.7,
    });

    expect(mockCheckFramework).toHaveBeenCalledWith('/tmp/test-repo');
    expect(mockJudgeFramework).toHaveBeenCalled();
    expect(mockLoadSpecs).toHaveBeenCalledWith('/tmp/test-repo', 'openspec');
    expect(mockJudgeDiff).toHaveBeenCalled();
    // Verify specs were threaded through to judge-diff so the LLM sees them.
    const judgeDiffCall = mockJudgeDiff.mock.calls[0];
    expect(judgeDiffCall[5]).toEqual([
      { path: 'openspec/specs/index/spec.md', content: '# Index spec' },
    ]);
    expect(result.framework.framework).toBe('openspec');
    expect(result.diff.result).toBe('pass');
  });
});
