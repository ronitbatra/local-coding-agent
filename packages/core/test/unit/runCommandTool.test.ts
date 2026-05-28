/**
 * RunCommandTool tests
 */

import { describe, expect, it } from 'vitest';
import { DEFAULT_POLICY } from '../../src/policy/Policy';
import { RunCommandTool } from '../../src/tools/shell/runCommand';

describe('RunCommandTool', () => {
  it('runs allowlisted commands in the repo root', async () => {
    const tool = new RunCommandTool({
      repoRoot: process.cwd(),
      policy: {
        ...DEFAULT_POLICY,
        commandAllowlist: ['node --version'],
      },
      defaultTimeoutMs: 2_000,
    });

    const result = await tool.execute({ command: 'node --version' });
    expect(result.success).toBe(true);
    expect(result.data?.exitCode).toBe(0);
    expect(result.data?.timedOut).toBe(false);
  });

  it('blocks commands outside the allowlist', async () => {
    const tool = new RunCommandTool({
      repoRoot: process.cwd(),
      policy: {
        ...DEFAULT_POLICY,
        commandAllowlist: ['node --version'],
      },
    });

    const result = await tool.execute({ command: 'npm test' });
    expect(result.success).toBe(false);
    expect(result.error).toContain('commandAllowlist');
  });

  it('enforces timeouts', async () => {
    const tool = new RunCommandTool({
      repoRoot: process.cwd(),
      policy: {
        ...DEFAULT_POLICY,
        commandAllowlist: ['node -e "setTimeout(() => {}, 2000)"'],
      },
      defaultTimeoutMs: 100,
    });

    const result = await tool.execute({ command: 'node -e "setTimeout(() => {}, 2000)"' });
    expect(result.success).toBe(true);
    expect(result.data?.timedOut).toBe(true);
  });
});
