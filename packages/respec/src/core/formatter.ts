import chalk from 'chalk';
import type { FrameworkCheckResult, FrameworkJudgment } from '@getcorespec/corespec';
import type { GeneratedSpec } from './generator.js';

export interface PipelineResult {
  signals: FrameworkCheckResult;
  framework: FrameworkJudgment;
  specs: GeneratedSpec[];
}

export function formatJson(result: PipelineResult): string {
  const output = {
    framework: {
      detected: result.framework.framework,
      confidence: result.framework.confidence,
      signals: result.signals.signals.map((s) => s.signal),
    },
    specs: result.specs.map((s) => ({
      file: s.file,
      specPath: s.specPath,
      content: s.content,
    })),
    count: result.specs.length,
  };

  return JSON.stringify(output, null, 2);
}

export function formatHuman(result: PipelineResult): string {
  const lines: string[] = [];

  lines.push('');
  lines.push('  Framework Detection');
  lines.push('  ' + '─'.repeat(35));

  if (result.framework.framework !== 'none') {
    const conf = result.framework.confidence.toFixed(2);
    lines.push(
      `  ${result.framework.framework.padEnd(20)} ${conf}   detected`,
    );
  } else {
    lines.push('  No spec framework detected');
  }

  lines.push('');
  lines.push('  Generated Specs');
  lines.push('  ' + '─'.repeat(35));

  for (const spec of result.specs) {
    lines.push(
      `  ${spec.file.padEnd(20)} → ${spec.specPath.padEnd(25)} ${chalk.green('✓')}`,
    );
  }

  lines.push('');
  lines.push(
    `  Result: ${chalk.green(`${result.specs.length} specs generated`)}`,
  );
  lines.push('');

  return lines.join('\n');
}
