/**
 * validateDiff - Ensure paths within repo + policy, reject binary modifications
 */

import path from 'node:path';
import type { Policy } from '../../policy/Policy.js';
import { evaluatePolicyOperation } from '../../policy/validate.js';
import type { UnifiedDiff } from './parseUnifiedDiff.js';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateDiff(
  diff: UnifiedDiff,
  policy: Policy,
  repoRoot: string
): ValidationResult {
  const errors: string[] = [];

  if (diff.byteSize > policy.maxPatchSize) {
    errors.push(
      `Patch size ${diff.byteSize} bytes exceeds maxPatchSize ${policy.maxPatchSize} bytes.`
    );
  }

  if (diff.files.length > policy.maxFilesChanged) {
    errors.push(
      `Patch changes ${diff.files.length} files, exceeding maxFilesChanged ${policy.maxFilesChanged}.`
    );
  }

  let totalHunks = 0;

  for (const file of diff.files) {
    totalHunks += file.hunks.length;

    if (file.path.length === 0) {
      errors.push('Diff contains a file entry with an empty path.');
      continue;
    }

    const targetPath = path.join(repoRoot, file.path);
    const decision = evaluatePolicyOperation(
      {
        kind: 'apply',
        targetPath,
        patchSize: diff.byteSize,
        filesChanged: diff.files.length,
      },
      policy,
      repoRoot
    );

    if (!decision.allowed) {
      errors.push(...decision.reasons);
    }

    for (const hunk of file.hunks) {
      const oldLineCount = hunk.lines.filter(
        (line) => line.startsWith(' ') || line.startsWith('-')
      ).length;
      const newLineCount = hunk.lines.filter(
        (line) => line.startsWith(' ') || line.startsWith('+')
      ).length;

      if (oldLineCount !== hunk.oldLines) {
        errors.push(
          `Hunk for "${file.path}" declares ${hunk.oldLines} old lines but contains ${oldLineCount}.`
        );
      }

      if (newLineCount !== hunk.newLines) {
        errors.push(
          `Hunk for "${file.path}" declares ${hunk.newLines} new lines but contains ${newLineCount}.`
        );
      }
    }
  }

  if (totalHunks === 0) {
    errors.push('Patch does not contain any hunks.');
  }

  if (diff.raw.includes('GIT binary patch') || diff.raw.includes('Binary files ')) {
    errors.push('Binary patches are not allowed.');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
