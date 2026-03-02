import {
  checkFramework,
  judgeFramework,
  judgeDiff,
  type FrameworkCheckResult,
  type FrameworkJudgment,
  type DiffJudgment,
} from '@getcorespec/corespec';

export interface PipelineOptions {
  repoRoot: string;
  diff: string;
  model: string;
  threshold: number;
}

export interface PipelineResult {
  signals: FrameworkCheckResult;
  framework: FrameworkJudgment;
  diff: DiffJudgment;
}

export async function runPipeline(options: PipelineOptions): Promise<PipelineResult> {
  const signals = checkFramework(options.repoRoot);

  const framework = await judgeFramework(signals, { model: options.model });

  const diff = await judgeDiff(framework, options.diff, { model: options.model }, options.threshold);

  return { signals, framework, diff };
}
