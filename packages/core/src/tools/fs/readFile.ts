/**
 * readFile tool - Read file contents with optional range
 */

import type { Tool, ToolResult } from '../Tool';

export class ReadFileTool implements Tool {
  name = 'read_file';
  description = 'Read file contents, optionally with line range';

  async execute(_args: { path: string; range?: [number, number] }): Promise<ToolResult<string>> {
    // TODO: Implement file reading with policy checks
    return { success: false, error: 'Not implemented' };
  }
}
