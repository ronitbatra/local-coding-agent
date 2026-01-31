/**
 * runCommand - Execute allowlisted commands with timeouts
 */

import type { Tool, ToolResult } from '../Tool';

export interface CommandResult {
  exitCode: number;
  stdout: string;
  stderr: string;
  timedOut: boolean;
}

export class RunCommandTool implements Tool {
  name = 'run_command';
  description = 'Run an allowlisted shell command with timeout';

  async execute(_args: { command: string; timeout?: number }): Promise<ToolResult<CommandResult>> {
    // TODO: Implement command execution with policy checks and timeout
    return { success: false, error: 'Not implemented' };
  }
}
