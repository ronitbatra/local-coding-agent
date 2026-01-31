/**
 * test command - Run tests
 *
 * agent test
 */

import { Command } from 'commander';

export const testCommand = new Command('test')
  .description('Run allowlisted test commands')
  .action(async () => {
    // TODO: Implement test command
    console.log('Test command not yet implemented');
  });
