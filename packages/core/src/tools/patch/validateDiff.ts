/**
 * validateDiff - Ensure paths within repo + policy, reject binary modifications
 */

import type { UnifiedDiff } from './parseUnifiedDiff';
import type { Policy } from '../../policy/Policy';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateDiff(diff: UnifiedDiff, policy: Policy, repoRoot: string): ValidationResult {
  // TODO: Implement diff validation
  return { valid: true, errors: [] };
}
