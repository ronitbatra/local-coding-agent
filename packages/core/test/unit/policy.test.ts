/**
 * Policy unit tests
 */

import { describe, expect, it } from 'vitest';
import { DEFAULT_POLICY, type Policy } from '../../src/policy/Policy';
import { validatePolicy } from '../../src/policy/validate';

describe('Policy', () => {
  it('should have default policy', () => {
    expect(DEFAULT_POLICY).toBeDefined();
    expect(DEFAULT_POLICY.maxFileSize).toBe(1024 * 1024);
  });

  it('should validate valid policy', () => {
    const policy: Policy = { ...DEFAULT_POLICY };
    expect(validatePolicy(policy)).toBe(true);
  });
});
