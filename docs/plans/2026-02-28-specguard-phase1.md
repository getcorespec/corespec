# Specguard Phase 1 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build corespec (3 tools) and specguard CLI that checks spec coverage for a git diff range, with configurable LLM backend via Vercel AI SDK.

**Architecture:** corespec exposes 3 tools: check-framework (heuristic), judge-framework (LLM), judge-diff (LLM). specguard CLI orchestrates them into a pipeline. Output is human-readable or JSON.

**Tech Stack:** TypeScript 5, Node >= 20, ESM, pnpm workspace, Vercel AI SDK (`ai` 6.x, `@ai-sdk/anthropic`, `@ai-sdk/openai`), commander, vitest

---

### Task 1: Scaffold corespec package

**Files:**
- Create: `packages/corespec/package.json`
- Create: `packages/corespec/tsconfig.json`
- Create: `packages/corespec/vitest.config.ts`
- Create: `packages/corespec/src/index.ts`
- Create: `packages/corespec/src/types.ts`
- Create: `packages/corespec/README.md`

**Step 1: Create package.json**

```json
{
  "name": "@gaspodewonder/corespec",
  "version": "0.0.1",
  "description": "Shared spec tooling foundation — framework detection, LLM integration, common utilities",
  "keywords": ["corespec", "specs", "ai", "sdd"],
  "homepage": "https://github.com/gaspodewonder/jspec/tree/main/packages/corespec",
  "repository": {
    "type": "git",
    "url": "https://github.com/gaspodewonder/jspec",
    "directory": "packages/corespec"
  },
  "license": "MIT",
  "author": "gaspodewonder",
  "type": "module",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "default": "./dist/index.js"
    }
  },
  "files": ["dist", "!dist/**/*.test.js", "!dist/**/*.map"],
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "engines": { "node": ">=20" },
  "dependencies": {
    "ai": "^6.0.105",
    "@ai-sdk/anthropic": "^3.0.50",
    "@ai-sdk/openai": "^3.0.37",
    "glob": "^11.0.1",
    "zod": "^3.24.2"
  },
  "devDependencies": {
    "@types/node": "^22.13.4",
    "typescript": "^5.7.3",
    "vitest": "^3.0.5"
  }
}
```

**Step 2: Create tsconfig.json**

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "rootDir": "./src",
    "outDir": "./dist"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

**Step 3: Create vitest.config.ts**

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
  }
});
```

**Step 4: Create src/types.ts**

All shared types for the 3 tools. This is the contract between tools.

```typescript
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
}
```

**Step 5: Create src/index.ts**

```typescript
export type {
  FrameworkSignal,
  FrameworkCheckResult,
  FrameworkJudgment,
  FileCoverage,
  DiffJudgment,
  ModelConfig,
} from './types.js';
```

**Step 6: Create README.md**

```markdown
# corespec

