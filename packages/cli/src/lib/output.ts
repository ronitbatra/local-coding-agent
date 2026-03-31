import type { CliIO } from './runtime.js';

export interface CommandResult {
  ok: boolean;
  message: string;
  data?: unknown;
  human?: string[];
}

export function renderCommandResult(result: CommandResult, json: boolean, io: CliIO): void {
  if (json) {
    io.stdout(
      JSON.stringify(
        {
          status: result.ok ? 'ok' : 'error',
          message: result.message,
          data: result.data ?? null,
        },
        null,
        2
      )
    );
    return;
  }

  const lines = result.human ?? [result.message];
  const target = result.ok ? io.stdout : io.stderr;

  for (const line of lines) {
    target(line);
  }
}
