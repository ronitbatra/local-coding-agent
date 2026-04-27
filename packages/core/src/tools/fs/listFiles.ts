/**
 * listFiles tool - List files matching glob pattern
 */

import { readdir } from 'node:fs/promises';
import path from 'node:path';
import type { Policy } from '../../policy/Policy.js';
import { evaluatePolicyOperation } from '../../policy/validate.js';
import type { Tool, ToolResult } from '../Tool.js';

export interface ListFilesToolOptions {
  repoRoot: string;
  policy: Policy;
}

function globToRegExp(globPattern: string): RegExp {
  let regex = '^';

  for (let index = 0; index < globPattern.length; index += 1) {
    const current = globPattern[index];
    const next = globPattern[index + 1];

    if (current === '*') {
      if (next === '*') {
        regex += '.*';
        index += 1;
      } else {
        regex += '[^/]*';
      }
      continue;
    }

    if (current === '?') {
      regex += '[^/]';
      continue;
    }

    if ('\\.[]{}()+-^$|'.includes(current)) {
      regex += `\\${current}`;
      continue;
    }

    regex += current;
  }

  regex += '$';
  return new RegExp(regex);
}

async function walkFiles(rootDirectory: string, relativeDirectory = ''): Promise<string[]> {
  const absoluteDirectory = path.join(rootDirectory, relativeDirectory);
  const entries = await readdir(absoluteDirectory, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    if (entry.name === '.git' || entry.name === 'node_modules' || entry.name === '.agent') {
      continue;
    }

    const relativePath = relativeDirectory
      ? path.posix.join(relativeDirectory, entry.name)
      : entry.name;

    if (entry.isDirectory()) {
      files.push(...(await walkFiles(rootDirectory, relativePath)));
      continue;
    }

    if (entry.isFile()) {
      files.push(relativePath);
    }
  }

  return files;
}

export class ListFilesTool implements Tool {
  name = 'list_files';
  description = 'List files matching a glob pattern';

  constructor(private readonly options: ListFilesToolOptions) {}

  async execute(args: { glob: string }): Promise<ToolResult<string[]>> {
    if (!args?.glob || typeof args.glob !== 'string') {
      return { success: false, error: 'glob must be a non-empty string' };
    }

    const matcher = globToRegExp(args.glob);
    const files = await walkFiles(this.options.repoRoot);
    const allowedFiles = files.filter((relativePath) => {
      const decision = evaluatePolicyOperation(
        {
          kind: 'read',
          targetPath: path.join(this.options.repoRoot, relativePath),
        },
        this.options.policy,
        this.options.repoRoot
      );

      return decision.allowed && matcher.test(relativePath);
    });

    return { success: true, data: allowedFiles.sort() };
  }
}
