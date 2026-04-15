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
        { file: 'src/index.ts', score: 0.9, pass: true, reason: 'covered by index spec' },
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
      files: [{ file: 'src/bad.ts', score: 0.3, pass: false, reason: 'Missing tests' }],
    }));
    expect(md).toContain(':x: **specguard: FAIL**');
    expect(md).toContain('`src/bad.ts`');
    expect(md).toContain('Missing tests');
  });

  it('renders openspec framework as a hyperlink to the spec directory on the PR head', () => {
    const md = formatPrComment(makeResult(), {
      repoFullName: 'getcorespec/corespec',
      headRef: 'feature/x',
    });
    expect(md).toContain(
      '**Framework:** [openspec](https://github.com/getcorespec/corespec/tree/feature/x/openspec/specs)',
    );
  });

  it('includes Reason header column', () => {
    const md = formatPrComment(makeResult());
    expect(md).toContain('| File | Score | Status | Reason |');
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
        { file: 'a.ts', score: 0.9, pass: true, reason: 'covered' },
        { file: 'b.ts', score: 0.3, pass: false, reason: 'No tests' },
      ],
    }));
    expect(output.title).toBe('specguard: FAIL');
    expect(output.summary).toContain('1 of 2 files');
    expect(output.text).toContain('`b.ts`');
    expect(output.text).toContain('No tests');
  });
});
