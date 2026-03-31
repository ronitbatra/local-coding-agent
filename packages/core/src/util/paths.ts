/**
 * Path utilities - Normalization and validation
 */

import { existsSync } from 'node:fs';
import path from 'node:path';

function hasRepoMarker(directory: string): boolean {
  return ['.agent', '.git', 'package.json'].some((marker) =>
    existsSync(path.join(directory, marker))
  );
}

export function resolveRepoRoot(startPath: string): string | null {
  let current = path.resolve(startPath);

  while (true) {
    if (hasRepoMarker(current)) {
      return current;
    }

    const parent = path.dirname(current);
    if (parent === current) {
      return null;
    }

    current = parent;
  }
}

export function isWithinRepo(targetPath: string, repoRoot: string): boolean {
  const normalizedRoot = path.resolve(repoRoot);
  const normalizedTarget = path.resolve(targetPath);
  const relativePath = path.relative(normalizedRoot, normalizedTarget);

  return relativePath === '' || (!relativePath.startsWith('..') && !path.isAbsolute(relativePath));
}
