import { readFile, rm, stat } from 'node:fs/promises';
import path from 'node:path';
import { applyDiff, parseUnifiedDiff, rollbackLastPatch, validateDiff } from '@local-agent/core';
import {
  clearAppliedPatchRecord,
  getAgentStatus,
  initializeAgent,
  readAgentState,
  readAppliedPatchRecord,
  recordAppliedPatch,
  resolveInitRoot,
  resolveRepoRoot,
} from '../lib/agentFs.js';
import { CliCommandError } from '../lib/commandHelpers.js';
import type { CommandResult } from '../lib/output.js';
import { loadAgentPolicy, pickAllowedTestCommand, requirePolicyApproval } from '../lib/policy.js';
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
      `Apply: ${options.noApply ? 'disabled via --no-apply' : 'not yet available in ask flow'}`,
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
  const state = await readAgentState(repoRoot);
  if (!state.lastProposedPatchPath) {
    throw new CliCommandError(
      'No patch is currently queued. Run `agent ask` once patch generation exists.'
    );
  }

  const pendingPatchPath = state.lastProposedPatchPath;
  const pendingPatchStat = await stat(pendingPatchPath).catch(() => null);
  if (!pendingPatchStat) {
    throw new CliCommandError('The queued patch file no longer exists.', 1, {
      pendingPatch: pendingPatchPath,
    });
  }

  const decision = requirePolicyApproval(policy, repoRoot, {
    kind: 'apply',
    targetPath: pendingPatchPath,
    patchSize: pendingPatchStat?.size,
  });

  await requireInteractiveConfirmation(
    runtime,
    options,
    decision.requiresConfirmation,
    async () => confirmApply(runtime.io, [path.basename(pendingPatchPath)]),
    'applying the pending patch'
  );

  let diffText: string;

  try {
    diffText = await readFile(pendingPatchPath, 'utf8');
  } catch {
    throw new CliCommandError('Unable to read the queued patch file.', 1, {
      pendingPatch: pendingPatchPath,
    });
  }

  let diff: ReturnType<typeof parseUnifiedDiff>;
  try {
    diff = parseUnifiedDiff(diffText);
  } catch (error) {
    throw new CliCommandError(error instanceof Error ? error.message : 'Invalid unified diff.', 1);
  }

  const validation = validateDiff(diff, policy, repoRoot);
  if (!validation.valid) {
    throw new CliCommandError(validation.errors.join(' '), 1);
  }

  const applyResult = await applyDiff(diff, repoRoot);
  if (!applyResult.success || !applyResult.metadata) {
    throw new CliCommandError(applyResult.error ?? 'Patch application failed.', 1);
  }

  const record = await recordAppliedPatch(repoRoot, pendingPatchPath, applyResult.metadata);
  await rm(pendingPatchPath, { force: true });

  return {
    ok: true,
    message: `Applied patch touching ${applyResult.filesChanged.length} file(s).`,
    data: {
      repoRoot,
      filesChanged: applyResult.filesChanged,
      appliedAt: record.appliedAt,
    },
    human: [
      `Applied patch touching ${applyResult.filesChanged.length} file(s).`,
      ...applyResult.filesChanged.map((filePath) => `Changed: ${filePath}`),
    ],
  };
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
      `Last applied patch: ${status.lastAppliedPatch ?? 'none'}`,
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
  const decision = requirePolicyApproval(policy, repoRoot, {
    kind: 'command',
    command: commandToRun,
  });

  await requireInteractiveConfirmation(
    runtime,
    options,
    decision.requiresConfirmation,
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

  const record = await readAppliedPatchRecord(repoRoot);
  if (!record) {
    throw new CliCommandError('No applied patch is available to undo.');
  }

  const rollbackResult = await rollbackLastPatch(repoRoot, record.reversePatchPath);
  if (!rollbackResult.success) {
    throw new CliCommandError(rollbackResult.error ?? 'Rollback failed.');
  }

  await clearAppliedPatchRecord(repoRoot);

  return {
    ok: true,
    message: 'Rolled back the last applied patch.',
    data: { repoRoot, patchPath: record.patchPath },
    human: ['Rolled back the last applied patch.', `Patch: ${record.patchPath}`],
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
