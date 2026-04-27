import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { DEFAULT_POLICY } from '@local-agent/core';

const AGENT_DIRNAME = '.agent';
const POLICY_FILENAME = 'policy.json';
const STATE_FILENAME = 'state.json';
const SESSIONS_DIRNAME = 'sessions';
const PATCHES_DIRNAME = 'patches';
const LAST_PATCH_FILENAME = 'last-proposed.patch';

interface AgentState {
  lastProposedPatchPath: string | null;
  lastAppliedPatchPath: string | null;
}

export interface AgentPaths {
  repoRoot: string;
  agentDir: string;
  policyPath: string;
  sessionsDir: string;
  patchesDir: string;
  statePath: string;
  lastPatchPath: string;
}

export interface AgentStatus {
  repoRoot: string;
  initialized: boolean;
  agentDir: string;
  policyExists: boolean;
  sessionsDirExists: boolean;
  patchesDirExists: boolean;
  pendingPatch: string | null;
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
  };
}
