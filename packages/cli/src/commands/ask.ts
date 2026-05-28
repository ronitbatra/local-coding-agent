/**
 * ask command - Ask the agent to perform a task
 *
 * agent ask "<task>"
 */

import { Command } from 'commander';
import { addJsonOption, createActionHandler } from '../lib/commandHelpers.js';
import type { CliRuntime } from '../lib/runtime.js';
import { handleAsk } from './shared.js';

interface AskOptions {
  apply?: boolean;
  autopilot?: boolean;
  dryRun?: boolean;
  noApply?: boolean;
  yes?: boolean;
  json?: boolean;
}

export function createAskCommand(runtime: CliRuntime): Command {
  return addJsonOption(
    new Command('ask')
      .description('Ask the agent to perform a coding task')
      .argument('<task>', 'The task to perform')
      .option('--dry-run', 'Preview changes without applying')
      .option('--no-apply', 'Do not apply patches automatically')
      .option('--autopilot', 'Apply proposed patches and run tests in a short fix loop')
      .option('--yes', 'Skip confirmation prompts in autopilot mode')
      .action(async (task: string, options: AskOptions, command: Command): Promise<void> => {
        return createActionHandler(runtime, async (innerOptions: AskOptions) => {
          return handleAsk(runtime, task, {
            ...innerOptions,
            noApply: innerOptions.apply === false,
          });
        })(options, command);
      })
  );
}
