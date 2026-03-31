import path from 'node:path';
import {
  getAgentStatus,
  initializeAgent,
  readAgentState,
  resolveInitRoot,
  resolveRepoRoot,
} from '../lib/agentFs.js';
import { CliCommandError } from '../lib/commandHelpers.js';
import type { CommandResult } from '../lib/output.js';

export async function handleInit(cwd: string): Promise<CommandResult> {
  const repoRoot = resolveInitRoot(cwd);
  const paths = await initializeAgent(repoRoot);

  return {
    ok: true,
    message: `Initialized agent configuration in ${paths.agentDir}`,
    data: {
      repoRoot,
      agentDir: paths.agentDir,
      policyPath: paths.policyPath,
      sessionsDir: paths.sessionsDir,
      patchesDir: paths.patchesDir,
    },
    human: [
      `Initialized agent configuration in ${paths.agentDir}`,
      `Policy: ${paths.policyPath}`,
      `Sessions: ${paths.sessionsDir}`,
      `Patches: ${paths.patchesDir}`,
    ],
  };
}

export async function handleAsk(
  cwd: string,
  task: string,
  options: { dryRun?: boolean; noApply?: boolean }
): Promise<CommandResult> {
  const repoRoot = resolveRepoRoot(cwd);
  if (!repoRoot) {
    throw new CliCommandError(
      'No repository root found. Run `agent init` from your project first.'
    );
  }

  const status = await getAgentStatus(repoRoot);
  if (!status.initialized) {
    throw new CliCommandError(
      'Agent is not initialized in this repository. Run `agent init` first.'
    );
  }

  return {
    ok: true,
    message: `Accepted task: ${task}`,
    data: {
      task,
      repoRoot,
      dryRun: options.dryRun ?? false,
      noApply: options.noApply ?? false,
      applied: false,
    },
    human: [
      `Accepted task: ${task}`,
      `Mode: ${options.dryRun ? 'dry-run' : 'proposal only'}`,
      `Apply: ${options.noApply ? 'disabled' : 'not yet available in ask flow'}`,
      'Patch generation is introduced in later milestones.',
    ],
  };
}

export async function handleApply(cwd: string): Promise<CommandResult> {
  const repoRoot = resolveRepoRoot(cwd);
  if (!repoRoot) {
    throw new CliCommandError(
      'No repository root found. Run `agent init` from your project first.'
    );
  }

  const status = await getAgentStatus(repoRoot);
  if (!status.initialized) {
    throw new CliCommandError(
      'Agent is not initialized in this repository. Run `agent init` first.'
    );
  }

  const state = await readAgentState(repoRoot);
  if (!state.lastProposedPatchPath) {
    throw new CliCommandError(
      'No patch is currently queued. Run `agent ask` once patch generation exists.'
    );
  }

  throw new CliCommandError('Patch application is implemented in Milestone 3.', 1, {
    pendingPatch: state.lastProposedPatchPath,
  });
}

export async function handleStatus(cwd: string): Promise<CommandResult> {
  const status = await getAgentStatus(cwd);

  return {
    ok: true,
    message: status.initialized
      ? 'Agent repository is initialized.'
      : 'Agent repository is not initialized.',
    data: status,
    human: [
      'Agent Status',
      `Repo root: ${status.repoRoot}`,
      `Initialized: ${status.initialized ? 'yes' : 'no'}`,
      `Agent dir: ${status.agentDir}`,
      `Policy file: ${status.policyExists ? 'present' : 'missing'}`,
      `Sessions dir: ${status.sessionsDirExists ? 'present' : 'missing'}`,
      `Patches dir: ${status.patchesDirExists ? 'present' : 'missing'}`,
      `Pending patch: ${status.pendingPatch ?? 'none'}`,
    ],
  };
}

export async function handleTest(cwd: string): Promise<CommandResult> {
  const repoRoot = resolveRepoRoot(cwd);
  if (!repoRoot) {
    throw new CliCommandError(
      'No repository root found. Run `agent init` from your project first.'
    );
  }

  return {
    ok: true,
    message: 'Test command routing is wired. Command execution arrives in Milestone 7.',
    data: { repoRoot },
  };
}

export async function handleUndo(cwd: string): Promise<CommandResult> {
  const repoRoot = resolveRepoRoot(cwd);
  if (!repoRoot) {
    throw new CliCommandError(
      'No repository root found. Run `agent init` from your project first.'
    );
  }

  return {
    ok: true,
    message: 'Undo command routing is wired. Rollback support arrives in Milestone 3.',
    data: { repoRoot },
  };
}

export async function handleDoctor(cwd: string): Promise<CommandResult> {
  const repoRoot = resolveRepoRoot(cwd) ?? path.resolve(cwd);

  return {
    ok: true,
    message: 'Doctor command routing is wired. Full environment checks arrive in Milestone 9.',
    data: { repoRoot },
  };
}
