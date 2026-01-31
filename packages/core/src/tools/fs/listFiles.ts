/**
 * listFiles tool - List files matching glob pattern
 */

import type { Tool, ToolResult } from '../Tool';

export class ListFilesTool implements Tool {
  name = 'list_files';
  description = 'List files matching a glob pattern';

  async execute(args: { glob: string }): Promise<ToolResult<string[]>> {
    // TODO: Implement file listing with policy checks
    return { success: false, error: 'Not implemented' };
  }
}
