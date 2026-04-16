import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { checkFramework } from './check-framework.js';

function createTempDir(): string {
  const dir = join(tmpdir(), `corespec-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  mkdirSync(dir, { recursive: true });
  return dir;
}

describe('checkFramework', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = createTempDir();
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('detects openspec directory', () => {
    mkdirSync(join(tempDir, 'openspec'), { recursive: true });
    writeFileSync(join(tempDir, 'openspec', 'spec.md'), '# Spec');

    const result = checkFramework(tempDir);

    expect(result.candidates).toContain('openspec');
    expect(result.signals.some(s => s.framework === 'openspec')).toBe(true);
  });

  it('detects superpowers via docs/superpowers/plans directory', () => {
    mkdirSync(join(tempDir, 'docs', 'superpowers', 'plans'), { recursive: true });
    writeFileSync(join(tempDir, 'docs', 'superpowers', 'plans', '2026-04-15-foo.md'), '# Plan');

    const result = checkFramework(tempDir);

    expect(result.candidates).toContain('superpowers');
    expect(result.signals.some(s => s.framework === 'superpowers')).toBe(true);
  });

  it('does not report superpowers from a bare .claude/skills directory (any plugin)', () => {
    mkdirSync(join(tempDir, '.claude', 'skills'), { recursive: true });
    writeFileSync(join(tempDir, '.claude', 'skills', 'test.md'), '# Skill');

    const result = checkFramework(tempDir);

    expect(result.candidates).not.toContain('superpowers');
  });

  it('detects kiro config', () => {
    writeFileSync(join(tempDir, 'kiro.config.ts'), 'export default {}');

    const result = checkFramework(tempDir);

    expect(result.candidates).toContain('kiro');
  });

  it('returns empty results for repo with no spec signals', () => {
    mkdirSync(join(tempDir, 'src'), { recursive: true });
    writeFileSync(join(tempDir, 'src', 'index.ts'), 'export const x = 1;');

    const result = checkFramework(tempDir);

    expect(result.signals).toHaveLength(0);
    expect(result.candidates).toHaveLength(0);
  });

  it('detects multiple frameworks', () => {
    mkdirSync(join(tempDir, 'openspec'), { recursive: true });
    writeFileSync(join(tempDir, 'openspec', 'spec.md'), '# Spec');
    mkdirSync(join(tempDir, 'docs', 'superpowers', 'plans'), { recursive: true });
    writeFileSync(join(tempDir, 'docs', 'superpowers', 'plans', 'p.md'), '# Plan');

    const result = checkFramework(tempDir);

    expect(result.candidates).toContain('openspec');
    expect(result.candidates).toContain('superpowers');
  });
});
