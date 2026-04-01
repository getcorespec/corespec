import { Command } from 'commander';
import { execSync } from 'child_process';
import { loadConfig } from '../../core/config.js';
import { runPipeline } from '../../core/pipeline.js';
import { formatHuman, formatJson } from '../../core/formatter.js';

export const checkCommand = new Command('check')
  .description('Check spec coverage for a git diff range')
  .argument('[diff-range]', 'git diff range (e.g. main..HEAD)', 'main..HEAD')
  .option('--model <model>', 'LLM model (e.g. anthropic/claude-sonnet-4-20250514)')
  .option('--threshold <number>', 'confidence threshold for pass/fail', parseFloat)
  .option('--output <format>', 'output format: human or json', 'human')
  .option('--config <path>', 'config file path')
  .option('--staged', 'check only staged changes (for use as a pre-commit hook)')
  .action(async (diffRange: string, options) => {
    const config = loadConfig({
      model: options.model,
      threshold: options.threshold,
      configPath: options.config,
    });

    let diff: string;
    try {
      if (options.staged) {
        diff = execSync('git diff --staged', { encoding: 'utf-8' });
      } else {
        diff = execSync(`git diff ${diffRange}`, { encoding: 'utf-8' });
      }
    } catch {
      const context = options.staged ? 'staged changes' : `range "${diffRange}"`;
      console.error(`Error: failed to get git diff for ${context}`);
      process.exit(1);
    }

    if (!diff.trim()) {
      const context = options.staged ? 'staged changes' : `range "${diffRange}"`;
      console.error(`No changes found in ${context}`);
      process.exit(0);
    }

    const repoRoot = execSync('git rev-parse --show-toplevel', { encoding: 'utf-8' }).trim();

    let result;
    try {
      result = await runPipeline({
        repoRoot,
        diff,
        model: config.model,
        threshold: config.threshold,
        baseURL: config.baseURL,
      });
    } catch (err: unknown) {
      if (err instanceof Error && 'statusCode' in err && (err as { statusCode: unknown }).statusCode === 401) {
        console.error('Error: invalid or missing API key. Set ANTHROPIC_API_KEY or OPENAI_API_KEY.');
      } else {
        console.error(`Error: LLM call failed — ${err instanceof Error ? err.message : String(err)}`);
      }
      process.exit(1);
    }

    if (options.output === 'json') {
      console.log(formatJson(result));
    } else {
      console.log(formatHuman(result));
    }

    process.exit(result.diff.result === 'pass' ? 0 : 1);
  });
