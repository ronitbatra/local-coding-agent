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
import { loadAgentPolicy, pickAllowedTestCommand } from '../lib/policy.js';
import type { CliRuntime } from '../lib/runtime.js';
import { confirmApply, confirmCommand } from '../ui/prompts.js';

interface ConfirmationOptions {
  yes?: boolean;
}

async function requireInteractiveConfirmation(
  runtime: CliRuntime,
  options: ConfirmationOptions,
  needsConfirmation: boolean,
  prompt: () => Promise<boolean>,
  description: string
): Promise<void> {
  if (!needsConfirmation || options.yes) {
    return;
  }

  if (!runtime.io.isInteractive) {
    throw new CliCommandError(
      `Confirmation required before ${description}, but no TTY is available. Re-run with --yes or update policy.json.`
    );
  }

  const confirmed = await prompt();
  if (!confirmed) {
    throw new CliCommandError(`Aborted ${description}.`, 1, {
      confirmed: false,
    });
  }
}

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

export async function handleApply(
  runtime: CliRuntime,
  options: ConfirmationOptions
): Promise<CommandResult> {
  const repoRoot = resolveRepoRoot(runtime.cwd);
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

  const policy = await loadAgentPolicy(repoRoot);
  if (policy.safeMode.readOnly) {
    throw new CliCommandError('Policy blocks patch application because safeMode.readOnly is true.');
  }

  const state = await readAgentState(repoRoot);
  if (!state.lastProposedPatchPath) {
    throw new CliCommandError(
      'No patch is currently queued. Run `agent ask` once patch generation exists.'
    );
  }

  const pendingPatchPath = state.lastProposedPatchPath;

  await requireInteractiveConfirmation(
    runtime,
    options,
    policy.safeMode.confirmApply,
    async () => confirmApply(runtime.io, [path.basename(pendingPatchPath)]),
    'applying the pending patch'
  );

  throw new CliCommandError('Patch application is implemented in Milestone 3.', 1, {
    pendingPatch: pendingPatchPath,
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

export async function handleTest(
  runtime: CliRuntime,
  options: ConfirmationOptions
): Promise<CommandResult> {
  const repoRoot = resolveRepoRoot(runtime.cwd);
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

  const policy = await loadAgentPolicy(repoRoot);
  const selectedCommand = pickAllowedTestCommand(policy);

  if (!selectedCommand) {
    throw new CliCommandError(
      'No allowlisted test command is configured. Update .agent/policy.json first.'
    );
  }

  const commandToRun = selectedCommand;

  await requireInteractiveConfirmation(
    runtime,
    options,
    policy.safeMode.confirmCommands,
    async () => confirmCommand(runtime.io, commandToRun),
    `running "${commandToRun}"`
  );

  return {
    ok: true,
    message: 'Policy checks passed. Command execution arrives in Milestone 7.',
    data: {
      repoRoot,
      command: commandToRun,
      confirmed: !policy.safeMode.confirmCommands || options.yes || runtime.io.isInteractive,
    },
    human: [
      'Policy checks passed.',
      `Selected test command: ${commandToRun}`,
      'Command execution arrives in Milestone 7.',
    ],
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
