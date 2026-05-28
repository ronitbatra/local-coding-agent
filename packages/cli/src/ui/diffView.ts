/**
 * diffView - Terminal diff viewer with paging and --plain output
 */

import { spawn } from 'node:child_process';

const ANSI_RESET = '\u001B[0m';
const ANSI_GREEN = '\u001B[32m';
const ANSI_RED = '\u001B[31m';
const ANSI_CYAN = '\u001B[36m';
const ANSI_BOLD = '\u001B[1m';

export interface RenderDiffOptions {
  plain?: boolean;
  paginate?: boolean;
  interactive?: boolean;
  writer?: (line: string) => void;
}

export function formatDiff(diff: string, plain = false): string[] {
  const lines = diff.replaceAll('\r\n', '\n').split('\n');
  if (plain) {
    return lines;
  }

  return lines.map((line) => {
    if (line.startsWith('+++ ') || line.startsWith('--- ')) {
      return `${ANSI_BOLD}${line}${ANSI_RESET}`;
    }
    if (line.startsWith('@@')) {
      return `${ANSI_CYAN}${line}${ANSI_RESET}`;
    }
    if (line.startsWith('+')) {
      return `${ANSI_GREEN}${line}${ANSI_RESET}`;
    }
    if (line.startsWith('-')) {
      return `${ANSI_RED}${line}${ANSI_RESET}`;
    }

    return line;
  });
}

export async function renderDiff(diff: string, options: RenderDiffOptions = {}): Promise<void> {
  const plain = options.plain ?? false;
  const lines = formatDiff(diff, plain);
  const text = `${lines.join('\n')}\n`;
  const shouldPage = Boolean(options.paginate && options.interactive && !plain);

  if (shouldPage) {
    const paged = await renderWithPager(text);
    if (paged) {
      return;
    }
  }

  const writer = options.writer ?? ((line: string) => process.stdout.write(`${line}\n`));
  for (const line of lines) {
    writer(line);
  }
}

async function renderWithPager(text: string): Promise<boolean> {
  return new Promise((resolve) => {
    const pager = process.env.PAGER || 'less';
    const child = spawn(pager, ['-R'], {
      stdio: ['pipe', 'inherit', 'inherit'],
    });

    child.on('error', () => {
      resolve(false);
    });
    child.on('close', (code) => {
      resolve(code === 0);
    });

    child.stdin.write(text);
    child.stdin.end();
  });
}
