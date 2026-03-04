import type { PipelineResult } from '@getcorespec/specguard';

export function formatPrComment(result: PipelineResult): string {
  const passed = result.diff.result === 'pass';
  const icon = passed ? ':white_check_mark:' : ':x:';
  const title = passed ? 'specguard: PASS' : 'specguard: FAIL';

  const rows = result.diff.files.map((f) => {
    const status = f.pass ? ':white_check_mark:' : ':x:';
    const gap = f.gap ?? '-';
    return `| \`${f.file}\` | ${f.score} | ${status} | ${gap} |`;
  });

  return [
    `${icon} **${title}**`,
    '',
    `**Framework:** ${result.framework.framework} (confidence: ${result.framework.confidence})`,
    `**Threshold:** ${result.diff.threshold}`,
    '',
    '| File | Score | Status | Gap |',
    '|------|-------|--------|-----|',
    ...rows,
  ].join('\n');
}

export function formatCheckRunOutput(result: PipelineResult): {
  title: string;
  summary: string;
} {
  const passed = result.diff.result === 'pass';
  const failCount = result.diff.files.filter((f) => !f.pass).length;
  const total = result.diff.files.length;

  return {
    title: passed ? 'specguard: PASS' : 'specguard: FAIL',
    summary: passed
      ? `All ${total} files meet the ${result.diff.threshold} threshold.`
      : `${failCount} of ${total} files below the ${result.diff.threshold} threshold.`,
  };
}
