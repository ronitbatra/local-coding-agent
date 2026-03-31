#!/usr/bin/env node
/**
 * @local-agent/cli
 *
 * CLI entrypoint for the local coding agent.
 */

import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { createProgram } from './app.js';

const require = createRequire(import.meta.url);
const pkg = require('../package.json');

export { createProgram } from './app.js';

const isEntrypoint = process.argv[1] === fileURLToPath(import.meta.url);

if (isEntrypoint) {
  const program = createProgram();
  program.version(pkg.version);
  await program.parseAsync(process.argv);
}
