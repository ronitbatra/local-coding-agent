/**
 * Prompt templates for different agent operations
 */

export function buildRunPrompt(task: string, context: string): string {
  return `Task:
${task}

Context:
${context}

Return only JSON in this exact shape:
{
  "plan": "short plan",
  "patch": "unified diff text or null",
  "commands": ["optional shell command suggestions"],
  "done": true,
  "tool_calls": [{"tool": "search_code", "args": {"query": "..."}}]
}

Constraints:
- Do not include markdown fences.
- Do not include keys outside the schema.
- If no file edits are needed, set "patch" to null.`;
}
