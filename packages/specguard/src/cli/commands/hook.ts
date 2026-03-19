import { Command } from 'commander';
import { existsSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

const HOOK_SCRIPT = `#!/bin/sh
npx specguard check --staged
`;

const installHookCommand = new Command('install')
  .description('Install specguard as a git pre-commit hook')
  .option('--force', 'overwrite existing pre-commit hook')
  .action((options) => {
    let repoRoot: string;
    try {
      repoRoot = execSync('git rev-parse --show-toplevel', { encoding: 'utf-8' }).trim();
    } catch {
      console.error('Error: not inside a git repository');
      process.exit(1);
    }

    const hooksDir = join(repoRoot, '.git', 'hooks');
    const hookPath = join(hooksDir, 'pre-commit');

    if (!existsSync(hooksDir)) {
      mkdirSync(hooksDir, { recursive: true });
    }

    if (existsSync(hookPath) && !options.force) {
      console.error(
        `Error: ${hookPath} already exists. Use --force to overwrite.`,
      );
      process.exit(1);
    }

    writeFileSync(hookPath, HOOK_SCRIPT, { mode: 0o755 });
    console.log(`Installed pre-commit hook at ${hookPath}`);
    console.log('specguard will now check staged changes before each commit.');
  });

export const hookCommand = new Command('hook')
  .description('Manage git hooks for specguard')
  .addCommand(installHookCommand);
