/**
 * undo command - Rollback last applied patch
 *
 * agent undo
 */

import { Command } from 'commander';
import { addJsonOption, createActionHandler } from '../lib/commandHelpers.js';
import type { CliRuntime } from '../lib/runtime.js';
import { handleUndo } from './shared.js';

export function createUndoCommand(runtime: CliRuntime): Command {
  return addJsonOption(
    new Command('undo').description('Rollback the last applied patch').action(
      createActionHandler(runtime, async () => {
        return handleUndo(runtime.cwd);
      })
    )
  );
}
