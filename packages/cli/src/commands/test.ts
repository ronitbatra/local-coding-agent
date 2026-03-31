/**
 * test command - Run tests
 *
 * agent test
 */

import { Command } from 'commander';
import { addJsonOption, createActionHandler } from '../lib/commandHelpers.js';
import type { CliRuntime } from '../lib/runtime.js';
import { handleTest } from './shared.js';

export function createTestCommand(runtime: CliRuntime): Command {
  return addJsonOption(
    new Command('test').description('Run allowlisted test commands').action(
      createActionHandler(runtime, async () => {
        return handleTest(runtime.cwd);
      })
    )
  );
}
