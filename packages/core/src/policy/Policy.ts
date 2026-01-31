/**
 * Policy - Schema + defaults for safety guardrails
 *
 * Defines allowed repo roots, command allowlist, file size limits,
 * patch size limits, and safe mode toggles.
 */

export interface Policy {
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

export const DEFAULT_POLICY: Policy = {
  allowedRepoRoots: [],
  commandAllowlist: [],
  maxFileSize: 1024 * 1024, // 1MB
  maxPatchSize: 100 * 1024, // 100KB
  maxFilesChanged: 50,
  safeMode: {
    readOnly: false,
    confirmApply: true,
    confirmCommands: true,
  },
};
