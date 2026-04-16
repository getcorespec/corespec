import chalk from 'chalk';
import type { PipelineResult } from './pipeline.js';

export function formatJson(result: PipelineResult): string {
  const output = {
    framework: {
      detected: result.framework.framework,
      confidence: result.framework.confidence,
      signals: result.signals.signals.map(s => s.signal),
    },
    coverage: result.diff.files.map(f => ({
      file: f.file,
      score: f.score,
      pass: f.pass,
      reason: f.reason,
    })),
    result: result.diff.result,
    threshold: result.diff.threshold,
  };

  return JSON.stringify(output, null, 2);
}

export function formatHuman(result: PipelineResult): string {
  const lines: string[] = [];

  lines.push('');
  lines.push('  Framework Detection');
  lines.push('  ' + '\u2500'.repeat(35));

  if (result.framework.framework !== 'none') {
    const conf = result.framework.confidence.toFixed(2);
    lines.push(`  ${result.framework.framework.padEnd(20)} ${conf}   detected`);
  } else {
    lines.push('  No spec framework detected');
  }

  lines.push('');
  lines.push(`  Spec Coverage (threshold: ${result.diff.threshold})`);
  lines.push('  ' + '\u2500'.repeat(35));

  for (const file of result.diff.files) {
    const score = file.score.toFixed(2);
    const icon = file.pass ? chalk.green('\u2713') : chalk.red('\u2717');
    const name = file.file.length > 40 ? '\u2026' + file.file.slice(-39) : file.file;
    lines.push(`  ${name.padEnd(41)} ${score}  ${icon}`);
    if (file.reason) {
      lines.push(chalk.dim(`    ${file.reason}`));
    }
  }

  lines.push('');
  const failCount = result.diff.files.filter(f => !f.pass).length;
  const total = result.diff.files.length;

  if (result.diff.result === 'pass') {
    lines.push(`  Result: ${chalk.green('PASS')}`);
    lines.push(`  All ${total} files meet threshold`);
  } else {
    lines.push(`  Result: ${chalk.red('FAIL')}`);
    lines.push(`  ${failCount} of ${total} files below threshold`);
  }

  lines.push('');
  return lines.join('\n');
}
