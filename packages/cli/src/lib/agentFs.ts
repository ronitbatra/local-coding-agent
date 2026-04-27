import { existsSync } from 'node:fs';
import { copyFile, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { DEFAULT_POLICY, type PatchApplicationMetadata } from '@local-agent/core';

const AGENT_DIRNAME = '.agent';
const POLICY_FILENAME = 'policy.json';
const STATE_FILENAME = 'state.json';
const SESSIONS_DIRNAME = 'sessions';
const PATCHES_DIRNAME = 'patches';
const LAST_PATCH_FILENAME = 'last-proposed.patch';
const LAST_APPLIED_PATCH_FILENAME = 'last-applied.patch';
const LAST_APPLIED_REVERSE_PATCH_FILENAME = 'last-applied.reverse.patch';
const LAST_APPLIED_METADATA_FILENAME = 'last-applied.json';

interface AgentState {
  lastProposedPatchPath: string | null;
  lastAppliedPatchPath: string | null;
}

export interface AppliedPatchRecord extends PatchApplicationMetadata {
  patchPath: string;
  reversePatchPath: string;
}

export interface AgentPaths {
  repoRoot: string;
  agentDir: string;
  policyPath: string;
  sessionsDir: string;
  patchesDir: string;
  statePath: string;
  lastPatchPath: string;
  lastAppliedPatchPath: string;
  lastAppliedReversePatchPath: string;
  lastAppliedMetadataPath: string;
}

export interface AgentStatus {
  repoRoot: string;
  initialized: boolean;
  agentDir: string;
  policyExists: boolean;
  sessionsDirExists: boolean;
  patchesDirExists: boolean;
  pendingPatch: string | null;
  lastAppliedPatch: string | null;
}

const DEFAULT_STATE: AgentState = {
  lastProposedPatchPath: null,
  lastAppliedPatchPath: null,
};

function hasRepoMarker(directory: string): boolean {
  return ['.agent', '.git', 'package.json'].some((marker) =>
    existsSync(path.join(directory, marker))
  );
}

export function resolveRepoRoot(startPath: string): string | null {
  let current = path.resolve(startPath);

  while (true) {
    if (hasRepoMarker(current)) {
      return current;
    }

    const parent = path.dirname(current);
    if (parent === current) {
      return null;
    }

    current = parent;
  }
}

export function resolveInitRoot(startPath: string): string {
  return resolveRepoRoot(startPath) ?? path.resolve(startPath);
}

export function getAgentPaths(repoRoot: string): AgentPaths {
  const agentDir = path.join(repoRoot, AGENT_DIRNAME);

  return {
    repoRoot,
    agentDir,
    policyPath: path.join(agentDir, POLICY_FILENAME),
    sessionsDir: path.join(agentDir, SESSIONS_DIRNAME),
    patchesDir: path.join(agentDir, PATCHES_DIRNAME),
    statePath: path.join(agentDir, STATE_FILENAME),
    lastPatchPath: path.join(repoRoot, AGENT_DIRNAME, PATCHES_DIRNAME, LAST_PATCH_FILENAME),
    lastAppliedPatchPath: path.join(
      repoRoot,
      AGENT_DIRNAME,
      PATCHES_DIRNAME,
      LAST_APPLIED_PATCH_FILENAME
    ),
    lastAppliedReversePatchPath: path.join(
      repoRoot,
      AGENT_DIRNAME,
      PATCHES_DIRNAME,
      LAST_APPLIED_REVERSE_PATCH_FILENAME
    ),
    lastAppliedMetadataPath: path.join(
      repoRoot,
      AGENT_DIRNAME,
      PATCHES_DIRNAME,
      LAST_APPLIED_METADATA_FILENAME
    ),
  };
}

export async function initializeAgent(repoRoot: string): Promise<AgentPaths> {
  const paths = getAgentPaths(repoRoot);

  await mkdir(paths.agentDir, { recursive: true });
  await mkdir(paths.sessionsDir, { recursive: true });
  await mkdir(paths.patchesDir, { recursive: true });

  if (!existsSync(paths.policyPath)) {
    const policy = {
      ...DEFAULT_POLICY,
      allowedRepoRoots: [repoRoot],
      safeMode: {
        ...DEFAULT_POLICY.safeMode,
      },
    };
    await writeFile(paths.policyPath, `${JSON.stringify(policy, null, 2)}\n`, 'utf8');
  }

  if (!existsSync(paths.statePath)) {
    await writeFile(paths.statePath, `${JSON.stringify(DEFAULT_STATE, null, 2)}\n`, 'utf8');
  }

  return paths;
}

export async function readAgentState(repoRoot: string): Promise<AgentState> {
  const { statePath } = getAgentPaths(repoRoot);
  if (!existsSync(statePath)) {
    return DEFAULT_STATE;
  }

  const content = await readFile(statePath, 'utf8');
  return {
    ...DEFAULT_STATE,
    ...JSON.parse(content),
  };
}

export async function writeAgentState(
  repoRoot: string,
  state: Partial<AgentState>
): Promise<AgentState> {
  const { statePath } = getAgentPaths(repoRoot);
  const nextState = {
    ...(await readAgentState(repoRoot)),
    ...state,
  };

  await writeFile(statePath, `${JSON.stringify(nextState, null, 2)}\n`, 'utf8');
  return nextState;
}

export async function recordAppliedPatch(
  repoRoot: string,
  proposedPatchPath: string,
  metadata: PatchApplicationMetadata
): Promise<AppliedPatchRecord> {
  const paths = getAgentPaths(repoRoot);
  const reversePatch = metadata.files
    .map((file) => file.reversePatch)
    .join('\n')
    .trim();

  await copyFile(proposedPatchPath, paths.lastAppliedPatchPath);
  await writeFile(
    paths.lastAppliedReversePatchPath,
    reversePatch.length > 0 ? `${reversePatch}\n` : '',
    'utf8'
  );

  const record: AppliedPatchRecord = {
    ...metadata,
    patchPath: paths.lastAppliedPatchPath,
    reversePatchPath: paths.lastAppliedReversePatchPath,
  };

  await writeFile(paths.lastAppliedMetadataPath, `${JSON.stringify(record, null, 2)}\n`, 'utf8');
  await writeAgentState(repoRoot, {
    lastAppliedPatchPath: paths.lastAppliedPatchPath,
    lastProposedPatchPath: null,
  });

  return record;
}

export async function readAppliedPatchRecord(repoRoot: string): Promise<AppliedPatchRecord | null> {
  const paths = getAgentPaths(repoRoot);
  if (!existsSync(paths.lastAppliedMetadataPath)) {
    return null;
  }

  const content = await readFile(paths.lastAppliedMetadataPath, 'utf8');
  return JSON.parse(content) as AppliedPatchRecord;
}

export async function clearAppliedPatchRecord(repoRoot: string): Promise<void> {
  const paths = getAgentPaths(repoRoot);

  await Promise.all([
    rm(paths.lastAppliedPatchPath, { force: true }),
    rm(paths.lastAppliedReversePatchPath, { force: true }),
    rm(paths.lastAppliedMetadataPath, { force: true }),
  ]);

  await writeAgentState(repoRoot, {
    lastAppliedPatchPath: null,
  });
}

export async function getAgentStatus(startPath: string): Promise<AgentStatus> {
  const repoRoot = resolveRepoRoot(startPath) ?? path.resolve(startPath);
  const paths = getAgentPaths(repoRoot);
  const initialized = existsSync(paths.agentDir);
  const state = initialized ? await readAgentState(repoRoot) : DEFAULT_STATE;

  return {
    repoRoot,
    initialized,
    agentDir: paths.agentDir,
    policyExists: existsSync(paths.policyPath),
    sessionsDirExists: existsSync(paths.sessionsDir),
    patchesDirExists: existsSync(paths.patchesDir),
    pendingPatch:
      state.lastProposedPatchPath && existsSync(state.lastProposedPatchPath)
        ? state.lastProposedPatchPath
        : null,
    lastAppliedPatch:
      state.lastAppliedPatchPath && existsSync(state.lastAppliedPatchPath)
        ? state.lastAppliedPatchPath
        : null,
  };
}
