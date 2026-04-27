import { execFile } from 'node:child_process';
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { describe, expect, it } from 'vitest';
import { DEFAULT_POLICY } from '../../src/policy/Policy';
import { applyDiff } from '../../src/tools/patch/applyDiff';
import { parseUnifiedDiff } from '../../src/tools/patch/parseUnifiedDiff';
import { rollbackLastPatch } from '../../src/tools/patch/rollback';
import { validateDiff } from '../../src/tools/patch/validateDiff';

const execFileAsync = promisify(execFile);

async function createTempDirectory(prefix: string): Promise<string> {
  return mkdtemp(path.join(os.tmpdir(), prefix));
}

async function initializeGitRepo(repoRoot: string): Promise<void> {
  await execFileAsync('git', ['init'], { cwd: repoRoot });
  await execFileAsync('git', ['config', 'user.name', 'Test User'], { cwd: repoRoot });
  await execFileAsync('git', ['config', 'user.email', 'test@example.com'], { cwd: repoRoot });
}

describe('patch pipeline', () => {
  it('rejects malformed diffs during parsing and validation', () => {
    expect(() => parseUnifiedDiff('not a diff')).toThrow(
      'Unified diff did not contain any file entries.'
    );

    const diff = parseUnifiedDiff(`--- a/file.txt\n+++ b/file.txt\n@@ -1,2 +1,1 @@\n-old\n+new\n`);
    const validation = validateDiff(
      diff,
      {
        ...DEFAULT_POLICY,
        allowedRepoRoots: ['/tmp'],
      },
      '/tmp'
    );

    expect(validation.valid).toBe(false);
    expect(validation.errors[0]).toContain('declares 2 old lines but contains 1');
  });

  it('applies create, modify, and delete changes and restores them byte-for-byte with undo', async () => {
    const repoRoot = await createTempDirectory('patch-apply-');
    await mkdir(path.join(repoRoot, 'src'), { recursive: true });
    await writeFile(path.join(repoRoot, 'src', 'modify.txt'), 'before\nsame\n', 'utf8');
    await writeFile(path.join(repoRoot, 'src', 'delete.txt'), 'remove me\n', 'utf8');

    const beforeSnapshot = new Map<string, string | null>([
      [
        path.join(repoRoot, 'src', 'modify.txt'),
        await readFile(path.join(repoRoot, 'src', 'modify.txt'), 'utf8'),
      ],
      [
        path.join(repoRoot, 'src', 'delete.txt'),
        await readFile(path.join(repoRoot, 'src', 'delete.txt'), 'utf8'),
      ],
      [path.join(repoRoot, 'src', 'create.txt'), null],
    ]);

    const patchText = [
      '--- /dev/null',
      '+++ b/src/create.txt',
      '@@ -0,0 +1,1 @@',
      '+created',
      '--- a/src/modify.txt',
      '+++ b/src/modify.txt',
      '@@ -1,2 +1,2 @@',
      '-before',
      '+after',
      ' same',
      '--- a/src/delete.txt',
      '+++ /dev/null',
      '@@ -1,1 +0,0 @@',
      '-remove me',
      '',
    ].join('\n');

    const diff = parseUnifiedDiff(patchText);
    const applyResult = await applyDiff(diff, repoRoot);

    expect(applyResult.success).toBe(true);
    expect(await readFile(path.join(repoRoot, 'src', 'create.txt'), 'utf8')).toBe('created\n');
    expect(await readFile(path.join(repoRoot, 'src', 'modify.txt'), 'utf8')).toBe('after\nsame\n');
    await expect(readFile(path.join(repoRoot, 'src', 'delete.txt'), 'utf8')).rejects.toBeDefined();

    const reversePatchPath = path.join(repoRoot, 'reverse.patch');
    await writeFile(
      reversePatchPath,
      `${applyResult.metadata?.files.map((file) => file.reversePatch).join('\n') ?? ''}\n`,
      'utf8'
    );

    const rollbackResult = await rollbackLastPatch(repoRoot, reversePatchPath);
    expect(rollbackResult).toEqual({ success: true });

    for (const [filePath, originalContent] of beforeSnapshot) {
      if (originalContent === null) {
        await expect(readFile(filePath, 'utf8')).rejects.toBeDefined();
        continue;
      }

      expect(await readFile(filePath, 'utf8')).toBe(originalContent);
    }
  });

  it('matches git diff output after applying a realistic git-generated patch', async () => {
    const repoRoot = await createTempDirectory('patch-git-');
    await initializeGitRepo(repoRoot);

    await mkdir(path.join(repoRoot, 'src'), { recursive: true });
    await writeFile(path.join(repoRoot, 'src', 'modify.txt'), 'before\nsame\n', 'utf8');
    await writeFile(path.join(repoRoot, 'src', 'delete.txt'), 'remove me\n', 'utf8');
    await execFileAsync('git', ['add', '.'], { cwd: repoRoot });
    await execFileAsync('git', ['commit', '-m', 'baseline'], { cwd: repoRoot });

    await writeFile(path.join(repoRoot, 'src', 'modify.txt'), 'after\nsame\n', 'utf8');
    await writeFile(path.join(repoRoot, 'src', 'create.txt'), 'created\n', 'utf8');
    await execFileAsync('git', ['rm', 'src/delete.txt'], { cwd: repoRoot });

    const previewPatch = (
      await execFileAsync('git', ['diff', '--src-prefix=a/', '--dst-prefix=b/'], { cwd: repoRoot })
    ).stdout;

    await execFileAsync('git', ['reset', '--hard', 'HEAD'], { cwd: repoRoot });
    const diff = parseUnifiedDiff(previewPatch);
    const applyResult = await applyDiff(diff, repoRoot);

    expect(applyResult.success).toBe(true);

    const gitDiffAfterApply = (
      await execFileAsync('git', ['diff', '--src-prefix=a/', '--dst-prefix=b/'], { cwd: repoRoot })
    ).stdout;

    expect(gitDiffAfterApply).toBe(previewPatch);
  });
});
