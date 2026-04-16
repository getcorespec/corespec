import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { FrameworkJudgment } from '../types.js';

vi.mock('../llm/provider.js', () => ({
  callLLM: vi.fn(),
}));

import { judgeDiff, filterDiff } from './judge-diff.js';
import { LlmJsonParseError } from '../llm/json-response.js';
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

  it('throws LlmJsonParseError with actionable context when LLM returns non-JSON', async () => {
    const framework: FrameworkJudgment = {
      framework: 'openspec',
      confidence: 0.95,
      reasoning: 'OpenSpec detected',
    };

    const bogusResponse = '# Spec Coverage Analysis\n\nI reviewed the diff and here are my findings:\n- Foo looks good';
    mockCallLLM.mockResolvedValue(bogusResponse);

    try {
      await judgeDiff(framework, sampleDiff, { model: 'anthropic/claude-haiku-4-5' }, 0.7);
      expect.fail('expected judgeDiff to throw');
    } catch (err) {
      expect(err).toBeInstanceOf(LlmJsonParseError);
      const typed = err as LlmJsonParseError;
      expect(typed.model).toBe('anthropic/claude-haiku-4-5');
      expect(typed.rawResponse).toBe(bogusResponse);
      // Surfaces the model, a response preview, and remediation advice so users
      // don't just see a raw JSON.parse stack trace.
      expect(typed.message).toContain('claude-haiku-4-5');
      expect(typed.message).toContain('Spec Coverage Analysis');
      expect(typed.message).toContain('Try a more capable model');
    }
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
