import { Command } from 'commander';
import { writeFileSync, existsSync, chmodSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

const HOOK_CONTENT = `#!/bin/sh
# specguard pre-commit hook
# Checks that staged changes have adequate spec coverage before committing.
# To skip: git commit --no-verify
npx specguard check --staged
`;

export const installHookCommand = new Command('install-hook')
  .description('Install specguard as a git pre-commit hook')
  .option('--force', 'overwrite existing pre-commit hook if one exists')
  .action((options) => {
    let repoRoot: string;
    try {
      repoRoot = execSync('git rev-parse --show-toplevel', { encoding: 'utf-8' }).trim();
    } catch {
      console.error('Error: not inside a git repository');
      process.exit(1);
    }

    const hookPath = join(repoRoot, '.git', 'hooks', 'pre-commit');

    if (existsSync(hookPath) && !options.force) {
      console.error(
        `Error: pre-commit hook already exists at ${hookPath}\nUse --force to overwrite.`,
      );
      process.exit(1);
    }

    writeFileSync(hookPath, HOOK_CONTENT, { encoding: 'utf-8' });
    chmodSync(hookPath, 0o755);

    console.log(`✓ Installed pre-commit hook at ${hookPath}`);
    console.log('  specguard will now check staged changes before each commit.');
    console.log('  To skip the hook for a commit: git commit --no-verify');
  });
