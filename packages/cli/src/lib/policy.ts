import { readFile } from 'node:fs/promises';
import {
  evaluatePolicyOperation,
  isCommandAllowed,
  normalizePolicy,
  type Policy,
  type PolicyDecision,
  type PolicyOperation,
} from '@local-agent/core';
import { getAgentPaths } from './agentFs.js';
import { CliCommandError } from './commandHelpers.js';

export type AgentPolicy = Policy;

export async function loadAgentPolicy(repoRoot: string): Promise<AgentPolicy> {
  const { policyPath } = getAgentPaths(repoRoot);
  const content = await readFile(policyPath, 'utf8');
  const parsed = JSON.parse(content) as unknown;

  try {
    return normalizePolicy(parsed, repoRoot);
  } catch {
    throw new CliCommandError(`Policy file is invalid: ${policyPath}`);
  }
}

export function pickAllowedTestCommand(policy: AgentPolicy): string | null {
  const commonTestCommands = ['npm test', 'pnpm test', 'yarn test', 'vitest', 'pytest', 'go test'];

  for (const command of commonTestCommands) {
    if (isCommandAllowed(command, policy)) {
      return command;
    }
  }

  return policy.commandAllowlist[0] ?? null;
}

export function requirePolicyApproval(
  policy: AgentPolicy,
  repoRoot: string,
  operation: PolicyOperation
): PolicyDecision {
  const decision = evaluatePolicyOperation(operation, policy, repoRoot);

  if (!decision.allowed) {
    throw new CliCommandError(decision.reasons.join(' '));
  }

  return decision;
}
