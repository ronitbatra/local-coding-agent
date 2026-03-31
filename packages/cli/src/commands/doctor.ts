/**
 * doctor command - Check system requirements
 *
 * agent doctor
 */

import { Command } from 'commander';
import { addJsonOption, createActionHandler } from '../lib/commandHelpers.js';
import type { CliRuntime } from '../lib/runtime.js';
import { handleDoctor } from './shared.js';

export function createDoctorCommand(runtime: CliRuntime): Command {
  return addJsonOption(
    new Command('doctor')
      .description('Check system requirements (git, ripgrep, ollama, etc.)')
      .action(
        createActionHandler(runtime, async () => {
          return handleDoctor(runtime.cwd);
        })
      )
  );
}
