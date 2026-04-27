/**
 * ripgrep - Search code using ripgrep
 */

import { spawn } from 'node:child_process';
import path from 'node:path';
import type { Policy } from '../../policy/Policy.js';
import { evaluatePolicyOperation } from '../../policy/validate.js';
import type { Tool, ToolResult } from '../Tool.js';

export interface RipgrepToolOptions {
  repoRoot: string;
  policy: Policy;
}

function runRipgrep(args: string[], cwd: string): Promise<ToolResult<string[]>> {
  return new Promise((resolve) => {
    const child = spawn('rg', args, {
      cwd,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk: Buffer) => {
      stdout += chunk.toString('utf8');
    });
    child.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString('utf8');
    });

    child.on('error', (error) => {
      resolve({ success: false, error: error.message });
    });

    child.on('close', (code) => {
      if (code === 0 || code === 1) {
        const lines = stdout.trim().length > 0 ? stdout.trim().split('\n') : [];
        resolve({ success: true, data: lines });
        return;
      }

      resolve({
        success: false,
        error: stderr.trim() || `ripgrep exited with code ${code ?? 'unknown'}`,
      });
    });
  });
}

export class RipgrepTool implements Tool {
  name = 'search_code';
  description = 'Search code using ripgrep';

  constructor(private readonly options: RipgrepToolOptions) {}

  async execute(args: { query: string; path?: string }): Promise<ToolResult<string[]>> {
    if (!args?.query || typeof args.query !== 'string') {
      return { success: false, error: 'query must be a non-empty string' };
    }

    const targetPath = args.path
      ? path.resolve(this.options.repoRoot, args.path)
      : this.options.repoRoot;
    const decision = evaluatePolicyOperation(
      {
        kind: 'read',
        targetPath,
      },
      this.options.policy,
      this.options.repoRoot
    );

    if (!decision.allowed) {
      return { success: false, error: decision.reasons.join(' ') };
    }

    const relativeTarget =
      targetPath === this.options.repoRoot ? '.' : path.relative(this.options.repoRoot, targetPath);

    return runRipgrep(
      ['--line-number', '--color', 'never', args.query, relativeTarget],
      this.options.repoRoot
    );
  }
}
