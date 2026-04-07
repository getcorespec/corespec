import { Command } from 'commander';
import { existsSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

const PRE_PUSH_HOOK_SCRIPT = `#!/bin/sh
# specguard pre-push hook
# Checks spec coverage for all commits being pushed
z40="0000000000000000000000000000000000000000"
while IFS=' ' read local_ref local_sha remote_ref remote_sha; do
  [ "$local_sha" = "$z40" ] && continue
  if [ "$remote_sha" = "$z40" ]; then
    base=$(git merge-base HEAD origin/main 2>/dev/null || \\
           git merge-base HEAD origin/master 2>/dev/null || \\
           git rev-list --max-parents=0 HEAD)
    range="\${base}..\${local_sha}"
  else
    range="\${remote_sha}..\${local_sha}"
  fi
  npx specguard check "$range" || exit 1
done
`;

const PRE_COMMIT_HOOK_SCRIPT = `#!/bin/sh
# specguard pre-commit hook
# Checks spec coverage for staged changes
npx specguard check --staged
`;

const installHookCommand = new Command('install')
  .description('Install specguard as a git hook (pre-push by default)')
  .option('--force', 'overwrite existing hook')
  .option('--pre-commit', 'install as a pre-commit hook instead of pre-push')
  .action((options) => {
    let repoRoot: string;
    try {
      repoRoot = execSync('git rev-parse --show-toplevel', { encoding: 'utf-8' }).trim();
    } catch {
      console.error('Error: not inside a git repository');
      process.exit(1);
    }

    const hooksDir = join(repoRoot, '.git', 'hooks');
    const hookType = options.preCommit ? 'pre-commit' : 'pre-push';
    const hookPath = join(hooksDir, hookType);
    const hookScript = options.preCommit ? PRE_COMMIT_HOOK_SCRIPT : PRE_PUSH_HOOK_SCRIPT;

    if (!existsSync(hooksDir)) {
      mkdirSync(hooksDir, { recursive: true });
    }

    if (existsSync(hookPath) && !options.force) {
      console.error(
        `Error: ${hookPath} already exists. Use --force to overwrite.`,
      );
      process.exit(1);
    }

    writeFileSync(hookPath, hookScript, { mode: 0o755 });
    if (options.preCommit) {
      console.log(`Installed pre-commit hook at ${hookPath}`);
      console.log('specguard will now check staged changes before each commit.');
    } else {
      console.log(`Installed pre-push hook at ${hookPath}`);
      console.log('specguard will now check spec coverage before each push.');
    }
  });

export const hookCommand = new Command('hook')
  .description('Manage git hooks for specguard')
  .addCommand(installHookCommand);
