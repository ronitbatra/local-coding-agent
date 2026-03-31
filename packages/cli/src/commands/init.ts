/**
 * init command - Initialize agent configuration
 *
 * Creates .agent/ folder with policy.json and session directory.
 */

import { Command } from 'commander';
import { addJsonOption, createActionHandler } from '../lib/commandHelpers.js';
import type { CliRuntime } from '../lib/runtime.js';
import { handleInit } from './shared.js';

export function createInitCommand(runtime: CliRuntime): Command {
  return addJsonOption(
    new Command('init').description('Initialize agent configuration in current repository').action(
      createActionHandler(runtime, async () => {
        return handleInit(runtime.cwd);
      })
    )
  );
}
