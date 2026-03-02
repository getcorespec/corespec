import { readFileSync } from 'fs';
import { join, relative } from 'path';
import { glob } from 'glob';
import {
  checkFramework,
  judgeFramework,
  type FrameworkCheckResult,
  type FrameworkJudgment,
} from '@getcorespec/corespec';
import { generateSpecs, type GeneratedSpec } from './generator.js';

export type { GeneratedSpec };

export interface PipelineOptions {
  repoRoot: string;
  targetPath: string;
  model: string;
  outputDir: string;
}

export interface PipelineResult {
  signals: FrameworkCheckResult;
  framework: FrameworkJudgment;
  specs: GeneratedSpec[];
}

export async function runPipeline(options: PipelineOptions): Promise<PipelineResult> {
  const signals = checkFramework(options.repoRoot);

  const framework = await judgeFramework(signals, { model: options.model });

  const pattern = '**/*.{ts,tsx,js,jsx}';
  const ignore = ['**/node_modules/**', '**/dist/**', '**/*.test.*', '**/*.spec.*'];

  const filePaths = await glob(pattern, {
    cwd: options.targetPath,
    ignore,
    absolute: true,
  });

  const files = filePaths.map((absPath) => ({
    path: relative(options.repoRoot, absPath),
    content: readFileSync(absPath, 'utf-8'),
  }));

  const specs = await generateSpecs(files, framework, { model: options.model }, options.outputDir);

  return { signals, framework, specs };
}
