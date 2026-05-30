/**
 * Model configuration shared by adapters and CLI.
 */

export interface ModelConfig {
  provider: 'ollama';
  baseUrl: string;
  model: string;
  temperature: number;
  contextLimit: number;
  timeoutMs: number;
  maxRetries: number;
}

export const DEFAULT_MODEL_CONFIG: ModelConfig = {
  provider: 'ollama',
  baseUrl: 'http://localhost:11434',
  model: 'qwen2.5-coder:14b',
  temperature: 0.2,
  contextLimit: 8192,
  timeoutMs: 10_000,
  maxRetries: 2,
};

export function normalizeModelConfig(input: unknown): ModelConfig {
  if (!input || typeof input !== 'object') {
    return { ...DEFAULT_MODEL_CONFIG };
  }

  const candidate = input as Record<string, unknown>;

  return {
    provider: candidate.provider === 'ollama' ? 'ollama' : 'ollama',
    baseUrl:
      typeof candidate.baseUrl === 'string' && candidate.baseUrl.trim().length > 0
        ? candidate.baseUrl.trim()
        : DEFAULT_MODEL_CONFIG.baseUrl,
    model:
      typeof candidate.model === 'string' && candidate.model.trim().length > 0
        ? candidate.model.trim()
        : DEFAULT_MODEL_CONFIG.model,
    temperature:
      typeof candidate.temperature === 'number' && Number.isFinite(candidate.temperature)
        ? candidate.temperature
        : DEFAULT_MODEL_CONFIG.temperature,
    contextLimit:
      typeof candidate.contextLimit === 'number' &&
      Number.isInteger(candidate.contextLimit) &&
      candidate.contextLimit > 0
        ? candidate.contextLimit
        : DEFAULT_MODEL_CONFIG.contextLimit,
    timeoutMs:
      typeof candidate.timeoutMs === 'number' &&
      Number.isInteger(candidate.timeoutMs) &&
      candidate.timeoutMs > 0
        ? candidate.timeoutMs
        : DEFAULT_MODEL_CONFIG.timeoutMs,
    maxRetries:
      typeof candidate.maxRetries === 'number' &&
      Number.isInteger(candidate.maxRetries) &&
      candidate.maxRetries >= 0
        ? candidate.maxRetries
        : DEFAULT_MODEL_CONFIG.maxRetries,
  };
}
