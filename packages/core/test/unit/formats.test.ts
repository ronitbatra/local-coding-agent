/**
 * Prompt output contract tests
 */

import { describe, expect, it } from 'vitest';
import { parseAgentOutput, validatePatchOutputContract } from '../../src/prompts/formats';

describe('parseAgentOutput', () => {
  it('parses strict JSON output', () => {
    const parsed = parseAgentOutput(
      JSON.stringify({
        plan: 'Update README',
        patch: '--- a/README.md\n+++ b/README.md\n@@ -1 +1 @@\n-old\n+new\n',
        commands: ['npm test'],
        done: true,
        tool_calls: [{ tool: 'search_code', args: { query: 'README' } }],
      })
    );

    expect(parsed.plan).toBe('Update README');
    expect(parsed.patch).toContain('+++ b/README.md');
    expect(parsed.commands).toEqual(['npm test']);
    expect(parsed.done).toBe(true);
    expect(parsed.tool_calls[0]).toEqual({ tool: 'search_code', args: { query: 'README' } });
  });

  it('rejects unknown keys and malformed shapes', () => {
    expect(() =>
      parseAgentOutput(
        JSON.stringify({
          plan: 'x',
          patch: null,
          commands: [],
          done: true,
          tool_calls: [],
          extra: true,
        })
      )
    ).toThrow('unsupported keys');

    expect(() =>
      parseAgentOutput(
        JSON.stringify({
          plan: '',
          patch: null,
          commands: [],
          done: true,
          tool_calls: [],
        })
      )
    ).toThrow('plan');
  });

  it('accepts fenced JSON content', () => {
    const parsed = parseAgentOutput(`\`\`\`json
{"plan":"p","patch":null,"commands":[],"done":true,"tool_calls":[]}
\`\`\``);

    expect(parsed.done).toBe(true);
  });

  it('rejects prose before unified diff headers in patch output', () => {
    expect(() =>
      validatePatchOutputContract(
        [
          'Here is your patch:',
          '--- a/README.md',
          '+++ b/README.md',
          '@@ -1 +1 @@',
          '-a',
          '+b',
          '',
        ].join('\n')
      )
    ).toThrow('leading prose');
  });
});
