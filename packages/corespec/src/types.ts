/** A signal found by the heuristic check-framework tool */
export interface FrameworkSignal {
  /** What was found (e.g. "openspec/ directory", "openspec.config.ts") */
  signal: string;
  /** Which framework this signal suggests */
  framework: string;
  /** File path where the signal was found */
  path: string;
}

/** Output of check-framework (heuristic) */
export interface FrameworkCheckResult {
  /** All signals found in the repo */
  signals: FrameworkSignal[];
  /** Candidate framework names derived from signals */
  candidates: string[];
}

/** Output of judge-framework (LLM) */
export interface FrameworkJudgment {
  /** Detected framework name, or "none" */
  framework: string;
  /** Confidence score 0-1 */
  confidence: number;
  /** LLM's reasoning */
  reasoning: string;
}

/** Per-file coverage result from judge-diff */
export interface FileCoverage {
  /** File path from the diff */
  file: string;
  /** Spec coverage score 0-1 */
  score: number;
  /** Whether this file passes the threshold */
  pass: boolean;
  /** Explanation of what spec coverage is missing, if any */
  gap?: string;
}

/** Output of judge-diff (LLM) */
export interface DiffJudgment {
  /** Per-file coverage results */
  files: FileCoverage[];
  /** Overall result: pass or fail */
  result: 'pass' | 'fail';
  /** Threshold used for pass/fail */
  threshold: number;
}

/** Model configuration for LLM calls */
export interface ModelConfig {
  /** Model identifier (e.g. "anthropic/claude-sonnet-4-20250514", "openai/gpt-4o") */
  model: string;
  /** Optional base URL for custom or local endpoints. Works for both Anthropic and OpenAI providers
   * (e.g. self-hosted Anthropic, Ollama at http://localhost:11434/v1, LM Studio) */
  baseURL?: string;
}
