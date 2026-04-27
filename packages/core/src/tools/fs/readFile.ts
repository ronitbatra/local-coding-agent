/**
 * readFile tool - Read file contents with optional range
 */

import { readFile as readFileContents, stat } from 'node:fs/promises';
import path from 'node:path';
import type { Policy } from '../../policy/Policy.js';
import { evaluatePolicyOperation } from '../../policy/validate.js';
import type { Tool, ToolResult } from '../Tool.js';

export interface ReadFileToolOptions {
  repoRoot: string;
  policy: Policy;
}

function readLineRange(content: string, range?: [number, number]): string {
  if (!range) {
    return content;
  }

  const [start, end] = range;
  if (!Number.isInteger(start) || !Number.isInteger(end) || start < 1 || end < start) {
    throw new Error('range must be a tuple of positive line numbers');
  }

  const lines = content.split('\n');
  return lines.slice(start - 1, end).join('\n');
}

export class ReadFileTool implements Tool {
  name = 'read_file';
  description = 'Read file contents, optionally with line range';

  constructor(private readonly options: ReadFileToolOptions) {}

  async execute(args: { path: string; range?: [number, number] }): Promise<ToolResult<string>> {
    if (!args?.path || typeof args.path !== 'string') {
      return { success: false, error: 'path must be a non-empty string' };
    }

    const absolutePath = path.resolve(this.options.repoRoot, args.path);
    const fileStat = await stat(absolutePath);
    const decision = evaluatePolicyOperation(
      {
        kind: 'read',
        targetPath: absolutePath,
        fileSize: fileStat.size,
      },
      this.options.policy,
      this.options.repoRoot
    );

    if (!decision.allowed) {
      return { success: false, error: decision.reasons.join(' ') };
    }

    const content = await readFileContents(absolutePath, 'utf8');
    return { success: true, data: readLineRange(content, args.range) };
  }
}
