/**
 * init command - Initialize agent configuration
 *
 * Creates .agent/ folder with policy.json and session directory.
 */

import { Command } from 'commander';

export const initCommand = new Command('init')
  .description('Initialize agent configuration in current repository')
  .action(async () => {
    // TODO: Implement init command
    console.log('Init command not yet implemented');
  });
