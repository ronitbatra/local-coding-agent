/**
 * ask command - Ask the agent to perform a task
 *
 * agent ask "<task>"
 */

import { Command } from 'commander';

export const askCommand = new Command('ask')
  .description('Ask the agent to perform a coding task')
  .argument('<task>', 'The task to perform')
  .option('--dry-run', 'Preview changes without applying')
  .option('--no-apply', 'Do not apply patches automatically')
  .action(async (task: string, _options: { dryRun?: boolean; noApply?: boolean }) => {
    // TODO: Implement ask command
    console.log(`Ask command not yet implemented. Task: ${task}`);
  });
