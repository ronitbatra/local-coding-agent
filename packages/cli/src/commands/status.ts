/**
 * status command - Show agent status
 *
 * agent status
 */

import { Command } from 'commander';
import { addJsonOption, createActionHandler } from '../lib/commandHelpers.js';
import type { CliRuntime } from '../lib/runtime.js';
import { handleStatus } from './shared.js';

export function createStatusCommand(runtime: CliRuntime): Command {
  return addJsonOption(
    new Command('status').description('Show agent status and last run summary').action(
      createActionHandler(runtime, async () => {
        return handleStatus(runtime.cwd);
      })
    )
  );
}
