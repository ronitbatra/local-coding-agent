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

export async function gatherContext(query: string, repoRoot: string): Promise<Context> {
  // TODO: Implement context gathering
  return { files: [], searchResults: [] };
}
