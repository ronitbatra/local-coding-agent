import { describe, expect, it } from 'vitest';
import { DEFAULT_MODEL_CONFIG, normalizeModelConfig } from '../../src/model/config';

describe('model config normalization', () => {
  it('returns defaults for invalid input', () => {
    expect(normalizeModelConfig(null)).toEqual(DEFAULT_MODEL_CONFIG);
  });

  it('normalizes timeout and retry settings', () => {
    const normalized = normalizeModelConfig({
      provider: 'ollama',
      baseUrl: 'http://127.0.0.1:11434',
      model: 'qwen2.5-coder:7b',
      temperature: 0,
      contextLimit: 2048,
      timeoutMs: 25_000,
      maxRetries: 4,
    });

    expect(normalized.timeoutMs).toBe(25_000);
    expect(normalized.maxRetries).toBe(4);
  });

  it('falls back when timeout/retries are invalid', () => {
    const normalized = normalizeModelConfig({
      timeoutMs: -100,
      maxRetries: -1,
    });

    expect(normalized.timeoutMs).toBe(DEFAULT_MODEL_CONFIG.timeoutMs);
    expect(normalized.maxRetries).toBe(DEFAULT_MODEL_CONFIG.maxRetries);
  });
});