Shared spec tooling foundation for [jspec](https://github.com/gaspodewonder/jspec).

## Tools

- **check-framework** — heuristic scan for spec frameworks (no LLM)
- **judge-framework** — LLM confirms/scores framework detection
- **judge-diff** — LLM scores spec coverage per changed file

## Architecture

```
repo ──► check-framework ──► judge-framework ──► judge-diff ──► result
              (heuristic)        (LLM)              (LLM)
```

Used by [@gaspodewonder/specguard](../specguard/) and [@gaspodewonder/respec](../respec/).
```

**Step 7: Install dependencies**

```bash
cd /Users/Dave_Kerr/repos/github/gdog/jspec && pnpm install
```

**Step 8: Build and verify**

```bash
cd /Users/Dave_Kerr/repos/github/gdog/jspec/packages/corespec && pnpm build
```

Expected: clean compile, no errors.

**Step 9: Commit**

```bash
git add packages/corespec/ pnpm-lock.yaml
git commit -m "feat: scaffold corespec package with shared types"
```

---

### Task 2: Implement check-framework tool

**Files:**
- Create: `packages/corespec/src/tools/check-framework.ts`
- Create: `packages/corespec/src/tools/check-framework.test.ts`
- Modify: `packages/corespec/src/index.ts`

**Step 1: Write the failing test**

Create `packages/corespec/src/tools/check-framework.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { checkFramework } from './check-framework.js';

function createTempDir(): string {
  const dir = join(tmpdir(), `corespec-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  mkdirSync(dir, { recursive: true });
  return dir;
}

describe('checkFramework', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = createTempDir();
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('detects openspec directory', () => {
    mkdirSync(join(tempDir, 'openspec'), { recursive: true });
    writeFileSync(join(tempDir, 'openspec', 'spec.md'), '# Spec');

    const result = checkFramework(tempDir);

    expect(result.candidates).toContain('openspec');
    expect(result.signals.some(s => s.framework === 'openspec')).toBe(true);
  });

  it('detects superpowers skills directory', () => {
    mkdirSync(join(tempDir, '.claude', 'skills'), { recursive: true });
    writeFileSync(join(tempDir, '.claude', 'skills', 'test.md'), '# Skill');

    const result = checkFramework(tempDir);

    expect(result.candidates).toContain('superpowers');
    expect(result.signals.some(s => s.framework === 'superpowers')).toBe(true);
  });

  it('detects generic specs directory', () => {
    mkdirSync(join(tempDir, 'specs'), { recursive: true });
    writeFileSync(join(tempDir, 'specs', 'auth.spec.md'), '# Auth Spec');

    const result = checkFramework(tempDir);

    expect(result.candidates).toContain('generic');
    expect(result.signals.some(s => s.signal.includes('specs/'))).toBe(true);
  });

  it('detects kiro config', () => {
    writeFileSync(join(tempDir, 'kiro.config.ts'), 'export default {}');

    const result = checkFramework(tempDir);

    expect(result.candidates).toContain('kiro');
  });

  it('returns empty results for repo with no spec signals', () => {
    mkdirSync(join(tempDir, 'src'), { recursive: true });
    writeFileSync(join(tempDir, 'src', 'index.ts'), 'export const x = 1;');

    const result = checkFramework(tempDir);

    expect(result.signals).toHaveLength(0);
    expect(result.candidates).toHaveLength(0);
  });

  it('detects multiple frameworks', () => {
    mkdirSync(join(tempDir, 'openspec'), { recursive: true });
    writeFileSync(join(tempDir, 'openspec', 'spec.md'), '# Spec');
    mkdirSync(join(tempDir, '.claude', 'skills'), { recursive: true });
    writeFileSync(join(tempDir, '.claude', 'skills', 'test.md'), '# Skill');

    const result = checkFramework(tempDir);

    expect(result.candidates).toContain('openspec');
    expect(result.candidates).toContain('superpowers');
  });
});
```

**Step 2: Run test to verify it fails**

```bash
cd /Users/Dave_Kerr/repos/github/gdog/jspec/packages/corespec && pnpm build && pnpm test
```

Expected: FAIL — `checkFramework` not found.

**Step 3: Implement check-framework**

Create `packages/corespec/src/tools/check-framework.ts`:

```typescript
import { readdirSync, existsSync, statSync } from 'fs';
import { join, relative } from 'path';
import type { FrameworkCheckResult, FrameworkSignal } from '../types.js';

interface FrameworkPattern {
  framework: string;
  check: (repoRoot: string) => FrameworkSignal[];
}

const patterns: FrameworkPattern[] = [
  {
    framework: 'openspec',
    check: (root) => {
      const signals: FrameworkSignal[] = [];
      const dir = join(root, 'openspec');
      if (existsSync(dir) && statSync(dir).isDirectory()) {
        signals.push({ signal: 'openspec/ directory', framework: 'openspec', path: 'openspec/' });
      }
      for (const name of safeReaddir(root)) {
        if (name.match(/^openspec\.config\./)) {
          signals.push({ signal: `${name} config file`, framework: 'openspec', path: name });
        }
      }
      return signals;
    },
  },
  {
    framework: 'superpowers',
    check: (root) => {
      const signals: FrameworkSignal[] = [];
      const skillsDir = join(root, '.claude', 'skills');
      if (existsSync(skillsDir) && statSync(skillsDir).isDirectory()) {
        signals.push({ signal: '.claude/skills/ directory', framework: 'superpowers', path: '.claude/skills/' });
      }
      return signals;
    },
  },
  {
    framework: 'kiro',
    check: (root) => {
      const signals: FrameworkSignal[] = [];
      for (const name of safeReaddir(root)) {
        if (name.match(/^kiro\.config\./)) {
          signals.push({ signal: `${name} config file`, framework: 'kiro', path: name });
        }
      }
      const specsDir = join(root, '.kiro', 'specs');
      if (existsSync(specsDir) && statSync(specsDir).isDirectory()) {
        signals.push({ signal: '.kiro/specs/ directory', framework: 'kiro', path: '.kiro/specs/' });
      }
      return signals;
    },
  },
  {
    framework: 'generic',
    check: (root) => {
      const signals: FrameworkSignal[] = [];
      const specsDir = join(root, 'specs');
      if (existsSync(specsDir) && statSync(specsDir).isDirectory()) {
        signals.push({ signal: 'specs/ directory', framework: 'generic', path: 'specs/' });
      }
      const docsSpecsDir = join(root, 'docs', 'specs');
      if (existsSync(docsSpecsDir) && statSync(docsSpecsDir).isDirectory()) {
        signals.push({ signal: 'docs/specs/ directory', framework: 'generic', path: 'docs/specs/' });
      }
      // Check for *.spec.md files in top-level dirs
      for (const name of safeReaddir(root)) {
        const fullPath = join(root, name);
        if (statSync(fullPath).isDirectory()) {
          for (const file of safeReaddir(fullPath)) {
            if (file.match(/\.spec\.md$/) || file.match(/\.requirements\.md$/)) {
              const relPath = join(name, file);
              signals.push({ signal: `${relPath} spec file`, framework: 'generic', path: relPath });
            }
          }
        }
      }
      return signals;
    },
  },
];

function safeReaddir(dir: string): string[] {
  try {
    return readdirSync(dir);
  } catch {
    return [];
  }
}

export function checkFramework(repoRoot: string): FrameworkCheckResult {
  const signals: FrameworkSignal[] = [];

  for (const pattern of patterns) {
    signals.push(...pattern.check(repoRoot));
  }

  const candidates = [...new Set(signals.map(s => s.framework))];

  return { signals, candidates };
}
```

**Step 4: Export from index.ts**

Update `packages/corespec/src/index.ts`:

```typescript
export type {
  FrameworkSignal,
  FrameworkCheckResult,
  FrameworkJudgment,
  FileCoverage,
  DiffJudgment,
  ModelConfig,
} from './types.js';

export { checkFramework } from './tools/check-framework.js';
```

**Step 5: Build and run tests**

```bash
cd /Users/Dave_Kerr/repos/github/gdog/jspec/packages/corespec && pnpm build && pnpm test
```

Expected: all 6 tests PASS.

**Step 6: Commit**

```bash
git add packages/corespec/
git commit -m "feat(corespec): add check-framework heuristic tool"
```

---

### Task 3: Implement LLM provider wrapper

**Files:**
- Create: `packages/corespec/src/llm/provider.ts`
- Create: `packages/corespec/src/llm/provider.test.ts`
- Modify: `packages/corespec/src/index.ts`

**Step 1: Write the failing test**

Create `packages/corespec/src/llm/provider.test.ts`:

```typescript
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
```

**Step 2: Run test to verify it fails**

```bash
cd /Users/Dave_Kerr/repos/github/gdog/jspec/packages/corespec && pnpm build && pnpm test
```

Expected: FAIL.

**Step 3: Implement provider**

Create `packages/corespec/src/llm/provider.ts`:

```typescript
import { generateText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { openai } from '@ai-sdk/openai';
import type { ModelConfig } from '../types.js';

const SUPPORTED_PROVIDERS = ['anthropic', 'openai'] as const;
type Provider = typeof SUPPORTED_PROVIDERS[number];

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
    throw new Error(`Unsupported provider: ${provider}. Supported: ${SUPPORTED_PROVIDERS.join(', ')}`);
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
```

**Step 4: Export from index.ts**

Add to `packages/corespec/src/index.ts`:

```typescript
export { parseModelId, callLLM } from './llm/provider.js';
```

**Step 5: Build and run tests**

```bash
cd /Users/Dave_Kerr/repos/github/gdog/jspec/packages/corespec && pnpm build && pnpm test
```

Expected: all tests PASS (provider tests don't call real LLM).

**Step 6: Commit**

```bash
git add packages/corespec/
git commit -m "feat(corespec): add LLM provider wrapper with Vercel AI SDK"
```

---

### Task 4: Implement judge-framework tool

**Files:**
- Create: `packages/corespec/src/tools/judge-framework.ts`
- Create: `packages/corespec/src/tools/judge-framework.test.ts`
- Modify: `packages/corespec/src/index.ts`

**Step 1: Write the failing test**

Create `packages/corespec/src/tools/judge-framework.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import type { FrameworkCheckResult } from '../types.js';

// Mock the LLM provider
vi.mock('../llm/provider.js', () => ({
  callLLM: vi.fn(),
}));

import { judgeFramework } from './judge-framework.js';
import { callLLM } from '../llm/provider.js';

const mockCallLLM = vi.mocked(callLLM);

describe('judgeFramework', () => {
  it('returns framework judgment from LLM response', async () => {
    const checkResult: FrameworkCheckResult = {
      signals: [
        { signal: 'openspec/ directory', framework: 'openspec', path: 'openspec/' },
        { signal: 'openspec.config.ts config file', framework: 'openspec', path: 'openspec.config.ts' },
      ],
      candidates: ['openspec'],
    };

    mockCallLLM.mockResolvedValueOnce(JSON.stringify({
      framework: 'openspec',
      confidence: 0.95,
      reasoning: 'Found openspec directory and config file, strongly indicating OpenSpec framework usage.',
    }));

    const result = await judgeFramework(checkResult, { model: 'anthropic/claude-sonnet-4-20250514' });

    expect(result.framework).toBe('openspec');
    expect(result.confidence).toBe(0.95);
    expect(result.reasoning).toBeTruthy();
  });

  it('returns none when no signals found', async () => {
    const checkResult: FrameworkCheckResult = {
      signals: [],
      candidates: [],
    };

    mockCallLLM.mockResolvedValueOnce(JSON.stringify({
      framework: 'none',
      confidence: 0.1,
      reasoning: 'No spec framework signals detected.',
    }));

    const result = await judgeFramework(checkResult, { model: 'anthropic/claude-sonnet-4-20250514' });

    expect(result.framework).toBe('none');
    expect(result.confidence).toBeLessThan(0.5);
  });

  it('includes signals in the prompt sent to LLM', async () => {
    const checkResult: FrameworkCheckResult = {
      signals: [
        { signal: '.claude/skills/ directory', framework: 'superpowers', path: '.claude/skills/' },
      ],
      candidates: ['superpowers'],
    };

    mockCallLLM.mockResolvedValueOnce(JSON.stringify({
      framework: 'superpowers',
      confidence: 0.85,
      reasoning: 'Found superpowers skills directory.',
    }));

    await judgeFramework(checkResult, { model: 'anthropic/claude-sonnet-4-20250514' });

    const promptArg = mockCallLLM.mock.calls[0][1];
    expect(promptArg).toContain('.claude/skills/');
    expect(promptArg).toContain('superpowers');
  });
});
```

**Step 2: Run test to verify it fails**

```bash
cd /Users/Dave_Kerr/repos/github/gdog/jspec/packages/corespec && pnpm build && pnpm test
```

Expected: FAIL — `judgeFramework` not found.

**Step 3: Implement judge-framework**

Create `packages/corespec/src/tools/judge-framework.ts`:

```typescript
import type { FrameworkCheckResult, FrameworkJudgment, ModelConfig } from '../types.js';
import { callLLM } from '../llm/provider.js';

function buildPrompt(checkResult: FrameworkCheckResult): string {
  const signalList = checkResult.signals.length > 0
    ? checkResult.signals.map(s => `- ${s.signal} (path: ${s.path})`).join('\n')
    : '- No signals found';

  return `You are a spec framework detection tool. Given the following signals found in a repository, determine which spec framework or protocol is in use.

Known frameworks:
- openspec: OpenSpec by Fission-AI — in-repo specs as markdown with GIVEN/WHEN/THEN scenarios
- superpowers: Claude Code Superpowers — skills, agents, and plans in .claude/ directory
- kiro: AWS Kiro — requirements-driven development with kiro.config files
- spec-kit: GitHub Spec Kit — spec-first workflow toolkit
- generic: Generic spec patterns (specs/ directory, *.spec.md files)
- none: No spec framework detected

Signals found:
${signalList}

Candidate frameworks: ${checkResult.candidates.length > 0 ? checkResult.candidates.join(', ') : 'none'}

Respond with ONLY a JSON object (no markdown, no code fences):
{
  "framework": "<framework name or 'none'>",
  "confidence": <0.0 to 1.0>,
  "reasoning": "<brief explanation>"
}`;
}

export async function judgeFramework(
  checkResult: FrameworkCheckResult,
  config: ModelConfig,
): Promise<FrameworkJudgment> {
  const prompt = buildPrompt(checkResult);
  const response = await callLLM(config, prompt);

  const parsed = JSON.parse(response) as FrameworkJudgment;

  return {
    framework: parsed.framework ?? 'none',
    confidence: Math.max(0, Math.min(1, parsed.confidence ?? 0)),
    reasoning: parsed.reasoning ?? '',
  };
}
```

**Step 4: Export from index.ts**

Add to `packages/corespec/src/index.ts`:

```typescript
export { judgeFramework } from './tools/judge-framework.js';
```

**Step 5: Build and run tests**

```bash
cd /Users/Dave_Kerr/repos/github/gdog/jspec/packages/corespec && pnpm build && pnpm test
```

Expected: all tests PASS.

**Step 6: Commit**

```bash
git add packages/corespec/
git commit -m "feat(corespec): add judge-framework LLM tool"
```

---

### Task 5: Implement judge-diff tool

**Files:**
- Create: `packages/corespec/src/tools/judge-diff.ts`
- Create: `packages/corespec/src/tools/judge-diff.test.ts`
- Modify: `packages/corespec/src/index.ts`

**Step 1: Write the failing test**

Create `packages/corespec/src/tools/judge-diff.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import type { FrameworkJudgment } from '../types.js';

vi.mock('../llm/provider.js', () => ({
  callLLM: vi.fn(),
}));

import { judgeDiff } from './judge-diff.js';
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

describe('judgeDiff', () => {
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
```

**Step 2: Run test to verify it fails**

```bash
cd /Users/Dave_Kerr/repos/github/gdog/jspec/packages/corespec && pnpm build && pnpm test
```

Expected: FAIL — `judgeDiff` not found.

**Step 3: Implement judge-diff**

Create `packages/corespec/src/tools/judge-diff.ts`:

```typescript
import type { FrameworkJudgment, DiffJudgment, ModelConfig } from '../types.js';
import { callLLM } from '../llm/provider.js';

function buildPrompt(framework: FrameworkJudgment, diff: string, threshold: number): string {
  const frameworkContext = framework.framework !== 'none'
    ? `The repository uses the "${framework.framework}" spec framework (confidence: ${framework.confidence}). ${framework.reasoning}`
    : 'No specific spec framework was detected in this repository.';

  return `You are a spec coverage analysis tool. Given a git diff and information about the repository's spec framework, evaluate whether each changed file has adequate specification coverage.

Framework context:
${frameworkContext}

Pass/fail threshold: ${threshold} (files scoring below this fail)

Git diff:
${diff}

For each changed file in the diff, evaluate:
1. Does this file have an associated spec that covers its behavior?
2. How confident are you that the spec coverage is adequate? (0.0 = no coverage, 1.0 = fully specified)
3. If coverage is inadequate, briefly explain what's missing.

Respond with ONLY a JSON object (no markdown, no code fences):
{
  "files": [
    {
      "file": "<file path>",
      "score": <0.0 to 1.0>,
      "pass": <true if score >= threshold>,
      "gap": "<explanation of missing coverage, omit if passing>"
    }
  ],
  "result": "<'pass' if all files pass, 'fail' if any file fails>",
  "threshold": ${threshold}
}`;
}

export async function judgeDiff(
  framework: FrameworkJudgment,
  diff: string,
  config: ModelConfig,
  threshold: number,
): Promise<DiffJudgment> {
  const prompt = buildPrompt(framework, diff, threshold);
  const response = await callLLM(config, prompt);

  const parsed = JSON.parse(response) as DiffJudgment;

  const files = (parsed.files ?? []).map(f => ({
    file: f.file,
    score: Math.max(0, Math.min(1, f.score ?? 0)),
    pass: (f.score ?? 0) >= threshold,
    ...(f.gap ? { gap: f.gap } : {}),
  }));

  const result = files.every(f => f.pass) ? 'pass' as const : 'fail' as const;

  return { files, result, threshold };
}
```

**Step 4: Export from index.ts**

Add to `packages/corespec/src/index.ts`:

```typescript
export { judgeDiff } from './tools/judge-diff.js';
```

**Step 5: Build and run tests**

```bash
cd /Users/Dave_Kerr/repos/github/gdog/jspec/packages/corespec && pnpm build && pnpm test
```

Expected: all tests PASS.

**Step 6: Commit**

```bash
git add packages/corespec/
git commit -m "feat(corespec): add judge-diff LLM tool"
```

---

### Task 6: Add specguard config loading

**Files:**
- Create: `packages/specguard/src/core/config.ts`
- Create: `packages/specguard/src/core/config.test.ts`

**Step 1: Write the failing test**

Create `packages/specguard/src/core/config.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdirSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { loadConfig } from './config.js';

function createTempDir(): string {
  const dir = join(tmpdir(), `specguard-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  mkdirSync(dir, { recursive: true });
  return dir;
}

describe('loadConfig', () => {
  let tempDir: string;
  const originalEnv = process.env;

  beforeEach(() => {
    tempDir = createTempDir();
    vi.stubEnv('SPECGUARD_MODEL', '');
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
    vi.unstubAllEnvs();
  });

  it('returns defaults when no config exists', () => {
    const config = loadConfig({ cwd: tempDir });

    expect(config.model).toBe('anthropic/claude-sonnet-4-20250514');
    expect(config.threshold).toBe(0.7);
  });

  it('reads from .specguard.yml', () => {
    writeFileSync(join(tempDir, '.specguard.yml'), 'model: openai/gpt-4o\nthreshold: 0.5\n');

    const config = loadConfig({ cwd: tempDir });

    expect(config.model).toBe('openai/gpt-4o');
    expect(config.threshold).toBe(0.5);
  });

  it('env vars override config file', () => {
    writeFileSync(join(tempDir, '.specguard.yml'), 'model: openai/gpt-4o\n');
    vi.stubEnv('SPECGUARD_MODEL', 'anthropic/claude-haiku-4-5-20251001');

    const config = loadConfig({ cwd: tempDir });

    expect(config.model).toBe('anthropic/claude-haiku-4-5-20251001');
  });

  it('CLI flags override everything', () => {
    writeFileSync(join(tempDir, '.specguard.yml'), 'model: openai/gpt-4o\nthreshold: 0.5\n');
    vi.stubEnv('SPECGUARD_MODEL', 'anthropic/claude-haiku-4-5-20251001');

    const config = loadConfig({
      cwd: tempDir,
      model: 'anthropic/claude-sonnet-4-20250514',
      threshold: 0.9,
    });

    expect(config.model).toBe('anthropic/claude-sonnet-4-20250514');
    expect(config.threshold).toBe(0.9);
  });
});
```

**Step 2: Run test to verify it fails**

```bash
cd /Users/Dave_Kerr/repos/github/gdog/jspec/packages/specguard && pnpm build && pnpm test
```

Expected: FAIL.

**Step 3: Implement config**

Create `packages/specguard/src/core/config.ts`:

```typescript
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

export interface SpecguardConfig {
  model: string;
  threshold: number;
}

interface LoadConfigOptions {
  cwd?: string;
  model?: string;
  threshold?: number;
  configPath?: string;
}

const DEFAULTS: SpecguardConfig = {
  model: 'anthropic/claude-sonnet-4-20250514',
  threshold: 0.7,
};

function loadYamlConfig(filePath: string): Partial<SpecguardConfig> {
  if (!existsSync(filePath)) return {};

  const content = readFileSync(filePath, 'utf-8');
  const result: Partial<SpecguardConfig> = {};

  for (const line of content.split('\n')) {
    const match = line.match(/^(\w+):\s*(.+)$/);
    if (!match) continue;
    const [, key, value] = match;
    if (key === 'model') result.model = value.trim();
    if (key === 'threshold') result.threshold = parseFloat(value.trim());
  }

  return result;
}

export function loadConfig(options: LoadConfigOptions = {}): SpecguardConfig {
  const cwd = options.cwd ?? process.cwd();
  const configPath = options.configPath ?? join(cwd, '.specguard.yml');

  const fileConfig = loadYamlConfig(configPath);

  const envModel = process.env.SPECGUARD_MODEL || undefined;

  return {
    model: options.model ?? envModel ?? fileConfig.model ?? DEFAULTS.model,
    threshold: options.threshold ?? fileConfig.threshold ?? DEFAULTS.threshold,
  };
}
```

**Step 4: Add specguard dependency on corespec**

Update `packages/specguard/package.json` — add to dependencies:

```json
"@gaspodewonder/corespec": "workspace:*"
```

Run: `cd /Users/Dave_Kerr/repos/github/gdog/jspec && pnpm install`

**Step 5: Build and run tests**

```bash
cd /Users/Dave_Kerr/repos/github/gdog/jspec && pnpm -r build && cd packages/specguard && pnpm test
```

Expected: all tests PASS.

**Step 6: Commit**

```bash
git add packages/specguard/
git commit -m "feat(specguard): add config loading with precedence chain"
```

---

### Task 7: Add specguard pipeline and formatter

**Files:**
- Create: `packages/specguard/src/core/pipeline.ts`
- Create: `packages/specguard/src/core/formatter.ts`
- Create: `packages/specguard/src/core/pipeline.test.ts`
- Create: `packages/specguard/src/core/formatter.test.ts`

**Step 1: Write the failing pipeline test**

Create `packages/specguard/src/core/pipeline.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest';

vi.mock('@gaspodewonder/corespec', () => ({
  checkFramework: vi.fn(),
  judgeFramework: vi.fn(),
  judgeDiff: vi.fn(),
}));

import { runPipeline } from './pipeline.js';
import { checkFramework, judgeFramework, judgeDiff } from '@gaspodewonder/corespec';

const mockCheckFramework = vi.mocked(checkFramework);
const mockJudgeFramework = vi.mocked(judgeFramework);
const mockJudgeDiff = vi.mocked(judgeDiff);

describe('runPipeline', () => {
  it('chains the 3 tools together', async () => {
    mockCheckFramework.mockReturnValue({
      signals: [{ signal: 'openspec/ directory', framework: 'openspec', path: 'openspec/' }],
      candidates: ['openspec'],
    });

    mockJudgeFramework.mockResolvedValue({
      framework: 'openspec',
      confidence: 0.95,
      reasoning: 'OpenSpec detected',
    });

    mockJudgeDiff.mockResolvedValue({
      files: [{ file: 'src/index.ts', score: 0.9, pass: true }],
      result: 'pass',
      threshold: 0.7,
    });

    const result = await runPipeline({
      repoRoot: '/tmp/test-repo',
      diff: 'diff --git a/src/index.ts ...',
      model: 'anthropic/claude-sonnet-4-20250514',
      threshold: 0.7,
    });

    expect(mockCheckFramework).toHaveBeenCalledWith('/tmp/test-repo');
    expect(mockJudgeFramework).toHaveBeenCalled();
    expect(mockJudgeDiff).toHaveBeenCalled();
    expect(result.framework.framework).toBe('openspec');
    expect(result.diff.result).toBe('pass');
  });
});
```

**Step 2: Write the failing formatter test**

Create `packages/specguard/src/core/formatter.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { formatHuman, formatJson } from './formatter.js';
import type { PipelineResult } from './pipeline.js';

const sampleResult: PipelineResult = {
  framework: {
    framework: 'openspec',
    confidence: 0.95,
    reasoning: 'OpenSpec detected',
  },
  diff: {
    files: [
      { file: 'src/auth/login.ts', score: 0.85, pass: true },
      { file: 'src/auth/middleware.ts', score: 0.2, pass: false, gap: 'no spec covers auth middleware' },
    ],
    result: 'fail',
    threshold: 0.7,
  },
  signals: {
    signals: [{ signal: 'openspec/ directory', framework: 'openspec', path: 'openspec/' }],
    candidates: ['openspec'],
  },
};

describe('formatJson', () => {
  it('returns valid JSON', () => {
    const output = formatJson(sampleResult);
    const parsed = JSON.parse(output);
    expect(parsed.framework.detected).toBe('openspec');
    expect(parsed.coverage).toHaveLength(2);
    expect(parsed.result).toBe('fail');
  });
});

describe('formatHuman', () => {
  it('includes framework detection section', () => {
    const output = formatHuman(sampleResult);
    expect(output).toContain('Framework Detection');
    expect(output).toContain('openspec');
  });

  it('includes spec coverage section', () => {
    const output = formatHuman(sampleResult);
    expect(output).toContain('Spec Coverage');
    expect(output).toContain('src/auth/login.ts');
    expect(output).toContain('src/auth/middleware.ts');
  });

  it('includes result', () => {
    const output = formatHuman(sampleResult);
    expect(output).toContain('FAIL');
  });
});
```

**Step 3: Run tests to verify they fail**

```bash
cd /Users/Dave_Kerr/repos/github/gdog/jspec/packages/specguard && pnpm build && pnpm test
```

Expected: FAIL.

**Step 4: Implement pipeline**

Create `packages/specguard/src/core/pipeline.ts`:

```typescript
import {
  checkFramework,
  judgeFramework,
  judgeDiff,
  type FrameworkCheckResult,
  type FrameworkJudgment,
  type DiffJudgment,
} from '@gaspodewonder/corespec';

export interface PipelineOptions {
  repoRoot: string;
  diff: string;
  model: string;
  threshold: number;
}

export interface PipelineResult {
  signals: FrameworkCheckResult;
  framework: FrameworkJudgment;
  diff: DiffJudgment;
}

export async function runPipeline(options: PipelineOptions): Promise<PipelineResult> {
  const signals = checkFramework(options.repoRoot);

  const framework = await judgeFramework(signals, { model: options.model });

  const diff = await judgeDiff(framework, options.diff, { model: options.model }, options.threshold);

  return { signals, framework, diff };
}
```

**Step 5: Implement formatter**

Create `packages/specguard/src/core/formatter.ts`:

```typescript
import chalk from 'chalk';
import type { PipelineResult } from './pipeline.js';

export function formatJson(result: PipelineResult): string {
  const output = {
    framework: {
      detected: result.framework.framework,
      confidence: result.framework.confidence,
      signals: result.signals.signals.map(s => s.signal),
    },
    coverage: result.diff.files.map(f => ({
      file: f.file,
      score: f.score,
      pass: f.pass,
      ...(f.gap ? { gap: f.gap } : {}),
    })),
    result: result.diff.result,
    threshold: result.diff.threshold,
  };

  return JSON.stringify(output, null, 2);
}

export function formatHuman(result: PipelineResult): string {
  const lines: string[] = [];

  lines.push('');
  lines.push('  Framework Detection');
  lines.push('  ' + '\u2500'.repeat(35));

  if (result.framework.framework !== 'none') {
    const conf = result.framework.confidence.toFixed(2);
    lines.push(`  ${result.framework.framework.padEnd(20)} ${conf}   detected`);
  } else {
    lines.push('  No spec framework detected');
  }

  lines.push('');
  lines.push(`  Spec Coverage (threshold: ${result.diff.threshold})`);
  lines.push('  ' + '\u2500'.repeat(35));

  for (const file of result.diff.files) {
    const score = file.score.toFixed(2);
    const icon = file.pass ? chalk.green('\u2713') : chalk.red('\u2717');
    const gap = file.gap ? `  ${file.gap}` : '';
    lines.push(`  ${file.file.padEnd(30)} ${score}  ${icon}${gap}`);
  }

  lines.push('');
  const failCount = result.diff.files.filter(f => !f.pass).length;
  const total = result.diff.files.length;

  if (result.diff.result === 'pass') {
    lines.push(`  Result: ${chalk.green('PASS')}`);
    lines.push(`  All ${total} files meet threshold`);
  } else {
    lines.push(`  Result: ${chalk.red('FAIL')}`);
    lines.push(`  ${failCount} of ${total} files below threshold`);
  }

  lines.push('');
  return lines.join('\n');
}
```

**Step 6: Build and run tests**

```bash
cd /Users/Dave_Kerr/repos/github/gdog/jspec && pnpm -r build && cd packages/specguard && pnpm test
```

Expected: all tests PASS.

**Step 7: Commit**

```bash
git add packages/specguard/
git commit -m "feat(specguard): add pipeline orchestration and output formatting"
```

---

### Task 8: Wire up specguard check command

**Files:**
- Create: `packages/specguard/src/cli/commands/check.ts`
- Modify: `packages/specguard/src/cli/index.ts`
- Modify: `packages/specguard/src/cli/cli.test.ts`

**Step 1: Write the failing test**

Update `packages/specguard/src/cli/cli.test.ts` — add a test for the check subcommand:

```typescript
import { describe, it, expect } from 'vitest';
import { execFileSync } from 'child_process';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const bin = resolve(__dirname, '../../bin/specguard.js');

describe('specguard CLI', () => {
  it('prints version with --version', () => {
    const output = execFileSync('node', [bin, '--version'], {
      encoding: 'utf-8',
    });
    expect(output.trim()).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it('prints help with --help', () => {
    const output = execFileSync('node', [bin, '--help'], {
      encoding: 'utf-8',
    });
    expect(output).toContain('specguard');
  });

  it('shows check command in help', () => {
    const output = execFileSync('node', [bin, '--help'], {
      encoding: 'utf-8',
    });
    expect(output).toContain('check');
  });

  it('shows check subcommand help', () => {
    const output = execFileSync('node', [bin, 'check', '--help'], {
      encoding: 'utf-8',
    });
    expect(output).toContain('diff-range');
    expect(output).toContain('--threshold');
    expect(output).toContain('--model');
    expect(output).toContain('--output');
  });
});
```

**Step 2: Run test to verify it fails**

```bash
cd /Users/Dave_Kerr/repos/github/gdog/jspec/packages/specguard && pnpm build && pnpm test
```

Expected: FAIL — check command not registered.

**Step 3: Implement check command**

Create `packages/specguard/src/cli/commands/check.ts`:

```typescript
import { Command } from 'commander';
import { execSync } from 'child_process';
import { loadConfig } from '../../core/config.js';
import { runPipeline } from '../../core/pipeline.js';
import { formatHuman, formatJson } from '../../core/formatter.js';

export const checkCommand = new Command('check')
  .description('Check spec coverage for a git diff range')
  .argument('[diff-range]', 'git diff range (e.g. main..HEAD)', 'main..HEAD')
  .option('--model <model>', 'LLM model (e.g. anthropic/claude-sonnet-4-20250514)')
  .option('--threshold <number>', 'confidence threshold for pass/fail', parseFloat)
  .option('--output <format>', 'output format: human or json', 'human')
  .option('--config <path>', 'config file path')
  .action(async (diffRange: string, options) => {
    const config = loadConfig({
      model: options.model,
      threshold: options.threshold,
      configPath: options.config,
    });

    let diff: string;
    try {
      diff = execSync(`git diff ${diffRange}`, { encoding: 'utf-8' });
    } catch {
      console.error(`Error: failed to get git diff for range "${diffRange}"`);
      process.exit(1);
    }

    if (!diff.trim()) {
      console.error(`No changes found in range "${diffRange}"`);
      process.exit(0);
    }

    const repoRoot = execSync('git rev-parse --show-toplevel', { encoding: 'utf-8' }).trim();

    const result = await runPipeline({
      repoRoot,
      diff,
      model: config.model,
      threshold: config.threshold,
    });

    if (options.output === 'json') {
      console.log(formatJson(result));
    } else {
      console.log(formatHuman(result));
    }

    process.exit(result.diff.result === 'pass' ? 0 : 1);
  });
```

**Step 4: Update CLI to register check command**

Update `packages/specguard/src/cli/index.ts`:

```typescript
import { Command } from 'commander';
import { createRequire } from 'module';
import { checkCommand } from './commands/check.js';

const require = createRequire(import.meta.url);
const { version } = require('../../package.json');

const program = new Command();

program
  .name('specguard')
  .description('PR gating for spec coverage — checks that code changes have associated specs')
  .version(version);

program.addCommand(checkCommand);

program.parse();
```

**Step 5: Build and run tests**

```bash
cd /Users/Dave_Kerr/repos/github/gdog/jspec && pnpm -r build && cd packages/specguard && pnpm test
```

Expected: all tests PASS.

**Step 6: Commit**

```bash
git add packages/specguard/
git commit -m "feat(specguard): wire up check command with pipeline"
```

---

### Task 9: Push and verify CI

**Step 1: Run full build and test from root**

```bash
cd /Users/Dave_Kerr/repos/github/gdog/jspec && pnpm -r build && pnpm -r test
```

Expected: all packages build clean, all tests pass.

**Step 2: Push to GitHub**

```bash
git push
```

**Step 3: Verify CI passes**

```bash
gh run list --limit 1
```

Expected: CI workflow triggered and passing.

**Step 4: Commit any remaining changes**

If CI reveals issues, fix and commit.

---

### Task 10: Manual integration test

**Step 1: Test specguard against a real repo**

Pick a repo with specs (e.g. one with OpenSpec or a specs/ directory) and run:

```bash
cd /path/to/test-repo
ANTHROPIC_API_KEY=sk-ant-... node /path/to/jspec/packages/specguard/bin/specguard.js check main..HEAD
```

**Step 2: Test JSON output**

```bash
ANTHROPIC_API_KEY=sk-ant-... node /path/to/jspec/packages/specguard/bin/specguard.js check main..HEAD --output json
```

**Step 3: Test with different model**

```bash
OPENAI_API_KEY=sk-... node /path/to/jspec/packages/specguard/bin/specguard.js check main..HEAD --model openai/gpt-4o
```

**Step 4: Verify exit codes**

- Exit 0 when all files pass threshold
- Exit 1 when any file fails threshold

**Step 5: Document any issues found and create follow-up tasks**
