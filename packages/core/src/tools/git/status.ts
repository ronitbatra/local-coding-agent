/**
 * git_status - Get git repository status
 */

import { spawn } from 'node:child_process';

export interface GitStatus {
  branch: string;
  modified: string[];
  untracked: string[];
  staged: string[];
}

function runGit(
  args: string[],
  repoRoot: string
): Promise<{ code: number | null; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    const child = spawn('git', args, {
      cwd: repoRoot,
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
    child.on('error', () => {
      resolve({ code: 127, stdout: '', stderr: 'git is not available' });
    });
    child.on('close', (code) => {
      resolve({ code, stdout, stderr });
    });
  });
}

export async function getGitStatus(repoRoot: string): Promise<GitStatus | null> {
  const branchResult = await runGit(['rev-parse', '--abbrev-ref', 'HEAD'], repoRoot);
  if (branchResult.code !== 0) {
    return null;
  }

  const statusResult = await runGit(['status', '--short'], repoRoot);
  if (statusResult.code !== 0) {
    return null;
  }

  const modified: string[] = [];
  const untracked: string[] = [];
  const staged: string[] = [];

  for (const line of statusResult.stdout.split('\n').filter(Boolean)) {
    const indexStatus = line[0] ?? ' ';
    const worktreeStatus = line[1] ?? ' ';
    const filePath = line.slice(3).trim();

    if (indexStatus !== ' ' && indexStatus !== '?') {
      staged.push(filePath);
    }

    if (worktreeStatus !== ' ' && worktreeStatus !== '?') {
      modified.push(filePath);
    }

    if (indexStatus === '?' && worktreeStatus === '?') {
      untracked.push(filePath);
    }
  }

  return {
    branch: branchResult.stdout.trim(),
    modified,
    untracked,
    staged,
  };
}
