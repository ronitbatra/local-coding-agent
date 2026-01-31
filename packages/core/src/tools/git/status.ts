/**
 * git_status - Get git repository status
 */

export interface GitStatus {
  branch: string;
  modified: string[];
  untracked: string[];
  staged: string[];
}

export async function getGitStatus(_repoRoot: string): Promise<GitStatus | null> {
  // TODO: Implement git status
  return null;
}
