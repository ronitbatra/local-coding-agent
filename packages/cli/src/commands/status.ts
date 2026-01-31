/**
 * status command - Show agent status
 *
 * agent status
 */

import { Command } from 'commander';

export const statusCommand = new Command('status')
  .description('Show agent status and last run summary')
  .option('--json', 'Output as JSON')
  .action(async (_options: { json?: boolean }) => {
    // TODO: Implement status command
    console.log('Status command not yet implemented');
  });
