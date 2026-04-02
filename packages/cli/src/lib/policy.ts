import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { getAgentPaths } from './agentFs.js';
import { CliCommandError } from './commandHelpers.js';

export interface AgentPolicy {
  allowedRepoRoots: string[];
  commandAllowlist: string[];
  maxFileSize: number;
  maxPatchSize: number;
  maxFilesChanged: number;
  safeMode: {
    readOnly: boolean;
    confirmApply: boolean;
    confirmCommands: boolean;
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonNegativeInteger(value: unknown): value is number {
  return Number.isInteger(value) && (value as number) >= 0;
}

export function validateCliPolicy(policy: unknown): policy is AgentPolicy {
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

export async function loadAgentPolicy(repoRoot: string): Promise<AgentPolicy> {
  const { policyPath } = getAgentPaths(repoRoot);
  const content = await readFile(policyPath, 'utf8');
  const parsed = JSON.parse(content) as unknown;

  if (!validateCliPolicy(parsed)) {
    throw new CliCommandError(`Policy file is invalid: ${policyPath}`);
  }

  return {
    ...parsed,
    allowedRepoRoots:
      parsed.allowedRepoRoots.length > 0
        ? parsed.allowedRepoRoots.map((entry) => path.resolve(repoRoot, entry))
        : [repoRoot],
  };
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

export function isCommandAllowed(command: string, policy: AgentPolicy): boolean {
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
