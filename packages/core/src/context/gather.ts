/**
 * gather - Retrieval: ripgrep + targeted reads
 *
 * Gathers minimal context needed for the agent to work.
 * Keeps context small for 8GB machines.
 */

export interface Context {
  files: Array<{ path: string; content: string }>;
  searchResults: Array<{ path: string; matches: string[] }>;
}

export async function gatherContext(_query: string, _repoRoot: string): Promise<Context> {
  // TODO: Implement context gathering
  return { files: [], searchResults: [] };
}
