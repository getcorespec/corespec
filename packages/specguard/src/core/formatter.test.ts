import { describe, it, expect } from 'vitest';
import { formatHuman, formatJson } from './formatter.js';
import type { PipelineResult } from './pipeline.js';

const sampleResult: PipelineResult = {
  framework: {
    framework: 'openspec',
    confidence: 0.95,
    reasoning: 'OpenSpec detected',
  },
  diff: {
    files: [
      { file: 'src/auth/login.ts', score: 0.85, pass: true, reason: 'covered by auth spec' },
      { file: 'src/auth/middleware.ts', score: 0.2, pass: false, reason: 'no spec covers auth middleware' },
    ],
    result: 'fail',
    threshold: 0.7,
  },
  signals: {
    signals: [{ signal: 'openspec/ directory', framework: 'openspec', path: 'openspec/' }],
    candidates: ['openspec'],
  },
};

describe('formatJson', () => {
  it('returns valid JSON', () => {
    const output = formatJson(sampleResult);
    const parsed = JSON.parse(output);
    expect(parsed.framework.detected).toBe('openspec');
    expect(parsed.coverage).toHaveLength(2);
    expect(parsed.result).toBe('fail');
  });
});

describe('formatHuman', () => {
  it('includes framework detection section', () => {
    const output = formatHuman(sampleResult);
    expect(output).toContain('Framework Detection');
    expect(output).toContain('openspec');
  });

  it('includes spec coverage section', () => {
    const output = formatHuman(sampleResult);
    expect(output).toContain('Spec Coverage');
    expect(output).toContain('src/auth/login.ts');
    expect(output).toContain('src/auth/middleware.ts');
  });

  it('includes result', () => {
    const output = formatHuman(sampleResult);
    expect(output).toContain('FAIL');
  });
});
