import type { Command } from 'commander';
import type { CommandResult } from './output.js';
import { renderCommandResult } from './output.js';
import type { CliRuntime } from './runtime.js';

export class CliCommandError extends Error {
  readonly exitCode: number;
  readonly data?: unknown;

  constructor(message: string, exitCode = 1, data?: unknown) {
    super(message);
    this.name = 'CliCommandError';
    this.exitCode = exitCode;
    this.data = data;
  }
}

export interface JsonOption {
  json?: boolean;
}

export function addJsonOption(command: Command): Command {
  return command.option('--json', 'Output structured JSON');
}

export function createActionHandler<TOptions extends JsonOption>(
  runtime: CliRuntime,
  handler: (options: TOptions, command: Command) => Promise<CommandResult>
): (options: TOptions, command: Command) => Promise<void> {
  return async (options: TOptions, command: Command): Promise<void> => {
    try {
      const result = await handler(options, command);
      renderCommandResult(result, options.json ?? false, runtime.io);
      runtime.setExitCode(0);
    } catch (error) {
      const commandError =
        error instanceof CliCommandError
          ? error
          : new CliCommandError(error instanceof Error ? error.message : 'Unknown command failure');

      renderCommandResult(
        {
          ok: false,
          message: commandError.message,
          data: commandError.data,
        },
        options.json ?? false,
        runtime.io
      );
      runtime.setExitCode(commandError.exitCode);
    }
  };
}
