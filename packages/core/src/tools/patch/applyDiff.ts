/**
 * applyDiff - Apply unified diff to filesystem
 */

import { existsSync } from 'node:fs';
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { DiffFile, DiffHunk, UnifiedDiff } from './parseUnifiedDiff.js';

export interface ApplyResult {
  success: boolean;
  filesChanged: string[];
  metadata?: PatchApplicationMetadata;
  error?: string;
}

export interface PatchFileMetadata {
  path: string;
  changeType: 'create' | 'modify' | 'delete';
  appliedAt: string;
  reversePatch: string;
}

export interface PatchApplicationMetadata {
  appliedAt: string;
  fileCount: number;
  files: PatchFileMetadata[];
}

function getAbsolutePath(repoRoot: string, relativePath: string): string {
  return path.join(repoRoot, relativePath);
}

async function readExistingLines(targetPath: string): Promise<string[]> {
  if (!existsSync(targetPath)) {
    return [];
  }

  const content = await readFile(targetPath, 'utf8');
  return content.split('\n');
}

function buildReverseHunk(_file: DiffFile, hunk: DiffHunk): string {
  const reversedLines = hunk.lines.map((line) => {
    if (line.startsWith('+')) {
      return `-${line.slice(1)}`;
    }

    if (line.startsWith('-')) {
      return `+${line.slice(1)}`;
    }

    return line;
  });

  const header = `@@ -${hunk.newStart},${hunk.newLines} +${hunk.oldStart},${hunk.oldLines} @@`;

  return [header, ...reversedLines].join('\n');
}

function buildReversePatch(file: DiffFile): string {
  const oldHeader = file.newPath === null ? '/dev/null' : `a/${file.newPath}`;
  const newHeader = file.oldPath === null ? '/dev/null' : `b/${file.oldPath}`;

  const headerLines = [
    `--- ${oldHeader}`,
    `+++ ${newHeader}`,
    ...file.hunks.map((hunk) => buildReverseHunk(file, hunk)),
  ];

  return `${headerLines.join('\n')}\n`;
}

function determineChangeType(file: DiffFile): 'create' | 'modify' | 'delete' {
  if (file.isNewFile) {
    return 'create';
  }

  if (file.isDeletedFile) {
    return 'delete';
  }

  return 'modify';
}

function serializeLines(lines: string[]): string {
  if (lines.length === 0) {
    return '';
  }

  if (lines.at(-1) === '') {
    return lines.join('\n');
  }

  return `${lines.join('\n')}\n`;
}

function applyHunksToLines(originalLines: string[], file: DiffFile): string[] {
  const result = [...originalLines];
  let lineOffset = 0;

  for (const hunk of file.hunks) {
    let index = hunk.oldStart - 1 + lineOffset;

    if (hunk.oldStart === 0) {
      index = 0;
    }

    for (const line of hunk.lines) {
      const operation = line[0];
      const value = line.slice(1);

      if (operation === ' ') {
        if ((result[index] ?? '') !== value) {
          throw new Error(`Context mismatch while applying patch to "${file.path}".`);
        }
        index += 1;
        continue;
      }

      if (operation === '-') {
        if ((result[index] ?? '') !== value) {
          throw new Error(`Deletion mismatch while applying patch to "${file.path}".`);
        }
        result.splice(index, 1);
        lineOffset -= 1;
        continue;
      }

      if (operation === '+') {
        result.splice(index, 0, value);
        index += 1;
        lineOffset += 1;
      }
    }
  }

  return result;
}

async function applyFileDiff(
  file: DiffFile,
  repoRoot: string,
  dryRun: boolean
): Promise<PatchFileMetadata> {
  const targetPath = getAbsolutePath(repoRoot, file.path);
  const originalLines = await readExistingLines(targetPath);
  const nextLines = applyHunksToLines(originalLines, file);
  const appliedAt = new Date().toISOString();

  if (!dryRun) {
    if (file.isDeletedFile) {
      if (existsSync(targetPath)) {
        await unlink(targetPath);
      }
    } else {
      await mkdir(path.dirname(targetPath), { recursive: true });
      const nextContent = serializeLines(nextLines);
      await writeFile(targetPath, nextContent, 'utf8');
    }
  }

  return {
    path: file.path,
    changeType: determineChangeType(file),
    appliedAt,
    reversePatch: buildReversePatch(file),
  };
}

export async function applyDiff(
  diff: UnifiedDiff,
  repoRoot: string,
  dryRun = false
): Promise<ApplyResult> {
  try {
    const files: PatchFileMetadata[] = [];

    for (const file of diff.files) {
      files.push(await applyFileDiff(file, repoRoot, dryRun));
    }

    return {
      success: true,
      filesChanged: diff.files.map((file) => file.path),
      metadata: {
        appliedAt: new Date().toISOString(),
        fileCount: diff.files.length,
        files,
      },
    };
  } catch (error) {
    return {
      success: false,
      filesChanged: [],
      error: error instanceof Error ? error.message : 'Unknown patch apply failure',
    };
  }
}
