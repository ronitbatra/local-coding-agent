/**
 * ripgrep - Search code using ripgrep
 */

import type { Tool, ToolResult } from '../Tool';

export class RipgrepTool implements Tool {
  name = 'search_code';
  description = 'Search code using ripgrep';

  async execute(args: { query: string; path?: string }): Promise<ToolResult<string[]>> {
    // TODO: Implement ripgrep search
    return { success: false, error: 'Not implemented' };
  }
}
