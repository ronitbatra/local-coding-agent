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

function stripCodeFence(input: string): string {
  if (!input.startsWith('```')) {
    return input;
  }

  return input.replace(/^```(?:json)?\s*/u, '').replace(/\s*```$/u, '');
}
