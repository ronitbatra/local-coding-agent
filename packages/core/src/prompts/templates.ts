/**
 * Prompt templates for different agent operations
 */

export function buildRunPrompt(task: string, context: string): string {
  return `Task: ${task}

Context:
${context}

Please provide:
1. PLAN - Brief plan of changes
2. PATCH - Unified diff format
3. COMMANDS - Optional commands to run
4. DONE - Mark completion`;
}
