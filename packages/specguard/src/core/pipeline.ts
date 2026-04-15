import {
  checkFramework,
  judgeFramework,
  judgeDiff,
  loadSpecs,
  type FrameworkCheckResult,
  type FrameworkJudgment,
  type DiffJudgment,
} from '@getcorespec/corespec';

export interface PipelineOptions {
  repoRoot: string;
  diff: string;
  model: string;
  threshold: number;
  baseURL?: string;
  ignore?: string[];
}

export interface PipelineResult {
  signals: FrameworkCheckResult;
  framework: FrameworkJudgment;
  diff: DiffJudgment;
}

export async function runPipeline(options: PipelineOptions): Promise<PipelineResult> {
  const signals = checkFramework(options.repoRoot);

  const modelConfig = { model: options.model, baseURL: options.baseURL };

  const framework = await judgeFramework(signals, modelConfig);

  const specs = loadSpecs(options.repoRoot, framework.framework);

  const diff = await judgeDiff(framework, options.diff, modelConfig, options.threshold, options.ignore, specs);

  return { signals, framework, diff };
}
