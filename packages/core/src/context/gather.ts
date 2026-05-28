/**
 * gather - Retrieval: ripgrep + targeted reads
 *
 * Gathers minimal context needed for the agent to work.
 * Keeps context small for 8GB machines.
 */

import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

export interface Context {
  files: Array<{ path: string; content: string }>;
  searchResults: Array<{ path: string; matches: string[] }>;
}

const MAX_SEARCH_FILES = 5;
const MAX_MATCHES_PER_FILE = 3;
const MAX_FILE_LINES = 200;
const MAX_FILE_CHARS = 8_000;

export async function gatherContext(query: string, repoRoot: string): Promise<Context> {
  if (query.trim().length === 0) {
    return { files: [], searchResults: [] };
  }

  const searchLines = await runRipgrepSearch(query, repoRoot);
  const groupedResults = groupSearchLines(searchLines);
  const prioritized = groupedResults.slice(0, MAX_SEARCH_FILES);

  const files = await Promise.all(
    prioritized.map(async (result) => {
      const absolutePath = path.join(repoRoot, result.path);
      try {
        const content = await readFile(absolutePath, 'utf8');
        return {
          path: result.path,
          content: truncateContent(content),
        };
      } catch {
        return null;
      }
    })
  );

  return {
    searchResults: prioritized,
    files: files.filter((file): file is { path: string; content: string } => file !== null),
  };
}

function runRipgrepSearch(query: string, repoRoot: string): Promise<string[]> {
  return new Promise((resolve) => {
    const child = spawn(
      'rg',
      [
        '--line-number',
        '--color',
        'never',
        '--max-count',
        String(MAX_MATCHES_PER_FILE),
        query,
        '.',
      ],
      {
        cwd: repoRoot,
        stdio: ['ignore', 'pipe', 'ignore'],
      }
    );

    let stdout = '';

    child.stdout.on('data', (chunk: Buffer) => {
      stdout += chunk.toString('utf8');
    });

    child.on('error', () => {
      resolve([]);
    });

    child.on('close', (code) => {
      if (code !== 0 && code !== 1) {
        resolve([]);
        return;
      }

      resolve(stdout.trim().length > 0 ? stdout.trim().split('\n') : []);
    });
  });
}

function groupSearchLines(lines: string[]): Array<{ path: string; matches: string[] }> {
  const byFile = new Map<string, string[]>();

  for (const line of lines) {
    const firstColon = line.indexOf(':');
    const secondColon = line.indexOf(':', firstColon + 1);
    if (firstColon <= 0 || secondColon <= firstColon + 1) {
      continue;
    }

    const filePath = line.slice(0, firstColon);
    const lineNumber = line.slice(firstColon + 1, secondColon);
    const match = line.slice(secondColon + 1).trim();
    const existing = byFile.get(filePath) ?? [];
    if (existing.length < MAX_MATCHES_PER_FILE) {
      existing.push(`${lineNumber}: ${match}`);
      byFile.set(filePath, existing);
    }
  }

  return [...byFile.entries()].map(([filePath, matches]) => ({
    path: filePath,
    matches,
  }));
}

function truncateContent(content: string): string {
  const lines = content.split('\n').slice(0, MAX_FILE_LINES);
  const joined = lines.join('\n');
  if (joined.length <= MAX_FILE_CHARS) {
    return joined;
  }

  return `${joined.slice(0, MAX_FILE_CHARS)}\n... [truncated]`;
}
