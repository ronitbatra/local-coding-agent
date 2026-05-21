import type { Command } from 'commander';
import type { CommandResult } from './output.js';
import { renderCommandResult } from './output.js';
import type { CliRuntime } from './runtime.js';
import { startCommandSession } from './session.js';

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
    const session = await startCommandSession(runtime, command.name());
    runtime.sessionStore = session.store;
    let interrupted = false;
    const onSigint = (): void => {
      if (interrupted) {
        return;
      }

      interrupted = true;
      void (async () => {
        await session.store.abort('Interrupted by SIGINT.');
        runtime.setExitCode(130);
        process.exit(130);
      })();
    };

    process.once('SIGINT', onSigint);

    try {
      const result = await handler(options, command);
      await session.store.appendEvent('command_output', {
        stream: 'system',
        message: result.message,
      });
      await session.store.complete({
        message: result.message,
        exitCode: 0,
      });
      renderCommandResult(result, options.json ?? false, runtime.io);
      runtime.setExitCode(0);
    } catch (error) {
      const commandError =
        error instanceof CliCommandError
          ? error
          : new CliCommandError(error instanceof Error ? error.message : 'Unknown command failure');

      await session.store.fail({
        message: commandError.message,
        exitCode: commandError.exitCode,
        details: commandError.data,
      });

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
    } finally {
      runtime.sessionStore = undefined;
      process.off('SIGINT', onSigint);
    }
  };
}
