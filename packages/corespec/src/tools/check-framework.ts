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
    framework: 'superpowers',
    check: (root) => {
      const signals: FrameworkSignal[] = [];
      const skillsDir = join(root, '.claude', 'skills');
      if (existsSync(skillsDir) && statSync(skillsDir).isDirectory()) {
        signals.push({ signal: '.claude/skills/ directory', framework: 'superpowers', path: '.claude/skills/' });
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
  {
    framework: 'generic',
    check: (root) => {
      const signals: FrameworkSignal[] = [];
      const specsDir = join(root, 'specs');
      if (existsSync(specsDir) && statSync(specsDir).isDirectory()) {
        signals.push({ signal: 'specs/ directory', framework: 'generic', path: 'specs/' });
      }
      const docsSpecsDir = join(root, 'docs', 'specs');
      if (existsSync(docsSpecsDir) && statSync(docsSpecsDir).isDirectory()) {
        signals.push({ signal: 'docs/specs/ directory', framework: 'generic', path: 'docs/specs/' });
      }
      for (const name of safeReaddir(root)) {
        const fullPath = join(root, name);
        if (statSync(fullPath).isDirectory()) {
          for (const file of safeReaddir(fullPath)) {
            if (file.match(/\.spec\.md$/) || file.match(/\.requirements\.md$/)) {
              const relPath = join(name, file);
              signals.push({ signal: `${relPath} spec file`, framework: 'generic', path: relPath });
            }
          }
        }
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
