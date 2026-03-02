import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { loadConfig } from './config.js';

function createTempDir(): string {
  const dir = join(tmpdir(), `respec-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
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
    expect(config.outputDir).toBe('specs');
    expect(config.format).toBe('markdown');
  });

  it('reads from .respec.yml', () => {
    writeFileSync(join(tempDir, '.respec.yml'), 'model: openai/gpt-4o\noutputDir: docs\nformat: json\n');

    const config = loadConfig({ cwd: tempDir });

    expect(config.model).toBe('openai/gpt-4o');
    expect(config.outputDir).toBe('docs');
    expect(config.format).toBe('json');
  });

  it('CLI options override config file', () => {
    writeFileSync(join(tempDir, '.respec.yml'), 'model: openai/gpt-4o\noutputDir: docs\n');

    const config = loadConfig({
      cwd: tempDir,
      model: 'anthropic/claude-sonnet-4-20250514',
      outputDir: 'custom-specs',
    });

    expect(config.model).toBe('anthropic/claude-sonnet-4-20250514');
    expect(config.outputDir).toBe('custom-specs');
  });

  it('handles missing config file gracefully', () => {
    const config = loadConfig({ configPath: '/nonexistent/.respec.yml' });

    expect(config.model).toBe('anthropic/claude-haiku-4-5-20251001');
    expect(config.outputDir).toBe('specs');
    expect(config.format).toBe('markdown');
  });
});
