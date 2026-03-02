import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@getcorespec/corespec', () => ({
  checkFramework: vi.fn(),
  judgeFramework: vi.fn(),
}));

vi.mock('./generator.js', () => ({
  generateSpecs: vi.fn(),
}));

vi.mock('glob', () => ({
  glob: vi.fn(),
}));

import { runPipeline } from './pipeline.js';
import { checkFramework, judgeFramework } from '@getcorespec/corespec';
import { generateSpecs } from './generator.js';
import { glob } from 'glob';
import { readFileSync } from 'fs';

const mockCheckFramework = vi.mocked(checkFramework);
const mockJudgeFramework = vi.mocked(judgeFramework);
const mockGenerateSpecs = vi.mocked(generateSpecs);
const mockGlob = vi.mocked(glob);

vi.mock('fs', async () => {
  const actual = await vi.importActual<typeof import('fs')>('fs');
  return {
    ...actual,
    readFileSync: vi.fn().mockReturnValue('file content'),
  };
});

describe('runPipeline', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls framework detection, glob, and generation in order', async () => {
    mockCheckFramework.mockReturnValue({
      signals: [{ signal: 'openspec/ directory', framework: 'openspec', path: 'openspec/' }],
      candidates: ['openspec'],
    });

    mockJudgeFramework.mockResolvedValue({
      framework: 'openspec',
      confidence: 0.95,
      reasoning: 'OpenSpec detected',
    });

    mockGlob.mockResolvedValue(['/repo/src/index.ts'] as any);

    mockGenerateSpecs.mockResolvedValue([
      { file: 'src/index.ts', specPath: 'specs/index.spec.md', content: '# Spec' },
    ]);

    const result = await runPipeline({
      repoRoot: '/repo',
      targetPath: '/repo/src',
      model: 'anthropic/claude-sonnet-4-20250514',
      outputDir: 'specs',
    });

    expect(mockCheckFramework).toHaveBeenCalledWith('/repo');
    expect(mockJudgeFramework).toHaveBeenCalled();
    expect(mockGlob).toHaveBeenCalled();
    expect(mockGenerateSpecs).toHaveBeenCalled();

    expect(result.framework.framework).toBe('openspec');
    expect(result.specs).toHaveLength(1);
    expect(result.specs[0].specPath).toBe('specs/index.spec.md');
  });

  it('passes model config through to judgeFramework and generateSpecs', async () => {
    mockCheckFramework.mockReturnValue({ signals: [], candidates: [] });
    mockJudgeFramework.mockResolvedValue({
      framework: 'none',
      confidence: 0,
      reasoning: 'No framework',
    });
    mockGlob.mockResolvedValue([] as any);
    mockGenerateSpecs.mockResolvedValue([]);

    await runPipeline({
      repoRoot: '/repo',
      targetPath: '/repo',
      model: 'openai/gpt-4o',
      outputDir: 'specs',
    });

    expect(mockJudgeFramework).toHaveBeenCalledWith(
      expect.anything(),
      { model: 'openai/gpt-4o' },
    );
    expect(mockGenerateSpecs).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      { model: 'openai/gpt-4o' },
      'specs',
    );
  });
});
