import { Command } from 'commander';
import { createRequire } from 'module';
import { checkCommand } from './commands/check.js';
import { installHookCommand } from './commands/install-hook.js';

const require = createRequire(import.meta.url);
const { version } = require('../../package.json');

const program = new Command();

program
  .name('specguard')
  .description('PR gating for spec coverage — checks that code changes have associated specs')
  .version(version);

program.addCommand(checkCommand);
program.addCommand(installHookCommand);

program.parse();
