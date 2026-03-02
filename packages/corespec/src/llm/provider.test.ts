import { describe, it, expect } from 'vitest';
import { parseModelId } from './provider.js';

describe('parseModelId', () => {
  it('parses anthropic model', () => {
    const result = parseModelId('anthropic/claude-sonnet-4-20250514');
    expect(result.provider).toBe('anthropic');
    expect(result.modelName).toBe('claude-sonnet-4-20250514');
  });

  it('parses openai model', () => {
    const result = parseModelId('openai/gpt-4o');
    expect(result.provider).toBe('openai');
    expect(result.modelName).toBe('gpt-4o');
  });

  it('defaults to anthropic when no provider prefix', () => {
    const result = parseModelId('claude-sonnet-4-20250514');
    expect(result.provider).toBe('anthropic');
    expect(result.modelName).toBe('claude-sonnet-4-20250514');
  });

  it('throws on unsupported provider', () => {
    expect(() => parseModelId('unsupported/model')).toThrow('Unsupported provider');
  });
});
