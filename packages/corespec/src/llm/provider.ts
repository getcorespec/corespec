import { generateText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { openai } from '@ai-sdk/openai';
import type { ModelConfig } from '../types.js';

const SUPPORTED_PROVIDERS = ['anthropic', 'openai'] as const;
type Provider = (typeof SUPPORTED_PROVIDERS)[number];

export interface ParsedModel {
  provider: Provider;
  modelName: string;
}

export function parseModelId(modelId: string): ParsedModel {
  const parts = modelId.split('/');
  if (parts.length === 1) {
    return { provider: 'anthropic', modelName: parts[0] };
  }
  const provider = parts[0] as Provider;
  if (!SUPPORTED_PROVIDERS.includes(provider)) {
    throw new Error(
      `Unsupported provider: ${provider}. Supported: ${SUPPORTED_PROVIDERS.join(', ')}`,
    );
  }
  return { provider, modelName: parts.slice(1).join('/') };
}

function getModel(parsed: ParsedModel) {
  switch (parsed.provider) {
    case 'anthropic':
      return anthropic(parsed.modelName);
    case 'openai':
      return openai(parsed.modelName);
  }
}

export async function callLLM(config: ModelConfig, prompt: string): Promise<string> {
  const parsed = parseModelId(config.model);
  const model = getModel(parsed);

  const { text } = await generateText({
    model,
    prompt,
  });

  return text;
}
