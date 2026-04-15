import { Command } from 'commander';
import { createRequire } from 'module';
import { checkCommand } from './commands/check.js';
import { hookCommand } from './commands/hook.js';

const require = createRequire(import.meta.url);
const { version } = require('../../package.json');

// Set the terminal title to the invoked command (e.g. "specguard check") so
// terminal screenshots show exactly what's running. Skipped when not a TTY
// (CI logs, piped output) to avoid polluting captured output.
if (process.stdout.isTTY) {
  const subcommand = process.argv.slice(2).find((a) => !a.startsWith('-'));
  const title = subcommand ? `specguard ${subcommand}` : 'specguard';
  process.stdout.write(`\x1b]2;${title}\x07`);
}

const program = new Command();

program
  .name('specguard')
  .description('PR gating for spec coverage — checks that code changes have associated specs')
  .version(version);

program.addCommand(checkCommand);
program.addCommand(hookCommand);

program.parse();
