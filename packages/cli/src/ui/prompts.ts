/**
 * prompts - Confirmation prompts for TTY
 */

import { createInterface } from 'node:readline/promises';
import type { CliIO } from '../lib/runtime.js';

async function confirm(io: CliIO, message: string): Promise<boolean> {
  const rl = createInterface({
    input: io.input,
    output: io.output,
  });

  try {
    const answer = await rl.question(`${message} [y/N] `);
    return ['y', 'yes'].includes(answer.trim().toLowerCase());
  } finally {
    rl.close();
  }
}

export async function confirmApply(io: CliIO, filesChanged: string[]): Promise<boolean> {
  const summary =
    filesChanged.length > 0
      ? `${filesChanged.length} file(s): ${filesChanged.join(', ')}`
      : '1 patch';

  const riskSummary =
    filesChanged.length > 10
      ? 'high risk: many files changed'
      : filesChanged.length > 3
        ? 'medium risk: multiple files changed'
        : 'low risk: limited file changes';

  return confirm(io, `Apply pending patch affecting ${summary}? Risk summary: ${riskSummary}.`);
}

export async function confirmCommand(io: CliIO, command: string): Promise<boolean> {
  return confirm(io, `Run allowlisted command "${command}"?`);
}
