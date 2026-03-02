import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

export interface SpecguardConfig {
  model: string;
  threshold: number;
}

interface LoadConfigOptions {
  cwd?: string;
  model?: string;
  threshold?: number;
  configPath?: string;
}

const DEFAULTS: SpecguardConfig = {
  model: 'anthropic/claude-sonnet-4-20250514',
  threshold: 0.7,
};

function loadYamlConfig(filePath: string): Partial<SpecguardConfig> {
  if (!existsSync(filePath)) return {};

  const content = readFileSync(filePath, 'utf-8');
  const result: Partial<SpecguardConfig> = {};

  for (const line of content.split('\n')) {
    const match = line.match(/^(\w+):\s*(.+)$/);
    if (!match) continue;
    const [, key, value] = match;
    if (key === 'model') result.model = value.trim();
    if (key === 'threshold') result.threshold = parseFloat(value.trim());
  }

  return result;
}

// Precedence: CLI flags > env vars > .specguard.yml > defaults
export function loadConfig(options: LoadConfigOptions = {}): SpecguardConfig {
  const cwd = options.cwd ?? process.cwd();
  const configPath = options.configPath ?? join(cwd, '.specguard.yml');

  const fileConfig = loadYamlConfig(configPath);

  const envModel = process.env.SPECGUARD_MODEL || undefined;

  return {
    model: options.model ?? envModel ?? fileConfig.model ?? DEFAULTS.model,
    threshold: options.threshold ?? fileConfig.threshold ?? DEFAULTS.threshold,
  };
}
