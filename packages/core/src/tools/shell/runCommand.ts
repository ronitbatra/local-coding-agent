/**
 * runCommand - Execute allowlisted commands with timeouts
 */

import { spawn } from 'node:child_process';
import type { Policy } from '../../policy/Policy.js';
import { evaluatePolicyOperation } from '../../policy/validate.js';
import type { Tool, ToolResult } from '../Tool.js';

export interface CommandResult {
  exitCode: number;
  stdout: string;
  stderr: string;
  timedOut: boolean;
  truncated: boolean;
}

export interface RunCommandToolOptions {
  repoRoot: string;
  policy: Policy;
  defaultTimeoutMs?: number;
  maxOutputBytes?: number;
}

export class RunCommandTool implements Tool {
  name = 'run_command';
  description = 'Run an allowlisted shell command with timeout';

  private readonly repoRoot: string;
  private readonly policy: Policy;
  private readonly defaultTimeoutMs: number;
  private readonly maxOutputBytes: number;

  constructor(options: RunCommandToolOptions) {
    this.repoRoot = options.repoRoot;
    this.policy = options.policy;
    this.defaultTimeoutMs = options.defaultTimeoutMs ?? 60_000;
    this.maxOutputBytes = options.maxOutputBytes ?? 128 * 1024;
  }

  async execute(args: { command: string; timeout?: number }): Promise<ToolResult<CommandResult>> {
    if (!args?.command || typeof args.command !== 'string') {
      return { success: false, error: 'command must be a non-empty string' };
    }

    const command = args.command.trim();
    if (command.length === 0) {
      return { success: false, error: 'command must be a non-empty string' };
    }

    const decision = evaluatePolicyOperation(
      {
        kind: 'command',
        command,
      },
      this.policy,
      this.repoRoot
    );

    if (!decision.allowed) {
      return { success: false, error: decision.reasons.join(' ') };
    }

    const timeoutMs =
      typeof args.timeout === 'number' && Number.isFinite(args.timeout) && args.timeout > 0
        ? Math.floor(args.timeout)
        : this.defaultTimeoutMs;

    return new Promise((resolve) => {
      const child = spawn(command, {
        cwd: this.repoRoot,
        shell: true,
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      let stdout = '';
      let stderr = '';
      let timedOut = false;
      let truncated = false;

      const appendWithCap = (current: string, chunkText: string): string => {
        if (truncated) {
          return current;
        }

        const next = current + chunkText;
        const byteLength = Buffer.byteLength(next, 'utf8');
        if (byteLength <= this.maxOutputBytes) {
          return next;
        }

        truncated = true;
        const allowedBytes = this.maxOutputBytes - Buffer.byteLength(current, 'utf8');
        if (allowedBytes <= 0) {
          return current;
        }

        const chunkBuffer = Buffer.from(chunkText, 'utf8');
        return current + chunkBuffer.subarray(0, allowedBytes).toString('utf8');
      };

      const timeoutId = setTimeout(() => {
        timedOut = true;
        child.kill('SIGTERM');
        setTimeout(() => {
          if (!child.killed) {
            child.kill('SIGKILL');
          }
        }, 2_000);
      }, timeoutMs);

      child.stdout.on('data', (chunk: Buffer) => {
        stdout = appendWithCap(stdout, chunk.toString('utf8'));
      });

      child.stderr.on('data', (chunk: Buffer) => {
        stderr = appendWithCap(stderr, chunk.toString('utf8'));
      });

      child.on('error', (error) => {
        clearTimeout(timeoutId);
        resolve({ success: false, error: error.message });
      });

      child.on('close', (code) => {
        clearTimeout(timeoutId);
        resolve({
          success: true,
          data: {
            exitCode: typeof code === 'number' ? code : 1,
            stdout,
            stderr,
            timedOut,
            truncated,
          },
        });
      });
    });
  }
}
