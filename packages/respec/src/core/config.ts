import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

export interface RespecConfig {
  model: string;
  outputDir: string;
  format: string;
}

interface LoadConfigOptions {
  cwd?: string;
  model?: string;
  outputDir?: string;
  configPath?: string;
}

const DEFAULTS: RespecConfig = {
  model: 'anthropic/claude-haiku-4-5-20251001',
  outputDir: 'specs',
  format: 'markdown',
};

function loadYamlConfig(filePath: string): Partial<RespecConfig> {
  if (!existsSync(filePath)) return {};

  const content = readFileSync(filePath, 'utf-8');
  const result: Partial<RespecConfig> = {};

  for (const line of content.split('\n')) {
    const match = line.match(/^(\w+):\s*(.+)$/);
    if (!match) continue;
    const [, key, value] = match;
    if (key === 'model') result.model = value.trim();
    if (key === 'outputDir') result.outputDir = value.trim();
    if (key === 'format') result.format = value.trim();
  }

  return result;
}

// Precedence: CLI flags > .respec.yml > defaults
export function loadConfig(options: LoadConfigOptions = {}): RespecConfig {
  const cwd = options.cwd ?? process.cwd();
  const configPath = options.configPath ?? join(cwd, '.respec.yml');

  const fileConfig = loadYamlConfig(configPath);

  return {
    model: options.model ?? fileConfig.model ?? DEFAULTS.model,
    outputDir: options.outputDir ?? fileConfig.outputDir ?? DEFAULTS.outputDir,
    format: fileConfig.format ?? DEFAULTS.format,
  };
}
