import type { FrameworkCheckResult, FrameworkJudgment, ModelConfig } from '../types.js';
import { callLLM } from '../llm/provider.js';

function buildPrompt(checkResult: FrameworkCheckResult): string {
  const signalList = checkResult.signals.length > 0
    ? checkResult.signals.map(s => `- ${s.signal} (path: ${s.path})`).join('\n')
    : '- No signals found';

  return `You are a spec framework detection tool. Given the following signals found in a repository, determine which spec framework or protocol is in use.

Known frameworks:
- openspec: OpenSpec by Fission-AI — in-repo specs as markdown with GIVEN/WHEN/THEN scenarios
- superpowers: Claude Code Superpowers — skills, agents, and plans in .claude/ directory
- kiro: AWS Kiro — requirements-driven development with kiro.config files
- spec-kit: GitHub Spec Kit — spec-first workflow toolkit
- generic: Generic spec patterns (specs/ directory, *.spec.md files)
- none: No spec framework detected

Signals found:
${signalList}

Candidate frameworks: ${checkResult.candidates.length > 0 ? checkResult.candidates.join(', ') : 'none'}

Respond with ONLY a JSON object (no markdown, no code fences):
{
  "framework": "<framework name or 'none'>",
  "confidence": <0.0 to 1.0>,
  "reasoning": "<brief explanation>"
}`;
}

export async function judgeFramework(
  checkResult: FrameworkCheckResult,
  config: ModelConfig,
): Promise<FrameworkJudgment> {
  const prompt = buildPrompt(checkResult);
  const response = await callLLM(config, prompt);

  const parsed = JSON.parse(response) as FrameworkJudgment;

  return {
    framework: parsed.framework ?? 'none',
    confidence: Math.max(0, Math.min(1, parsed.confidence ?? 0)),
    reasoning: parsed.reasoning ?? '',
  };
}
