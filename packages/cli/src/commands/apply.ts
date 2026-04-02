/**
 * apply command - Apply proposed patch
 *
 * agent apply
 */

import { Command } from 'commander';
import { addJsonOption, createActionHandler } from '../lib/commandHelpers.js';
import type { CliRuntime } from '../lib/runtime.js';
import { handleApply } from './shared.js';

interface ApplyOptions {
  yes?: boolean;
  json?: boolean;
}

export function createApplyCommand(runtime: CliRuntime): Command {
  return addJsonOption(
    new Command('apply')
      .description('Apply the last proposed patch')
      .option('--yes', 'Skip confirmation prompt')
      .action(
        createActionHandler(runtime, async (options: ApplyOptions) => {
          return handleApply(runtime, options);
        })
      )
  );
}
