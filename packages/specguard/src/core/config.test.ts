import { describe, it, expect, beforeEach, afterEach } from 'vitest';
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
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('returns defaults when no config exists', () => {
    const config = loadConfig({ cwd: tempDir });

    expect(config.model).toBe('anthropic/claude-haiku-4-5-20251001');
    expect(config.threshold).toBe(0.7);
  });

  it('reads from .specguard.yml', () => {
    writeFileSync(join(tempDir, '.specguard.yml'), 'model: openai/gpt-4o\nthreshold: 0.5\n');

    const config = loadConfig({ cwd: tempDir });

    expect(config.model).toBe('openai/gpt-4o');
    expect(config.threshold).toBe(0.5);
  });

  it('returns empty ignore array by default', () => {
    const config = loadConfig({ cwd: tempDir });
    expect(config.ignore).toEqual([]);
  });

  it('parses ignore list from config', () => {
    writeFileSync(join(tempDir, '.specguard.yml'), 'model: openai/gpt-4o\nignore:\n  - "*.md"\n  - pnpm-lock.yaml\n');

    const config = loadConfig({ cwd: tempDir });

    expect(config.ignore).toEqual(['*.md', 'pnpm-lock.yaml']);
  });

  it('skips comments in config', () => {
    writeFileSync(join(tempDir, '.specguard.yml'), '# A comment\nmodel: openai/gpt-4o\nignore:\n  # Lockfiles\n  - "*.lock"\n');

    const config = loadConfig({ cwd: tempDir });

    expect(config.model).toBe('openai/gpt-4o');
    expect(config.ignore).toEqual(['*.lock']);
  });

  it('CLI flags override config file', () => {
    writeFileSync(join(tempDir, '.specguard.yml'), 'model: openai/gpt-4o\nthreshold: 0.5\n');

    const config = loadConfig({
      cwd: tempDir,
      model: 'anthropic/claude-sonnet-4-20250514',
      threshold: 0.9,
    });

    expect(config.model).toBe('anthropic/claude-sonnet-4-20250514');
    expect(config.threshold).toBe(0.9);
  });
});
