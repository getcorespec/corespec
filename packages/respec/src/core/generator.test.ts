import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@getcorespec/corespec', () => ({
  callLLM: vi.fn(),
}));

import { deriveSpecPath, generateSpecs } from './generator.js';
import { callLLM } from '@getcorespec/corespec';
import type { FrameworkJudgment } from '@getcorespec/corespec';

const mockCallLLM = vi.mocked(callLLM);

describe('deriveSpecPath', () => {
  it('strips src/ prefix and adds .spec.md', () => {
    expect(deriveSpecPath('src/auth/login.ts', 'specs')).toBe('specs/auth/login.spec.md');
  });

  it('handles src/index.ts', () => {
    expect(deriveSpecPath('src/index.ts', 'specs')).toBe('specs/index.spec.md');
  });

  it('keeps path intact when no src/ prefix', () => {
    expect(deriveSpecPath('lib/utils.js', 'specs')).toBe('specs/lib/utils.spec.md');
  });

  it('uses custom output directory', () => {
    expect(deriveSpecPath('src/core/pipeline.ts', 'docs')).toBe('docs/core/pipeline.spec.md');
  });
});

describe('generateSpecs', () => {
  const framework: FrameworkJudgment = {
    framework: 'openspec',
    confidence: 0.95,
    reasoning: 'OpenSpec detected',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls LLM for each file and returns GeneratedSpec array', async () => {
    mockCallLLM
      .mockResolvedValueOnce('# Spec for login')
      .mockResolvedValueOnce('# Spec for utils');

    const files = [
      { path: 'src/auth/login.ts', content: 'export function login() {}' },
      { path: 'src/utils.ts', content: 'export function helper() {}' },
    ];

    const specs = await generateSpecs(files, framework, { model: 'anthropic/claude-sonnet-4-20250514' }, 'specs');

    expect(mockCallLLM).toHaveBeenCalledTimes(2);
    expect(specs).toHaveLength(2);

    expect(specs[0].file).toBe('src/auth/login.ts');
    expect(specs[0].specPath).toBe('specs/auth/login.spec.md');
    expect(specs[0].content).toBe('# Spec for login');

    expect(specs[1].file).toBe('src/utils.ts');
    expect(specs[1].specPath).toBe('specs/utils.spec.md');
    expect(specs[1].content).toBe('# Spec for utils');
  });

  it('includes framework context in prompt', async () => {
    mockCallLLM.mockResolvedValueOnce('# Spec');

    const files = [{ path: 'src/index.ts', content: 'export const x = 1;' }];
    await generateSpecs(files, framework, { model: 'test' }, 'specs');

    const prompt = mockCallLLM.mock.calls[0][1] as string;
    expect(prompt).toContain('openspec');
    expect(prompt).toContain('src/index.ts');
    expect(prompt).toContain('export const x = 1;');
  });

  it('uses generic format when no framework detected', async () => {
    mockCallLLM.mockResolvedValueOnce('# Spec');

    const noFramework: FrameworkJudgment = {
      framework: 'none',
      confidence: 0,
      reasoning: 'No framework found',
    };

    const files = [{ path: 'src/index.ts', content: 'const x = 1;' }];
    await generateSpecs(files, noFramework, { model: 'test' }, 'specs');

    const prompt = mockCallLLM.mock.calls[0][1] as string;
    expect(prompt).toContain('generic markdown specification format');
  });

  it('returns empty array for no files', async () => {
    const specs = await generateSpecs([], framework, { model: 'test' }, 'specs');
    expect(specs).toEqual([]);
    expect(mockCallLLM).not.toHaveBeenCalled();
  });
});
