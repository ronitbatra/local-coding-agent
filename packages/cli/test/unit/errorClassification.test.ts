import { describe, expect, it } from 'vitest';
import { buildFailureMetadata, classifyFailureCategory } from '../../src/lib/errorClassification';

describe('error classification', () => {
  it('classifies known ask-pipeline failures', () => {
    expect(
      classifyFailureCategory(
        'Model output was not valid JSON. Ensure strict JSON output mode is enabled.'
      )
    ).toBe('json_parse_failed');
    expect(classifyFailureCategory('Model output field "tool_calls" must be an array.')).toBe(
      'schema_failed'
    );
    expect(
      classifyFailureCategory(
        'PATCH must start with a unified diff header and contain no leading prose.'
      )
    ).toBe('patch_contract_failed');
    expect(
      classifyFailureCategory(
        'PATCH is not valid unified diff text: Invalid diff line prefix "d" in line: def foo()'
      )
    ).toBe('diff_parse_failed');
    expect(classifyFailureCategory('Hunk for "main.py" declares 2 old lines but contains 3.')).toBe(
      'diff_validation_failed'
    );
    expect(
      classifyFailureCategory('Timed out connecting to Ollama at http://localhost:11434.')
    ).toBe('llm_timeout_or_http_error');
  });

  it('builds structured metadata with classifier version', () => {
    const metadata = buildFailureMetadata('PATCH must not be an empty string.');

    expect(metadata.category).toBe('patch_contract_failed');
    expect(metadata.classifierVersion).toBe('t0');
    expect(metadata.originalMessage).toContain('PATCH');
  });
});
