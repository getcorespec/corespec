import type { FrameworkJudgment, ModelConfig } from '@getcorespec/corespec';
import { callLLM } from '@getcorespec/corespec';
import ora from 'ora';
import path from 'node:path';

export interface GeneratedSpec {
  file: string;
  specPath: string;
  content: string;
}

function buildPrompt(
  file: { path: string; content: string },
  framework: FrameworkJudgment,
): string {
  const frameworkContext =
    framework.framework !== 'none'
      ? `The repository uses the "${framework.framework}" spec framework (confidence: ${framework.confidence}). ${framework.reasoning}`
      : 'No specific spec framework was detected. Use generic markdown specification format.';

  return `You are a spec generation tool. Given source code and information about the repository's spec framework, generate a structured specification document.

Framework context:
${frameworkContext}

Source file: ${file.path}

Source code:
${file.content}

Generate a specification in markdown that covers:
- Purpose: what the module does and why it exists
- Public API: exported functions, classes, types, and their signatures
- Behavior: expected behavior for key operations
- Edge cases: error handling, boundary conditions, invalid inputs
- Dependencies: external modules and services this code relies on

${framework.framework !== 'none' ? `Follow the "${framework.framework}" framework conventions for structure and terminology.` : 'Use clear markdown with descriptive headings.'}

Output raw markdown only. Do not wrap in code fences or JSON.`;
}

export function deriveSpecPath(filePath: string, outputDir: string): string {
  let relative = filePath;
  if (relative.startsWith('src/')) {
    relative = relative.slice(4);
  }

  const parsed = path.parse(relative);
  const specName = parsed.name + '.spec.md';
  return path.join(outputDir, parsed.dir, specName);
}

export async function generateSpecs(
  files: Array<{ path: string; content: string }>,
  framework: FrameworkJudgment,
  config: ModelConfig,
  outputDir: string,
): Promise<GeneratedSpec[]> {
  const specs: GeneratedSpec[] = [];
  const total = files.length;
  const spinner = ora(`Generating specs for ${total} file${total === 1 ? '' : 's'}`).start();

  // Sequential to avoid rate limits
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    spinner.text = `[${i + 1}/${total}] ${file.path}`;
    const prompt = buildPrompt(file, framework);
    const content = await callLLM(config, prompt);
    const specPath = deriveSpecPath(file.path, outputDir);

    specs.push({ file: file.path, specPath, content });
  }

  spinner.succeed(`Generated ${specs.length} spec${specs.length === 1 ? '' : 's'}`);
  return specs;
}
