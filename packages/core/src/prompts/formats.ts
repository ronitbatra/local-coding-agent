/**
 * Strict JSON / sections contract
 *
 * Defines the output format the model must follow.
 */

export interface AgentOutput {
  plan?: string;
  patch?: string;
  commands?: string[];
  done?: boolean;
}

export function parseAgentOutput(_text: string): AgentOutput {
  // TODO: Implement output parsing (strict JSON or section-based)
  return {};
}
