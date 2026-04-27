/**
 * parseUnifiedDiff - Parse unified diff format
 */

export interface UnifiedDiff {
  files: DiffFile[];
  raw: string;
  byteSize: number;
}

export interface DiffFile {
  oldPath: string | null;
  newPath: string | null;
  path: string;
  hunks: DiffHunk[];
  isNewFile: boolean;
  isDeletedFile: boolean;
}

export interface DiffHunk {
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
  lines: string[];
}

function normalizeDiffPath(rawPath: string): string | null {
  const trimmed = rawPath.trim().replace(/^([ab])\//, '');
  return trimmed === '/dev/null' ? null : trimmed;
}

function parseHunkHeader(headerLine: string): DiffHunk {
  const match = /^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/.exec(headerLine);
  if (!match) {
    throw new Error(`Invalid hunk header: ${headerLine}`);
  }

  return {
    oldStart: Number.parseInt(match[1], 10),
    oldLines: Number.parseInt(match[2] ?? '1', 10),
    newStart: Number.parseInt(match[3], 10),
    newLines: Number.parseInt(match[4] ?? '1', 10),
    lines: [],
  };
}

function finalizeFile(currentFile: DiffFile | null, files: DiffFile[]): void {
  if (!currentFile) {
    return;
  }

  if (currentFile.oldPath === null && currentFile.newPath === null) {
    throw new Error('Diff file entry is missing both old and new paths.');
  }

  if (currentFile.hunks.length === 0) {
    throw new Error(`Diff file "${currentFile.path}" does not contain any hunks.`);
  }

  files.push(currentFile);
}

export function parseUnifiedDiff(diff: string): UnifiedDiff {
  if (diff.trim().length === 0) {
    throw new Error('Unified diff is empty.');
  }

  const normalizedDiff = diff.replaceAll('\r\n', '\n');
  const lines = normalizedDiff.split('\n');
  const files: DiffFile[] = [];

  let currentFile: DiffFile | null = null;
  let currentHunk: DiffHunk | null = null;

  for (const line of lines) {
    if (line.startsWith('diff --git ')) {
      finalizeFile(currentFile, files);
      currentFile = null;
      currentHunk = null;
      continue;
    }

    if (line.startsWith('--- ')) {
      finalizeFile(currentFile, files);
      currentHunk = null;

      const oldPath = normalizeDiffPath(line.slice(4).split('\t')[0] ?? '');
      currentFile = {
        oldPath,
        newPath: null,
        path: oldPath ?? '',
        hunks: [],
        isNewFile: oldPath === null,
        isDeletedFile: false,
      };
      continue;
    }

    if (line.startsWith('+++ ')) {
      if (!currentFile) {
        throw new Error('Encountered +++ header before --- header.');
      }

      const newPath = normalizeDiffPath(line.slice(4).split('\t')[0] ?? '');
      currentFile.newPath = newPath;
      currentFile.path = newPath ?? currentFile.oldPath ?? '';
      currentFile.isDeletedFile = newPath === null;
      currentFile.isNewFile = currentFile.oldPath === null;
      continue;
    }

    if (line.startsWith('@@ ')) {
      if (!currentFile || currentFile.newPath === undefined) {
        throw new Error('Encountered hunk before file headers were complete.');
      }

      currentHunk = parseHunkHeader(line);
      currentFile.hunks.push(currentHunk);
      continue;
    }

    if (line.startsWith('\\ No newline at end of file')) {
      continue;
    }

    if (!currentHunk) {
      if (
        line === '' ||
        line.startsWith('index ') ||
        line.startsWith('new file mode ') ||
        line.startsWith('deleted file mode ') ||
        line.startsWith('similarity index ') ||
        line.startsWith('rename from ') ||
        line.startsWith('rename to ')
      ) {
        continue;
      }

      if (line.startsWith('Binary files ') || line.startsWith('GIT binary patch')) {
        throw new Error('Binary patches are not supported.');
      }

      continue;
    }

    if (line === '') {
      continue;
    }

    const prefix = line[0];
    if (prefix !== ' ' && prefix !== '+' && prefix !== '-') {
      throw new Error(`Invalid diff line prefix "${prefix}" in line: ${line}`);
    }

    currentHunk.lines.push(line);
  }

  finalizeFile(currentFile, files);

  if (files.length === 0) {
    throw new Error('Unified diff did not contain any file entries.');
  }

  return {
    files,
    raw: normalizedDiff,
    byteSize: Buffer.byteLength(normalizedDiff, 'utf8'),
  };
}
