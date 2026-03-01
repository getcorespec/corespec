import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdirSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { loadConfig } from './config.js';

function createTempDir(): string {
  const dir = join(tmpdir(), `specguard-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  mkdirSync(dir, { recursive: true });
  return dir;
}

describe('loadConfig', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = createTempDir();
    vi.stubEnv('SPECGUARD_MODEL', '');
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
    vi.unstubAllEnvs();
  });

  it('returns defaults when no config exists', () => {
    const config = loadConfig({ cwd: tempDir });

    expect(config.model).toBe('anthropic/claude-sonnet-4-20250514');
    expect(config.threshold).toBe(0.7);
  });

  it('reads from .specguard.yml', () => {
    writeFileSync(join(tempDir, '.specguard.yml'), 'model: openai/gpt-4o\nthreshold: 0.5\n');

    const config = loadConfig({ cwd: tempDir });

    expect(config.model).toBe('openai/gpt-4o');
    expect(config.threshold).toBe(0.5);
  });

  it('env vars override config file', () => {
    writeFileSync(join(tempDir, '.specguard.yml'), 'model: openai/gpt-4o\n');
    vi.stubEnv('SPECGUARD_MODEL', 'anthropic/claude-haiku-4-5-20251001');

    const config = loadConfig({ cwd: tempDir });

    expect(config.model).toBe('anthropic/claude-haiku-4-5-20251001');
  });

  it('CLI flags override everything', () => {
    writeFileSync(join(tempDir, '.specguard.yml'), 'model: openai/gpt-4o\nthreshold: 0.5\n');
    vi.stubEnv('SPECGUARD_MODEL', 'anthropic/claude-haiku-4-5-20251001');

    const config = loadConfig({
      cwd: tempDir,
      model: 'anthropic/claude-sonnet-4-20250514',
      threshold: 0.9,
    });

    expect(config.model).toBe('anthropic/claude-sonnet-4-20250514');
    expect(config.threshold).toBe(0.9);
  });
});
