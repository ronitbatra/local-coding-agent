/**
 * parseUnifiedDiff - Parse unified diff format
 */

export interface UnifiedDiff {
  files: DiffFile[];
}

export interface DiffFile {
  path: string;
  hunks: DiffHunk[];
}

export interface DiffHunk {
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
  lines: string[];
}

export function parseUnifiedDiff(_diff: string): UnifiedDiff {
  // TODO: Implement unified diff parsing
  return { files: [] };
}
