/**
 * validateDiff - Ensure paths within repo + policy, reject binary modifications
 */

import type { Policy } from '../../policy/Policy';
import type { UnifiedDiff } from './parseUnifiedDiff';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateDiff(
  _diff: UnifiedDiff,
  _policy: Policy,
  _repoRoot: string
): ValidationResult {
  // TODO: Implement diff validation
  return { valid: true, errors: [] };
}
