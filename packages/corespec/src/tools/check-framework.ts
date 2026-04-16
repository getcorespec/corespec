import { readdirSync, existsSync, statSync } from 'fs';
import { join } from 'path';
import type { FrameworkCheckResult, FrameworkSignal } from '../types.js';

interface FrameworkPattern {
  framework: string;
  check: (repoRoot: string) => FrameworkSignal[];
}

const patterns: FrameworkPattern[] = [
  {
    framework: 'openspec',
    check: (root) => {
      const signals: FrameworkSignal[] = [];
      const dir = join(root, 'openspec');
      if (existsSync(dir) && statSync(dir).isDirectory()) {
        signals.push({ signal: 'openspec/ directory', framework: 'openspec', path: 'openspec/' });
      }
      for (const name of safeReaddir(root)) {
        if (name.match(/^openspec\.config\./)) {
          signals.push({ signal: `${name} config file`, framework: 'openspec', path: name });
        }
      }
      return signals;
    },
  },
  {
    // Superpowers plans/specs live under docs/superpowers/ per obra/superpowers
    // convention. Avoid matching on .claude/skills/ — that directory is present
    // for any Claude Code plugin, not just superpowers.
    framework: 'superpowers',
    check: (root) => {
      const signals: FrameworkSignal[] = [];
      const plansDir = join(root, 'docs', 'superpowers', 'plans');
      if (existsSync(plansDir) && statSync(plansDir).isDirectory()) {
        signals.push({ signal: 'docs/superpowers/plans/ directory', framework: 'superpowers', path: 'docs/superpowers/plans/' });
      }
      const specsDir = join(root, 'docs', 'superpowers', 'specs');
      if (existsSync(specsDir) && statSync(specsDir).isDirectory()) {
        signals.push({ signal: 'docs/superpowers/specs/ directory', framework: 'superpowers', path: 'docs/superpowers/specs/' });
      }
      return signals;
    },
  },
  {
    framework: 'kiro',
    check: (root) => {
      const signals: FrameworkSignal[] = [];
      for (const name of safeReaddir(root)) {
        if (name.match(/^kiro\.config\./)) {
          signals.push({ signal: `${name} config file`, framework: 'kiro', path: name });
        }
      }
      const specsDir = join(root, '.kiro', 'specs');
      if (existsSync(specsDir) && statSync(specsDir).isDirectory()) {
        signals.push({ signal: '.kiro/specs/ directory', framework: 'kiro', path: '.kiro/specs/' });
      }
      return signals;
    },
  },
];

function safeReaddir(dir: string): string[] {
  try {
    return readdirSync(dir);
  } catch {
    return [];
  }
}

export function checkFramework(repoRoot: string): FrameworkCheckResult {
  const signals: FrameworkSignal[] = [];

  for (const pattern of patterns) {
    signals.push(...pattern.check(repoRoot));
  }

  const candidates = [...new Set(signals.map(s => s.framework))];

  return { signals, candidates };
}
