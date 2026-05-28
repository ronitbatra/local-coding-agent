import { parseUnifiedDiff } from '../tools/patch/parseUnifiedDiff.js';

/**
 * Strict JSON / sections contract
 *
 * Defines the output format the model must follow.
 */

export interface ToolCall {
  tool: string;
  args: Record<string, unknown>;
}

export interface AgentOutput {
  plan: string;
  patch: string | null;
  commands: string[];
  done: boolean;
  tool_calls: ToolCall[];
}

export function parseAgentOutput(text: string): AgentOutput {
  const normalized = stripCodeFence(text.trim());
  let parsed: unknown;

  try {
    parsed = JSON.parse(normalized);
  } catch {
    throw new Error('Model output was not valid JSON. Ensure strict JSON output mode is enabled.');
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Model output must be a JSON object.');
  }

  const candidate = parsed as Record<string, unknown>;
  const allowedKeys = new Set(['plan', 'patch', 'commands', 'done', 'tool_calls']);
  const unknownKeys = Object.keys(candidate).filter((key) => !allowedKeys.has(key));
  if (unknownKeys.length > 0) {
    throw new Error(`Model output includes unsupported keys: ${unknownKeys.join(', ')}.`);
  }

  if (typeof candidate.plan !== 'string' || candidate.plan.trim().length === 0) {
    throw new Error('Model output field "plan" must be a non-empty string.');
  }

  const patchValue = candidate.patch;
  if (patchValue !== null && typeof patchValue !== 'string') {
    throw new Error('Model output field "patch" must be a string or null.');
  }

  const commandsValue = candidate.commands;
  if (!Array.isArray(commandsValue) || !commandsValue.every((item) => typeof item === 'string')) {
    throw new Error('Model output field "commands" must be an array of strings.');
  }

  if (typeof candidate.done !== 'boolean') {
    throw new Error('Model output field "done" must be a boolean.');
  }

  const toolCallsValue = candidate.tool_calls;
  if (!Array.isArray(toolCallsValue)) {
    throw new Error('Model output field "tool_calls" must be an array.');
  }

  const toolCalls: ToolCall[] = toolCallsValue.map((toolCall, index) => {
    if (!toolCall || typeof toolCall !== 'object' || Array.isArray(toolCall)) {
      throw new Error(`tool_calls[${index}] must be an object.`);
    }

    const record = toolCall as Record<string, unknown>;
    if (typeof record.tool !== 'string' || record.tool.trim().length === 0) {
      throw new Error(`tool_calls[${index}].tool must be a non-empty string.`);
    }

    const args = record.args;
    if (!args || typeof args !== 'object' || Array.isArray(args)) {
      throw new Error(`tool_calls[${index}].args must be an object.`);
    }

    return {
      tool: record.tool.trim(),
      args: args as Record<string, unknown>,
    };
  });

  return {
    plan: candidate.plan.trim(),
    patch: patchValue,
    commands: commandsValue,
    done: candidate.done,
    tool_calls: toolCalls,
  };
}

export function validatePatchOutputContract(patch: string | null): void {
  if (patch === null) {
    return;
  }

  const trimmed = patch.trim();
  if (trimmed.length === 0) {
    throw new Error('PATCH must not be an empty string.');
  }

  if (!trimmed.startsWith('--- ') && !trimmed.startsWith('diff --git ')) {
    throw new Error('PATCH must start with a unified diff header and contain no leading prose.');
  }

  if (trimmed.includes('```')) {
    throw new Error('PATCH must be raw unified diff text without markdown fences.');
  }

  try {
    parseUnifiedDiff(trimmed);
  } catch (error) {
    throw new Error(
      error instanceof Error
        ? `PATCH is not valid unified diff text: ${error.message}`
        : 'PATCH is not valid unified diff text.'
    );
  }
}

function stripCodeFence(input: string): string {
  if (!input.startsWith('```')) {
    return input;
  }

  return input.replace(/^```(?:json)?\s*/u, '').replace(/\s*```$/u, '');
}
