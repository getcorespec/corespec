import type { PipelineResult } from '@getcorespec/specguard';

// Maps a recognised spec framework to the repo directory holding its spec/plan
// documents. Used to build hyperlinks in the PR comment so reviewers can click
// through to the spec sources. Only frameworks with a known, verified convention
// are listed here — unrecognised frameworks render as plain text.
//
// - OpenSpec:    https://github.com/Fission-AI/OpenSpec
// - Kiro:        https://kiro.dev/docs/specs/
// - Superpowers: https://github.com/obra/superpowers
const FRAMEWORK_SPEC_DIRS: Record<string, string> = {
  openspec: 'openspec/specs',
  kiro: '.kiro/specs',
  superpowers: 'docs/superpowers/plans',
};

function renderFrameworkLink(framework: string, repoFullName?: string, headRef?: string): string {
  const dir = FRAMEWORK_SPEC_DIRS[framework];
  if (!dir || !repoFullName || !headRef || framework === 'none') return framework;
  return `[${framework}](https://github.com/${repoFullName}/tree/${headRef}/${dir})`;
}

export interface PrContext {
  repoFullName?: string;
  headRef?: string;
}

export function formatPrComment(result: PipelineResult, ctx: PrContext = {}): string {
  const passed = result.diff.result === 'pass';
  const icon = passed ? ':white_check_mark:' : ':x:';
  const title = passed ? 'specguard: PASS' : 'specguard: FAIL';

  const rows = result.diff.files.map((f) => {
    const status = f.pass ? ':white_check_mark:' : ':x:';
    const reason = f.reason || '-';
    return `| \`${f.file}\` | ${f.score} | ${status} | ${reason} |`;
  });

  const frameworkLink = renderFrameworkLink(result.framework.framework, ctx.repoFullName, ctx.headRef);

  return [
    `${icon} **${title}**`,
    '',
    `**Framework:** ${frameworkLink} (confidence: ${result.framework.confidence})`,
    `**Threshold:** ${result.diff.threshold}`,
    '',
    '| File | Score | Status | Reason |',
    '|------|-------|--------|--------|',
    ...rows,
  ].join('\n');
}

export function formatCheckRunOutput(result: PipelineResult, ctx: PrContext = {}): {
  title: string;
  summary: string;
  text: string;
} {
  const passed = result.diff.result === 'pass';
  const failCount = result.diff.files.filter((f) => !f.pass).length;
  const total = result.diff.files.length;

  const rows = result.diff.files.map((f) => {
    const status = f.pass ? '\u2705' : '\u274c';
    const reason = f.reason || '-';
    return `| \`${f.file}\` | ${f.score} | ${status} | ${reason} |`;
  });

  const frameworkLink = renderFrameworkLink(result.framework.framework, ctx.repoFullName, ctx.headRef);

  const text = [
    `**Framework:** ${frameworkLink} (confidence: ${result.framework.confidence})`,
    `**Threshold:** ${result.diff.threshold}`,
    '',
    '| File | Score | Status | Reason |',
    '|------|-------|--------|--------|',
    ...rows,
  ].join('\n');

  return {
    title: passed ? 'specguard: PASS' : 'specguard: FAIL',
    summary: passed
      ? `All ${total} files meet the ${result.diff.threshold} threshold.`
      : `${failCount} of ${total} files below the ${result.diff.threshold} threshold.`,
    text,
  };
}
