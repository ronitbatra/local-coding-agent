/**
 * Tool interface + gating
 *
 * Base interface for all tools. Tools are small, auditable, and policy-gated.
 */

export interface Tool {
  name: string;
  description: string;
  execute(args: unknown): Promise<unknown>;
}

export interface ToolResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}
