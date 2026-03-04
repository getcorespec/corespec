export const VERSION = '0.0.1';

export { runPipeline, type PipelineOptions, type PipelineResult } from './core/pipeline.js';
export { loadConfig, type SpecguardConfig } from './core/config.js';
export { formatJson, formatHuman } from './core/formatter.js';
