/**
 * Policy unit tests
 */

import { mkdir, mkdtemp, symlink, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { DEFAULT_POLICY, type Policy } from '../../src/policy/Policy';
import {
  isCommandAllowed,
  isPathAllowed,
  normalizePath,
  validatePolicy,
} from '../../src/policy/validate';

describe('Policy', () => {
  it('should have default policy', () => {
    expect(DEFAULT_POLICY).toBeDefined();
    expect(DEFAULT_POLICY.maxFileSize).toBe(1024 * 1024);
  });

  it('should validate valid policy', () => {
    const policy: Policy = { ...DEFAULT_POLICY };
    expect(validatePolicy(policy)).toBe(true);
  });

  it('rejects invalid policy shapes', () => {
    expect(validatePolicy(null)).toBe(false);
    expect(
      validatePolicy({
        ...DEFAULT_POLICY,
        commandAllowlist: 'npm test',
      })
    ).toBe(false);
    expect(
      validatePolicy({
        ...DEFAULT_POLICY,
        safeMode: {
          readOnly: false,
          confirmApply: 'yes',
          confirmCommands: true,
        },
      })
    ).toBe(false);
  });

  it('denies paths outside the allowed repo root', async () => {
    const repoRoot = await mkdtemp(path.join(os.tmpdir(), 'policy-root-'));
    const outsideFile = path.join(path.dirname(repoRoot), 'secret.txt');
    const policy: Policy = {
      ...DEFAULT_POLICY,
      allowedRepoRoots: [repoRoot],
    };

    expect(isPathAllowed('src/index.ts', policy, repoRoot)).toBe(true);
    expect(isPathAllowed(`..${path.sep}secret.txt`, policy, repoRoot)).toBe(false);
    expect(isPathAllowed(outsideFile, policy, repoRoot)).toBe(false);
  });

  it('resolves symlink escapes before checking policy boundaries', async () => {
    const repoRoot = await mkdtemp(path.join(os.tmpdir(), 'policy-symlink-'));
    const outsideRoot = await mkdtemp(path.join(os.tmpdir(), 'policy-outside-'));
    const outsideFile = path.join(outsideRoot, 'secret.txt');
    const linkPath = path.join(repoRoot, 'linked-secret.txt');
    const policy: Policy = {
      ...DEFAULT_POLICY,
      allowedRepoRoots: [repoRoot],
    };

    await writeFile(outsideFile, 'secret\n', 'utf8');
    await symlink(outsideFile, linkPath);

    expect(isPathAllowed(linkPath, policy, repoRoot)).toBe(false);
  });

  it('normalizes unicode-equivalent paths consistently', async () => {
    const repoRoot = await mkdtemp(path.join(os.tmpdir(), 'policy-unicode-'));
    const composed = 'caf\u00e9';
    const decomposed = 'cafe\u0301';
    const normalizedRepoRoot = normalizePath('.', repoRoot);
    const expectedPath = path.join(normalizedRepoRoot, composed, 'file.ts');

    await mkdir(path.join(repoRoot, composed), { recursive: true });

    expect(normalizePath(path.join(decomposed, 'file.ts'), repoRoot)).toBe(expectedPath);
  });

  it('requires explicit command allowlisting', () => {
    const policy: Policy = {
      ...DEFAULT_POLICY,
      commandAllowlist: ['npm test', 'vitest'],
    };

    expect(isCommandAllowed('npm test', policy)).toBe(true);
    expect(isCommandAllowed('vitest run', policy)).toBe(true);
    expect(isCommandAllowed('npm run build', policy)).toBe(false);
    expect(isCommandAllowed('pytest', DEFAULT_POLICY)).toBe(false);
  });
});
