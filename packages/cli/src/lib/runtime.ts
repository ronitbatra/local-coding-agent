import type { SessionStore } from '@local-agent/core';

export interface CliIO {
  stdout: (message: string) => void;
  stderr: (message: string) => void;
  input: NodeJS.ReadStream;
  output: NodeJS.WriteStream;
  isInteractive: boolean;
}

export interface CliRuntime {
  cwd: string;
  io: CliIO;
  sessionStore?: SessionStore;
  setExitCode: (code: number) => void;
}

export function createRuntime(cwd = process.cwd()): CliRuntime {
  return {
    cwd,
    io: {
      stdout: (message: string) => {
        process.stdout.write(`${message}\n`);
      },
      stderr: (message: string) => {
        process.stderr.write(`${message}\n`);
      },
      input: process.stdin,
      output: process.stdout,
      isInteractive: Boolean(process.stdin.isTTY && process.stdout.isTTY),
    },
    setExitCode: (code: number) => {
      process.exitCode = code;
    },
  };
}
