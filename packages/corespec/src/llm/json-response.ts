/**
 * Utilities for parsing JSON responses from LLM calls.
 *
 * LLMs frequently wrap JSON in markdown code fences or add conversational
 * prose before/after the object, even when explicitly told not to. These
 * helpers extract the first balanced JSON object from such responses and
 * wrap parse failures in an actionable error.
 */

/**
 * Extracts the first balanced JSON object from an LLM response string,
 * tolerating leading/trailing prose, markdown code fences, or commentary.
 *
 * Returns the trimmed original string if no `{` is found, so the caller's
 * `JSON.parse` produces a meaningful error location.
 */
export function extractJsonObject(raw: string): string {
  const stripped = raw.replace(/```(?:json)?\s*/g, '').replace(/\s*```/g, '');
  const start = stripped.indexOf('{');
  if (start === -1) return stripped.trim();

  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = start; i < stripped.length; i++) {
    const ch = stripped[i];
    if (inString) {
      if (escape) {
        escape = false;
      } else if (ch === '\\') {
        escape = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }
    if (ch === '"') {
      inString = true;
    } else if (ch === '{') {
      depth++;
    } else if (ch === '}') {
      depth--;
      if (depth === 0) {
        return stripped.slice(start, i + 1);
      }
    }
  }
  return stripped.slice(start).trim();
}

/**
 * Thrown when an LLM returns a response that cannot be parsed as JSON.
 * Carries the raw response, model name, and underlying parse error so
 * callers can surface actionable messages instead of bare `SyntaxError`s.
 */
export class LlmJsonParseError extends Error {
  public readonly rawResponse: string;
  public readonly model: string;
  public readonly parseError: string;

  constructor(parseError: string, rawResponse: string, model: string) {
    const preview = rawResponse.trim().slice(0, 200).replace(/\s+/g, ' ');
    const suffix = rawResponse.length > 200 ? '…' : '';
    super(
      `LLM returned a non-JSON response (model: ${model}). ` +
        `JSON parse error: ${parseError}. ` +
        `Response preview: "${preview}${suffix}". ` +
        `The model likely ignored the JSON-only instruction. Try a more capable model ` +
        `(e.g. claude-sonnet-4) or reduce the prompt size by tightening the ignore list in .specguard.yml.`,
    );
    this.name = 'LlmJsonParseError';
    this.rawResponse = rawResponse;
    this.model = model;
    this.parseError = parseError;
  }
}

/**
 * Extracts and parses a JSON object from an LLM response, wrapping any
 * parse failure in {@link LlmJsonParseError} with full context.
 */
export function parseLlmJson<T = unknown>(raw: string, model: string): T {
  const extracted = extractJsonObject(raw);
  try {
    return JSON.parse(extracted) as T;
  } catch (err) {
    const parseMessage = err instanceof Error ? err.message : String(err);
    throw new LlmJsonParseError(parseMessage, raw, model);
  }
}
