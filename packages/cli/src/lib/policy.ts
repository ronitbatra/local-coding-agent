import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
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
  return policy.commandAllowlist[0] ?? null;
}

export function discoverTestCommand(repoRoot: string, policy: AgentPolicy): string | null {
  const candidates: string[] = [];

  const add = (command: string): void => {
    if (!candidates.includes(command)) {
      candidates.push(command);
    }
  };

  if (existsSync(path.join(repoRoot, 'package.json'))) {
    add('npm test');
    add('pnpm test');
    add('yarn test');
    add('vitest');
  }
  if (
    existsSync(path.join(repoRoot, 'pytest.ini')) ||
    existsSync(path.join(repoRoot, 'pyproject.toml')) ||
    existsSync(path.join(repoRoot, 'requirements.txt'))
  ) {
    add('pytest');
  }
  if (existsSync(path.join(repoRoot, 'go.mod'))) {
    add('go test ./...');
  }

  for (const command of candidates) {
    if (isCommandAllowed(command, policy)) {
      return command;
    }
  }

  return pickAllowedTestCommand(policy);
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
