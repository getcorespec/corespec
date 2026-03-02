import { describe, it, expect } from 'vitest';
import { formatHuman, formatJson, type PipelineResult } from './formatter.js';

const sampleResult: PipelineResult = {
  framework: {
    framework: 'openspec',
    confidence: 0.95,
    reasoning: 'OpenSpec detected',
  },
  specs: [
    { file: 'src/auth/login.ts', specPath: 'specs/auth/login.spec.md', content: '# Login spec' },
    { file: 'src/utils.ts', specPath: 'specs/utils.spec.md', content: '# Utils spec' },
  ],
  signals: {
    signals: [{ signal: 'openspec/ directory', framework: 'openspec', path: 'openspec/' }],
    candidates: ['openspec'],
  },
};

describe('formatJson', () => {
  it('returns valid JSON with expected structure', () => {
    const output = formatJson(sampleResult);
    const parsed = JSON.parse(output);

    expect(parsed.framework.detected).toBe('openspec');
    expect(parsed.framework.confidence).toBe(0.95);
    expect(parsed.framework.signals).toEqual(['openspec/ directory']);
    expect(parsed.specs).toHaveLength(2);
    expect(parsed.count).toBe(2);
  });

  it('includes spec file mappings', () => {
    const output = formatJson(sampleResult);
    const parsed = JSON.parse(output);

    expect(parsed.specs[0].file).toBe('src/auth/login.ts');
    expect(parsed.specs[0].specPath).toBe('specs/auth/login.spec.md');
    expect(parsed.specs[0].content).toBe('# Login spec');
  });
});

describe('formatHuman', () => {
  it('includes framework detection section', () => {
    const output = formatHuman(sampleResult);
    expect(output).toContain('Framework Detection');
    expect(output).toContain('openspec');
    expect(output).toContain('0.95');
  });

  it('includes generated specs section with file mappings', () => {
    const output = formatHuman(sampleResult);
    expect(output).toContain('Generated Specs');
    expect(output).toContain('src/auth/login.ts');
    expect(output).toContain('specs/auth/login.spec.md');
    expect(output).toContain('src/utils.ts');
  });

  it('includes result count', () => {
    const output = formatHuman(sampleResult);
    expect(output).toContain('2 specs generated');
  });

  it('handles no framework detected', () => {
    const noFrameworkResult: PipelineResult = {
      ...sampleResult,
      framework: { framework: 'none', confidence: 0, reasoning: 'None found' },
    };

    const output = formatHuman(noFrameworkResult);
    expect(output).toContain('No spec framework detected');
  });
});
