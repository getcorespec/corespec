import { describe, it, expect } from 'vitest';
import { extractJsonObject, parseLlmJson, LlmJsonParseError } from './json-response.js';

describe('extractJsonObject', () => {
  it('extracts a plain JSON object', () => {
    expect(extractJsonObject('{"a":1}')).toBe('{"a":1}');
  });

  it('strips markdown code fences', () => {
    expect(extractJsonObject('```json\n{"a":1}\n```')).toBe('{"a":1}');
  });

  it('ignores leading prose', () => {
    expect(extractJsonObject('Here is my answer:\n{"a":1}')).toBe('{"a":1}');
  });

  it('ignores trailing prose after the JSON object', () => {
    expect(extractJsonObject('{"a":1}\n\nLet me know if you need more.')).toBe('{"a":1}');
  });

  it('handles nested objects', () => {
    expect(extractJsonObject('junk { "a": { "b": 1 } } trailing')).toBe('{ "a": { "b": 1 } }');
  });

  it('ignores braces inside strings', () => {
    expect(extractJsonObject('{"a":"has { brace"}')).toBe('{"a":"has { brace"}');
  });
});

describe('parseLlmJson', () => {
  it('parses a valid JSON response', () => {
    const result = parseLlmJson<{ a: number }>('{"a":1}', 'test-model');
    expect(result).toEqual({ a: 1 });
  });

  it('parses through markdown fences and prose', () => {
    const raw = 'Sure, here you go:\n```json\n{"a":1}\n```\nHope that helps!';
    expect(parseLlmJson(raw, 'test-model')).toEqual({ a: 1 });
  });

  it('throws LlmJsonParseError with actionable context on unparseable response', () => {
    const bogus = '# Coverage Analysis\n\nI reviewed the diff and here are my findings.';
    try {
      parseLlmJson(bogus, 'anthropic/claude-haiku-4-5');
      expect.fail('expected parseLlmJson to throw');
    } catch (err) {
      expect(err).toBeInstanceOf(LlmJsonParseError);
      const typed = err as LlmJsonParseError;
      expect(typed.model).toBe('anthropic/claude-haiku-4-5');
      expect(typed.rawResponse).toBe(bogus);
      expect(typed.message).toContain('claude-haiku-4-5');
      expect(typed.message).toContain('Coverage Analysis');
      expect(typed.message).toContain('Try a more capable model');
    }
  });
});
