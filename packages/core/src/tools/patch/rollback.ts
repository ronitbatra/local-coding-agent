/**
 * rollback - Revert last applied patch (use git if available; otherwise stored reverse diff)
 */

import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { applyDiff } from './applyDiff.js';
import { parseUnifiedDiff } from './parseUnifiedDiff.js';

export interface RollbackResult {
  success: boolean;
  error?: string;
}

async function isGitRepo(repoRoot: string): Promise<boolean> {
  return new Promise((resolve) => {
    const child = spawn('git', ['rev-parse', '--is-inside-work-tree'], {
      cwd: repoRoot,
      stdio: ['ignore', 'pipe', 'ignore'],
    });

    child.on('error', () => {
      resolve(false);
    });
    child.on('close', (code) => {
      resolve(code === 0);
    });
  });
}

async function rollbackWithGit(repoRoot: string, patchPath: string): Promise<RollbackResult> {
  return new Promise((resolve) => {
    const child = spawn('git', ['apply', '-R', '--whitespace=nowarn', patchPath], {
      cwd: repoRoot,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stderr = '';
    child.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString('utf8');
    });
    child.on('error', (error) => {
      resolve({ success: false, error: error.message });
    });
    child.on('close', (code) => {
      resolve({
        success: code === 0,
        error: code === 0 ? undefined : stderr.trim() || 'git apply -R failed',
      });
    });
  });
}

export async function rollbackLastPatch(
  repoRoot: string,
  patchPath?: string
): Promise<RollbackResult> {
  const fallbackPatchPath =
    patchPath ?? path.join(repoRoot, '.agent', 'patches', 'last-applied.reverse.patch');
  const originalPatchPath = path.join(repoRoot, '.agent', 'patches', 'last-applied.patch');

  if (existsSync(originalPatchPath) && (await isGitRepo(repoRoot))) {
    const gitResult = await rollbackWithGit(repoRoot, originalPatchPath);
    if (gitResult.success) {
      return gitResult;
    }
  }

  if (!existsSync(fallbackPatchPath)) {
    return { success: false, error: 'No rollback patch is available.' };
  }

  try {
    const reverseDiff = parseUnifiedDiff(await readFile(fallbackPatchPath, 'utf8'));
    const result = await applyDiff(reverseDiff, repoRoot);
    return result.success
      ? { success: true }
      : { success: false, error: result.error ?? 'Rollback apply failed' };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown rollback failure',
    };
  }
}
