export type FailureCategory =
  | 'json_parse_failed'
  | 'schema_failed'
  | 'patch_contract_failed'
  | 'diff_parse_failed'
  | 'diff_validation_failed'
  | 'llm_timeout_or_http_error'
  | 'unknown_failure';

export interface FailureMetadata {
  category: FailureCategory;
  classifierVersion: 't0';
  originalMessage: string;
}

function includesAny(message: string, candidates: string[]): boolean {
  return candidates.some((candidate) => message.includes(candidate));
}

export function classifyFailureCategory(message: string): FailureCategory {
  if (
    includesAny(message, [
      'Timed out connecting to Ollama',
      'Unable to reach Ollama',
      'Ollama request failed',
    ])
  ) {
    return 'llm_timeout_or_http_error';
  }

  if (
    includesAny(message, ['Model output was not valid JSON', 'Model output must be a JSON object'])
  ) {
    return 'json_parse_failed';
  }

  if (
    includesAny(message, [
      'Model output field',
      'tool_calls[',
      'unsupported keys',
      'must be an array',
      'must be a boolean',
      'must be a non-empty string',
    ])
  ) {
    return 'schema_failed';
  }

  if (
    includesAny(message, [
      'PATCH must start with a unified diff header',
      'PATCH must not be an empty string',
      'PATCH must be raw unified diff text without markdown fences',
    ])
  ) {
    return 'patch_contract_failed';
  }

  if (
    includesAny(message, [
      'PATCH is not valid unified diff text',
      'Invalid diff line prefix',
      'Unified diff did not contain any file entries',
      'Invalid hunk header',
      'Encountered +++ header before --- header',
      'Diff file "',
      'Binary patches are not supported',
    ])
  ) {
    return 'diff_parse_failed';
  }

  if (
    includesAny(message, [
      'Hunk for "',
      'Patch size ',
      'Patch changes ',
      'Binary patches are not allowed',
      'Patch does not contain any hunks',
      'Diff contains a file entry with an empty path',
      'outside allowedRepoRoots',
    ])
  ) {
    return 'diff_validation_failed';
  }

  return 'unknown_failure';
}

export function buildFailureMetadata(message: string): FailureMetadata {
  return {
    category: classifyFailureCategory(message),
    classifierVersion: 't0',
    originalMessage: message,
  };
}
