import { readFile } from 'node:fs/promises';
import { type ModelConfig, normalizeModelConfig } from '@local-agent/core';
import { getAgentPaths } from './agentFs.js';
import { CliCommandError } from './commandHelpers.js';

export async function loadModelConfig(repoRoot: string): Promise<ModelConfig> {
  const { modelPath } = getAgentPaths(repoRoot);

  let content: string;
  try {
    content = await readFile(modelPath, 'utf8');
  } catch {
    throw new CliCommandError(`Model configuration was not found: ${modelPath}`);
  }

  try {
    return normalizeModelConfig(JSON.parse(content) as unknown);
  } catch {
    throw new CliCommandError(`Model configuration is invalid: ${modelPath}`);
  }
}
