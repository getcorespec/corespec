import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { FrameworkCheckResult } from '../types.js';

// Mock the LLM provider
vi.mock('../llm/provider.js', () => ({
  callLLM: vi.fn(),
}));

import { judgeFramework } from './judge-framework.js';
import { callLLM } from '../llm/provider.js';

const mockCallLLM = vi.mocked(callLLM);

describe('judgeFramework', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  it('returns framework judgment from LLM response', async () => {
    const checkResult: FrameworkCheckResult = {
      signals: [
        { signal: 'openspec/ directory', framework: 'openspec', path: 'openspec/' },
        { signal: 'openspec.config.ts config file', framework: 'openspec', path: 'openspec.config.ts' },
      ],
      candidates: ['openspec'],
    };

    mockCallLLM.mockResolvedValueOnce(JSON.stringify({
      framework: 'openspec',
      confidence: 0.95,
      reasoning: 'Found openspec directory and config file, strongly indicating OpenSpec framework usage.',
    }));

    const result = await judgeFramework(checkResult, { model: 'anthropic/claude-sonnet-4-20250514' });

    expect(result.framework).toBe('openspec');
    expect(result.confidence).toBe(0.95);
    expect(result.reasoning).toBeTruthy();
  });

  it('returns none when no signals found', async () => {
    const checkResult: FrameworkCheckResult = {
      signals: [],
      candidates: [],
    };

    mockCallLLM.mockResolvedValueOnce(JSON.stringify({
      framework: 'none',
      confidence: 0.1,
      reasoning: 'No spec framework signals detected.',
    }));

    const result = await judgeFramework(checkResult, { model: 'anthropic/claude-sonnet-4-20250514' });

    expect(result.framework).toBe('none');
    expect(result.confidence).toBeLessThan(0.5);
  });

  it('includes signals in the prompt sent to LLM', async () => {
    const checkResult: FrameworkCheckResult = {
      signals: [
        { signal: '.claude/skills/ directory', framework: 'superpowers', path: '.claude/skills/' },
      ],
      candidates: ['superpowers'],
    };

    mockCallLLM.mockResolvedValueOnce(JSON.stringify({
      framework: 'superpowers',
      confidence: 0.85,
      reasoning: 'Found superpowers skills directory.',
    }));

    await judgeFramework(checkResult, { model: 'anthropic/claude-sonnet-4-20250514' });

    const promptArg = mockCallLLM.mock.calls[0][1];
    expect(promptArg).toContain('.claude/skills/');
    expect(promptArg).toContain('superpowers');
  });
});
