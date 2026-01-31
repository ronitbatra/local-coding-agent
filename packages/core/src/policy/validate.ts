/**
 * Policy validation and enforcement
 * 
 * Validates policy schema and enforces path normalization,
 * command allowlisting, and file size limits.
 */

import type { Policy } from './Policy';

export function validatePolicy(policy: unknown): policy is Policy {
  // TODO: Implement policy validation
  return true;
}

export function normalizePath(path: string, repoRoot: string): string {
  // TODO: Implement path normalization (handle symlinks, .., unicode)
  return path;
}

export function isPathAllowed(path: string, policy: Policy, repoRoot: string): boolean {
  // TODO: Implement path allowlist check
  return true;
}

export function isCommandAllowed(command: string, policy: Policy): boolean {
  // TODO: Implement command allowlist check
  return policy.commandAllowlist.length === 0 || policy.commandAllowlist.includes(command);
}
