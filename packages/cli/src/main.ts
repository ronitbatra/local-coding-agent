#!/usr/bin/env node
/**
 * @local-agent/cli
 * 
 * CLI entrypoint for the local coding agent.
 */

import { Command } from 'commander';

const pkg = require('../package.json');

const program = new Command();

program
  .name('agent')
  .description('Local coding agent - CLI-first assistant')
  .version(pkg.version);

// TODO: Import and register commands
// import { initCommand } from './commands/init';
// import { askCommand } from './commands/ask';
// import { applyCommand } from './commands/apply';
// import { testCommand } from './commands/test';
// import { undoCommand } from './commands/undo';
// import { statusCommand } from './commands/status';
// import { doctorCommand } from './commands/doctor';

// program.addCommand(initCommand);
// program.addCommand(askCommand);
// program.addCommand(applyCommand);
// program.addCommand(testCommand);
// program.addCommand(undoCommand);
// program.addCommand(statusCommand);
// program.addCommand(doctorCommand);

program.parse();
