export interface CliIO {
  stdout: (message: string) => void;
  stderr: (message: string) => void;
}

export interface CliRuntime {
  cwd: string;
  io: CliIO;
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
    },
    setExitCode: (code: number) => {
      process.exitCode = code;
    },
  };
}
