/**
 * test command - Run tests
 *
 * agent test
 */

import { Command } from 'commander';
import { addJsonOption, createActionHandler } from '../lib/commandHelpers.js';
import type { CliRuntime } from '../lib/runtime.js';
import { handleTest } from './shared.js';

interface TestOptions {
  yes?: boolean;
  json?: boolean;
}

export function createTestCommand(runtime: CliRuntime): Command {
  return addJsonOption(
    new Command('test')
      .description('Run allowlisted test commands')
      .option('--yes', 'Skip confirmation prompt')
      .action(
        createActionHandler(runtime, async (options: TestOptions) => {
          return handleTest(runtime, options);
        })
      )
  );
}
