import path from 'node:path';
import { type SessionRecord, SessionStore } from '@local-agent/core';
import { getAgentPaths, resolveInitRoot, resolveRepoRoot } from './agentFs.js';
import type { CliRuntime } from './runtime.js';

export interface CommandSession {
  repoRoot: string;
  store: SessionStore;
  sessionId: string;
}

export async function startCommandSession(
  runtime: CliRuntime,
  commandName: string
): Promise<CommandSession> {
  const repoRoot =
    commandName === 'init'
      ? resolveInitRoot(runtime.cwd)
      : (resolveRepoRoot(runtime.cwd) ?? path.resolve(runtime.cwd));
  const store = new SessionStore(getAgentPaths(repoRoot).sessionsDir);
  const metadata = await store.startSession(commandName, runtime.cwd);

  await store.appendEvent('command_started', {
    command: commandName,
    cwd: runtime.cwd,
  });

  return {
    repoRoot,
    store,
    sessionId: metadata.sessionId,
  };
}

export async function readLatestSessionForPath(startPath: string): Promise<SessionRecord | null> {
  const repoRoot = resolveRepoRoot(startPath) ?? path.resolve(startPath);
  const store = new SessionStore(getAgentPaths(repoRoot).sessionsDir);
  return store.getLatestSession();
}

export async function readSessionById(
  startPath: string,
  sessionId: string
): Promise<SessionRecord | null> {
  const repoRoot = resolveRepoRoot(startPath) ?? path.resolve(startPath);
  const store = new SessionStore(getAgentPaths(repoRoot).sessionsDir);

  try {
    return await store.readSession(sessionId);
  } catch {
    return null;
  }
}
