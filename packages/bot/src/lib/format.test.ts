import { describe, it, expect } from 'vitest';
import { formatPrComment, formatCheckRunOutput } from './format.js';
import type { PipelineResult } from '@getcorespec/specguard';

function makeResult(overrides: { result?: 'pass' | 'fail'; files?: any[] } = {}): PipelineResult {
  return {
    signals: {
      signals: [{ signal: 'openspec/ directory', framework: 'openspec', path: 'openspec/' }],
      candidates: ['openspec'],
    },
    framework: {
      framework: 'openspec',
      confidence: 0.95,
      reasoning: 'OpenSpec detected',
    },
    diff: {
      files: overrides.files ?? [
        { file: 'src/index.ts', score: 0.9, pass: true },
      ],
      result: overrides.result ?? 'pass',
      threshold: 0.7,
    },
  };
}

describe('formatPrComment', () => {
  it('formats a passing result', () => {
    const md = formatPrComment(makeResult());
    expect(md).toContain(':white_check_mark: **specguard: PASS**');
    expect(md).toContain('**Framework:** openspec (confidence: 0.95)');
    expect(md).toContain('**Threshold:** 0.7');
    expect(md).toContain('`src/index.ts`');
  });

  it('formats a failing result', () => {
    const md = formatPrComment(makeResult({
      result: 'fail',
      files: [{ file: 'src/bad.ts', score: 0.3, pass: false, gap: 'Missing tests' }],
    }));
    expect(md).toContain(':x: **specguard: FAIL**');
    expect(md).toContain('`src/bad.ts`');
    expect(md).toContain('Missing tests');
  });
});

describe('formatCheckRunOutput', () => {
  it('returns pass title, summary, and file table', () => {
    const output = formatCheckRunOutput(makeResult());
    expect(output.title).toBe('specguard: PASS');
    expect(output.summary).toContain('All 1 files');
    expect(output.text).toContain('`src/index.ts`');
    expect(output.text).toContain('**Framework:** openspec');
  });

  it('returns fail title, summary, and file table', () => {
    const output = formatCheckRunOutput(makeResult({
      result: 'fail',
      files: [
        { file: 'a.ts', score: 0.9, pass: true },
        { file: 'b.ts', score: 0.3, pass: false, gap: 'No tests' },
      ],
    }));
    expect(output.title).toBe('specguard: FAIL');
    expect(output.summary).toContain('1 of 2 files');
    expect(output.text).toContain('`b.ts`');
    expect(output.text).toContain('No tests');
  });
});
