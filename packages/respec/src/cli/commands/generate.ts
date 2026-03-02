import { Command } from 'commander';
import { execSync } from 'child_process';
import { mkdirSync, writeFileSync } from 'fs';
import { dirname, join, resolve } from 'path';
import chalk from 'chalk';
import { loadConfig } from '../../core/config.js';
import { runPipeline, type GeneratedSpec } from '../../core/pipeline.js';

function formatHuman(specs: GeneratedSpec[], dryRun: boolean): string {
  if (specs.length === 0) return chalk.yellow('No specs generated.');

  const label = dryRun ? 'Would generate' : 'Generated';
  const lines = [chalk.bold(`${label} ${specs.length} spec(s):\n`)];

  for (const spec of specs) {
    lines.push(`  ${chalk.green(spec.specPath)} ${chalk.dim(`← ${spec.file}`)}`);
  }

  return lines.join('\n');
}

function formatJson(specs: GeneratedSpec[]): string {
  return JSON.stringify(specs, null, 2);
}

export const generateCommand = new Command('generate')
  .description('Generate specs for source files')
  .argument('[path]', 'target path to generate specs for', '.')
  .option('--model <model>', 'LLM model (e.g. anthropic/claude-sonnet-4-20250514)')
  .option('--output-dir <dir>', 'output directory for generated specs')
  .option('--output <format>', 'output format: human or json', 'human')
  .option('--config <path>', 'config file path')
  .option('--dry-run', 'show what would be generated without writing files')
  .action(async (targetPath: string, options) => {
    const config = loadConfig({
      model: options.model,
      outputDir: options.outputDir,
      configPath: options.config,
    });

    let repoRoot: string;
    try {
      repoRoot = execSync('git rev-parse --show-toplevel', { encoding: 'utf-8' }).trim();
    } catch {
      console.error('Error: not inside a git repository');
      process.exit(1);
    }

    const resolvedTarget = resolve(targetPath);

    const result = await runPipeline({
      repoRoot,
      targetPath: resolvedTarget,
      model: config.model,
      outputDir: config.outputDir,
    });

    if (!options.dryRun) {
      for (const spec of result.specs) {
        const fullPath = join(repoRoot, spec.specPath);
        mkdirSync(dirname(fullPath), { recursive: true });
        writeFileSync(fullPath, spec.content, 'utf-8');
      }
    }

    if (options.output === 'json') {
      console.log(formatJson(result.specs));
    } else {
      console.log(formatHuman(result.specs, !!options.dryRun));
    }
  });
