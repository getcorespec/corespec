import type { FrameworkJudgment, DiffJudgment, ModelConfig, SpecDocument } from '../types.js';
import { callLLM } from '../llm/provider.js';
import picomatch from 'picomatch';

/** Split a unified diff into per-file hunks and drop files matching ignore patterns. */
export function filterDiff(diff: string, ignore: string[]): string {
  if (ignore.length === 0) return diff;

  const isIgnored = picomatch(ignore, { matchBase: true });
  const fileRegex = /^diff --git a\/(.+?) b\//;

  const hunks: string[] = [];
  let current: string[] = [];
  let currentIgnored = false;

  for (const line of diff.split('\n')) {
    const match = line.match(fileRegex);
    if (match) {
      if (current.length > 0 && !currentIgnored) {
        hunks.push(current.join('\n'));
      }
      current = [line];
      currentIgnored = isIgnored(match[1]);
    } else {
      current.push(line);
    }
  }

  if (current.length > 0 && !currentIgnored) {
    hunks.push(current.join('\n'));
  }

  return hunks.join('\n');
}

function buildPrompt(
  framework: FrameworkJudgment,
  diff: string,
  threshold: number,
  specs: SpecDocument[],
): string {
  const frameworkContext = framework.framework !== 'none'
    ? `The repository uses the "${framework.framework}" spec framework (confidence: ${framework.confidence}). ${framework.reasoning}`
    : 'No specific spec framework was detected in this repository.';

  const specsSection = specs.length > 0
    ? `\nExisting spec documents in the repository:\n${specs.map(s => `--- ${s.path} ---\n${s.content}`).join('\n\n')}\n`
    : '';

  return `You are a spec coverage analysis tool. Given a git diff and information about the repository's spec framework, evaluate whether each changed file has adequate specification coverage.

Framework context:
${frameworkContext}
${specsSection}
Pass/fail threshold: ${threshold} (files scoring below this fail)

Git diff:
${diff}

For each changed file in the diff, evaluate:
1. Does this file have an associated spec that covers its behavior? Check the existing spec documents above — a file is covered if a spec describes its behavior, even if the spec lives elsewhere in the tree.
2. How confident are you that the spec coverage is adequate? (0.0 = no coverage, 1.0 = fully specified)
3. Provide a one-line reason explaining the score — for passing files, name the covering spec or explain why no spec is needed (e.g. "covered by hook-install spec", "test file, self-documenting", "structural change, no behavior"). For failing files, describe the gap.

Structural or wiring changes that don't alter behavior — such as re-exports in barrel/index files, import path changes, or dependency version bumps — do not require spec coverage. Score these 1.0.

Test files (e.g. *.test.ts, *.spec.ts) are self-documenting and do not require separate specs. Score these 1.0 with reason "test file, self-documenting".

Respond with ONLY a JSON object (no markdown, no code fences):
{
  "files": [
    {
      "file": "<file path>",
      "score": <0.0 to 1.0>,
      "pass": <true if score >= threshold>,
      "reason": "<one-line explanation of the score>"
    }
  ],
  "result": "<'pass' if all files pass, 'fail' if any file fails>",
  "threshold": ${threshold}
}`;
}

export async function judgeDiff(
  framework: FrameworkJudgment,
  diff: string,
  config: ModelConfig,
  threshold: number,
  ignore: string[] = [],
  specs: SpecDocument[] = [],
): Promise<DiffJudgment> {
  const filteredDiff = filterDiff(diff, ignore);

  if (!filteredDiff.trim()) {
    return { files: [], result: 'pass', threshold };
  }

  const prompt = buildPrompt(framework, filteredDiff, threshold, specs);
  const raw = await callLLM(config, prompt);
  const response = raw.replace(/^```(?:json)?\s*\n?/gm, '').replace(/\n?```\s*$/gm, '').trim();

  const parsed = JSON.parse(response) as { files?: Array<{ file: string; score?: number; reason?: string; gap?: string }>; threshold?: number };

  const files = (parsed.files ?? []).map(f => ({
    file: f.file,
    score: Math.max(0, Math.min(1, f.score ?? 0)),
    pass: (f.score ?? 0) >= threshold,
    reason: f.reason ?? f.gap ?? '',
  }));

  const result = files.every(f => f.pass) ? 'pass' as const : 'fail' as const;

  return { files, result, threshold };
}
