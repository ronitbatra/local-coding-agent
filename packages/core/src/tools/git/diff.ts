/**
 * git_diff - Get git diff output
 */

import { spawn } from 'node:child_process';

export async function getGitDiff(repoRoot: string, staged = false): Promise<string | null> {
  return new Promise((resolve) => {
    const child = spawn('git', ['diff', ...(staged ? ['--staged'] : [])], {
      cwd: repoRoot,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';

    child.stdout.on('data', (chunk: Buffer) => {
      stdout += chunk.toString('utf8');
    });
    child.on('error', () => {
      resolve(null);
    });
    child.on('close', (code) => {
      resolve(code === 0 ? stdout : null);
    });
  });
}
