import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { FrameworkJudgment } from '../types.js';

vi.mock('../llm/provider.js', () => ({
  callLLM: vi.fn(),
}));

import { judgeDiff, filterDiff } from './judge-diff.js';
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
        { file: 'src/auth/login.ts', score: 0.85, pass: true },
        { file: 'src/auth/middleware.ts', score: 0.2, pass: false, gap: 'no spec covers auth middleware' },
      ],
      result: 'fail',
      threshold: 0.7,
    }));

    const result = await judgeDiff(framework, sampleDiff, { model: 'anthropic/claude-sonnet-4-20250514' }, 0.7);

    expect(result.files).toHaveLength(2);
    expect(result.files[0].file).toBe('src/auth/login.ts');
    expect(result.files[0].pass).toBe(true);
    expect(result.files[1].pass).toBe(false);
    expect(result.files[1].gap).toBeTruthy();
    expect(result.result).toBe('fail');
  });

  it('passes when all files meet threshold', async () => {
    const framework: FrameworkJudgment = {
      framework: 'none',
      confidence: 0.1,
      reasoning: 'No framework',
    };

    mockCallLLM.mockResolvedValueOnce(JSON.stringify({
      files: [
        { file: 'src/utils.ts', score: 0.9, pass: true },
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
