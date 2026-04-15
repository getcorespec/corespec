import { readdirSync, readFileSync, statSync, existsSync } from 'fs';
import { join, relative } from 'path';
import type { SpecDocument } from '../types.js';

function walkMarkdown(root: string, dir: string, out: string[]): void {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      walkMarkdown(root, full, out);
    } else if (name.endsWith('.md')) {
      out.push(full);
    }
  }
}

/** Load spec documents for a given framework from the repository. */
export function loadSpecs(repoRoot: string, framework: string): SpecDocument[] {
  const specsDir = framework === 'openspec'
    ? join(repoRoot, 'openspec', 'specs')
    : null;

  if (!specsDir || !existsSync(specsDir)) return [];

  const paths: string[] = [];
  walkMarkdown(repoRoot, specsDir, paths);

  return paths.map(p => ({
    path: relative(repoRoot, p),
    content: readFileSync(p, 'utf-8'),
  }));
}
