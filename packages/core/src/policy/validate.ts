/**
 * Policy validation and enforcement
 *
 * Validates policy schema and enforces path normalization,
 * command allowlisting, and file size limits.
 */

import { existsSync, realpathSync } from 'node:fs';
import path from 'node:path';
import type { Policy } from './Policy';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonNegativeInteger(value: unknown): value is number {
  return Number.isInteger(value) && (value as number) >= 0;
}

function normalizeStringPath(inputPath: string): string {
  return inputPath.normalize('NFC');
}

function resolveExistingPath(inputPath: string): string {
  return realpathSync.native(inputPath);
}

function resolveParentPath(inputPath: string): string {
  const pathSegments: string[] = [];
  let currentPath = path.resolve(inputPath);

  while (!existsSync(currentPath)) {
    const parentPath = path.dirname(currentPath);
    if (parentPath === currentPath) {
      return path.resolve(inputPath);
    }

    pathSegments.unshift(path.basename(currentPath));
    currentPath = parentPath;
  }

  return path.join(resolveExistingPath(currentPath), ...pathSegments);
}

function resolvePolicyPath(inputPath: string, repoRoot: string): string {
  const normalizedInput = normalizeStringPath(inputPath);
  const absolutePath = path.isAbsolute(normalizedInput)
    ? path.resolve(normalizedInput)
    : path.resolve(repoRoot, normalizedInput);

  if (existsSync(absolutePath)) {
    return resolveExistingPath(absolutePath);
  }

  return resolveParentPath(absolutePath);
}

function isWithinRoot(targetPath: string, rootPath: string): boolean {
  const relativePath = path.relative(rootPath, targetPath);

  return relativePath === '' || (!relativePath.startsWith('..') && !path.isAbsolute(relativePath));
}

export function validatePolicy(policy: unknown): policy is Policy {
  if (!isRecord(policy)) {
    return false;
  }

  if (
    !Array.isArray(policy.allowedRepoRoots) ||
    !policy.allowedRepoRoots.every((entry) => typeof entry === 'string')
  ) {
    return false;
  }

  if (
    !Array.isArray(policy.commandAllowlist) ||
    !policy.commandAllowlist.every((entry) => typeof entry === 'string')
  ) {
    return false;
  }

  if (
    !isNonNegativeInteger(policy.maxFileSize) ||
    !isNonNegativeInteger(policy.maxPatchSize) ||
    !isNonNegativeInteger(policy.maxFilesChanged)
  ) {
    return false;
  }

  if (!isRecord(policy.safeMode)) {
    return false;
  }

  return (
    typeof policy.safeMode.readOnly === 'boolean' &&
    typeof policy.safeMode.confirmApply === 'boolean' &&
    typeof policy.safeMode.confirmCommands === 'boolean'
  );
}

export function normalizePath(targetPath: string, repoRoot: string): string {
  return resolvePolicyPath(targetPath, repoRoot);
}

export function isPathAllowed(targetPath: string, policy: Policy, repoRoot: string): boolean {
  const normalizedTargetPath = normalizePath(targetPath, repoRoot);
  const allowedRoots =
    policy.allowedRepoRoots.length > 0 ? policy.allowedRepoRoots : [path.resolve(repoRoot)];

  return allowedRoots.some((root) => {
    const normalizedRoot = resolvePolicyPath(root, repoRoot);
    return isWithinRoot(normalizedTargetPath, normalizedRoot);
  });
}

export function isCommandAllowed(command: string, policy: Policy): boolean {
  if (policy.commandAllowlist.length === 0) {
    return false;
  }

  const trimmedCommand = command.trim();
  if (trimmedCommand.length === 0) {
    return false;
  }

  const executable = trimmedCommand.split(/\s+/, 1)[0];

  return policy.commandAllowlist.some((allowedCommand) => {
    const trimmedAllowedCommand = allowedCommand.trim();
    return trimmedAllowedCommand === executable || trimmedAllowedCommand === trimmedCommand;
  });
}
