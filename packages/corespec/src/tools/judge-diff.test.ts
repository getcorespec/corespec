import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { FrameworkJudgment } from '../types.js';

vi.mock('../llm/provider.js', () => ({
  callLLM: vi.fn(),
}));

import { judgeDiff, filterDiff, extractJsonObject } from './judge-diff.js';
import { callLLM } from '../llm/provider.js';

const mockCallLLM = vi.mocked(callLLM);

const sampleDiff = `diff --git a/src/auth/login.ts b/src/auth/login.ts
index 1234567..abcdefg 100644
--- a/src/auth/login.ts
+++ b/src/auth/login.ts
@@ -1,3 +1,10 @@
+export function login(username: string, password: string) {
+  // login implementation
+}
diff --git a/src/auth/middleware.ts b/src/auth/middleware.ts
new file mode 100644
index 0000000..abcdefg
--- /dev/null
+++ b/src/auth/middleware.ts
@@ -0,0 +1,5 @@
+export function authMiddleware(req, res, next) {
+  // middleware implementation
+}`;

describe('filterDiff', () => {
  it('removes files matching ignore patterns', () => {
    const result = filterDiff(sampleDiff, ['*.ts']);
    expect(result.trim()).toBe('');
  });

  it('keeps files not matching ignore patterns', () => {
    const result = filterDiff(sampleDiff, ['*.md']);
    expect(result).toContain('src/auth/login.ts');
    expect(result).toContain('src/auth/middleware.ts');
  });

  it('selectively removes matching files', () => {
    const result = filterDiff(sampleDiff, ['**/middleware.ts']);
    expect(result).toContain('src/auth/login.ts');
    expect(result).not.toContain('src/auth/middleware.ts');
  });

  it('returns original diff when ignore list is empty', () => {
    const result = filterDiff(sampleDiff, []);
    expect(result).toBe(sampleDiff);
  });
});

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

describe('judgeDiff', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns per-file coverage scores', async () => {
    const framework: FrameworkJudgment = {
      framework: 'openspec',
      confidence: 0.95,
      reasoning: 'OpenSpec detected',
    };

    mockCallLLM.mockResolvedValueOnce(JSON.stringify({
      files: [
        { file: 'src/auth/login.ts', score: 0.85, pass: true, reason: 'covered by auth spec' },
        { file: 'src/auth/middleware.ts', score: 0.2, pass: false, reason: 'no spec covers auth middleware' },
      ],
      result: 'fail',
      threshold: 0.7,
    }));

    const result = await judgeDiff(framework, sampleDiff, { model: 'anthropic/claude-sonnet-4-20250514' }, 0.7);

    expect(result.files).toHaveLength(2);
    expect(result.files[0].file).toBe('src/auth/login.ts');
    expect(result.files[0].pass).toBe(true);
    expect(result.files[0].reason).toBe('covered by auth spec');
    expect(result.files[1].pass).toBe(false);
    expect(result.files[1].reason).toBe('no spec covers auth middleware');
    expect(result.result).toBe('fail');
  });

  it('includes existing spec documents in the LLM prompt', async () => {
    const framework: FrameworkJudgment = {
      framework: 'openspec',
      confidence: 0.95,
      reasoning: 'OpenSpec detected',
    };

    mockCallLLM.mockResolvedValueOnce(JSON.stringify({
      files: [],
      result: 'pass',
      threshold: 0.7,
    }));

    await judgeDiff(
      framework,
      sampleDiff,
      { model: 'anthropic/claude-sonnet-4-20250514' },
      0.7,
      [],
      [
        { path: 'openspec/specs/auth/spec.md', content: '# Auth Specification\nRequirement: users can log in' },
      ],
    );

    const promptArg = mockCallLLM.mock.calls[0][1];
    expect(promptArg).toContain('openspec/specs/auth/spec.md');
    expect(promptArg).toContain('Auth Specification');
  });

  it('falls back to gap field when reason is not provided (backward compat)', async () => {
    const framework: FrameworkJudgment = {
      framework: 'none',
      confidence: 0.1,
      reasoning: 'No framework',
    };

    mockCallLLM.mockResolvedValueOnce(JSON.stringify({
      files: [
        { file: 'a.ts', score: 0.3, pass: false, gap: 'missing spec' },
      ],
      result: 'fail',
      threshold: 0.7,
    }));

    const result = await judgeDiff(framework, sampleDiff, { model: 'anthropic/claude-sonnet-4-20250514' }, 0.7);
    expect(result.files[0].reason).toBe('missing spec');
  });

  it('passes when all files meet threshold', async () => {
    const framework: FrameworkJudgment = {
      framework: 'none',
      confidence: 0.1,
      reasoning: 'No framework',
    };

    mockCallLLM.mockResolvedValueOnce(JSON.stringify({
      files: [
        { file: 'src/utils.ts', score: 0.9, pass: true, reason: 'utility, no spec needed' },
      ],
      result: 'pass',
      threshold: 0.7,
    }));

    const result = await judgeDiff(framework, 'diff --git a/src/utils.ts ...', { model: 'anthropic/claude-sonnet-4-20250514' }, 0.7);

    expect(result.result).toBe('pass');
  });

  it('returns passing result when all files are ignored', async () => {
    const framework: FrameworkJudgment = {
      framework: 'none',
      confidence: 0.1,
      reasoning: 'No framework',
    };

    const result = await judgeDiff(framework, sampleDiff, { model: 'anthropic/claude-sonnet-4-20250514' }, 0.7, ['*.ts']);

    expect(result.result).toBe('pass');
    expect(result.files).toHaveLength(0);
    expect(mockCallLLM).not.toHaveBeenCalled();
  });

  it('includes framework context in prompt', async () => {
    const framework: FrameworkJudgment = {
      framework: 'openspec',
      confidence: 0.95,
      reasoning: 'OpenSpec detected',
    };

    mockCallLLM.mockResolvedValueOnce(JSON.stringify({
      files: [],
      result: 'pass',
      threshold: 0.7,
    }));

    await judgeDiff(framework, sampleDiff, { model: 'anthropic/claude-sonnet-4-20250514' }, 0.7);

    const promptArg = mockCallLLM.mock.calls[0][1];
    expect(promptArg).toContain('openspec');
    expect(promptArg).toContain('0.7');
  });
});
