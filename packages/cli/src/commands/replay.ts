/**
 * replay command - Render a stored session log
 *
 * agent replay <session>
 */

import { Command } from 'commander';
import { addJsonOption, createActionHandler } from '../lib/commandHelpers.js';
import type { CliRuntime } from '../lib/runtime.js';
import { handleReplay } from './shared.js';

interface ReplayOptions {
  json?: boolean;
}

export function createReplayCommand(runtime: CliRuntime): Command {
  return addJsonOption(
    new Command('replay')
      .description('Replay a stored session log')
      .argument('<session>', 'Session ID to replay')
      .action(
        async (sessionId: string, options: ReplayOptions, command: Command): Promise<void> => {
          return createActionHandler(runtime, async () => {
            return handleReplay(runtime.cwd, sessionId);
          })(options, command);
        }
      )
  );
}
