import { Command } from 'commander';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { version } = require('../../package.json');

const program = new Command();

program
  .name('respec')
  .description('Retroactive spec generation and verification for existing codebases')
  .version(version);

program.parse();
