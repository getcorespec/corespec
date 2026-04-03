import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

export interface SpecguardConfig {
  model: string;
  threshold: number;
  baseURL?: string;
  ignore: string[];
}

interface LoadConfigOptions {
  cwd?: string;
  model?: string;
  threshold?: number;
  configPath?: string;
}

const DEFAULTS: SpecguardConfig = {
  model: 'anthropic/claude-haiku-4-5-20251001',
  threshold: 0.7,
  ignore: [],
};

function loadYamlConfig(filePath: string): Partial<SpecguardConfig> {
  if (!existsSync(filePath)) return {};

  const content = readFileSync(filePath, 'utf-8');
  const result: Partial<SpecguardConfig> = {};
  let currentListKey: string | null = null;

  for (const line of content.split('\n')) {
    // Skip comments and blank lines
    if (line.match(/^\s*#/) || line.trim() === '') {
      continue;
    }

    // List item (e.g. "  - *.md")
    const listMatch = line.match(/^\s+-\s+(.+)$/);
    if (listMatch && currentListKey) {
      const value = listMatch[1].trim().replace(/^["']|["']$/g, '');
      if (currentListKey === 'ignore') {
        (result.ignore ??= []).push(value);
      }
      continue;
    }

    // Key with no inline value — starts a list (e.g. "ignore:")
    const listKeyMatch = line.match(/^(\w+):\s*$/);
    if (listKeyMatch) {
      currentListKey = listKeyMatch[1];
      continue;
    }

    // Key-value pair (e.g. "model: anthropic/claude-haiku-4-5-20251001")
    currentListKey = null;
    const match = line.match(/^(\w+):\s*(.+)$/);
    if (!match) continue;
    const [, key, value] = match;
    if (key === 'model') result.model = value.trim();
    if (key === 'threshold') result.threshold = parseFloat(value.trim());
    if (key === 'baseURL') result.baseURL = value.trim();
  }

  return result;
}

// Precedence: CLI flags > .specguard.yml > defaults
export function loadConfig(options: LoadConfigOptions = {}): SpecguardConfig {
  const cwd = options.cwd ?? process.cwd();
  const configPath = options.configPath ?? join(cwd, '.specguard.yml');

  const fileConfig = loadYamlConfig(configPath);

  return {
    model: options.model ?? fileConfig.model ?? DEFAULTS.model,
    threshold: options.threshold ?? fileConfig.threshold ?? DEFAULTS.threshold,
    baseURL: fileConfig.baseURL,
    ignore: fileConfig.ignore ?? DEFAULTS.ignore,
  };
}
