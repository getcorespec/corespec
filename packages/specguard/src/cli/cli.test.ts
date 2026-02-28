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
});
