/**
 * Ollama adapter - First model provider
 *
 * Connects to local Ollama server for inference.
 */

import type { LLM, LLMOptions, LLMResponse } from '../LLM';

export interface OllamaConfig {
  baseUrl?: string;
  model: string;
  temperature?: number;
  contextLimit?: number;
}

export class OllamaAdapter implements LLM {
  private config: Required<OllamaConfig>;

  constructor(config: OllamaConfig) {
    this.config = {
      baseUrl: config.baseUrl || 'http://localhost:11434',
      model: config.model,
      temperature: config.temperature ?? 0.7,
      contextLimit: config.contextLimit ?? 8192,
    };
  }

  async complete(_prompt: string, _options?: LLMOptions): Promise<LLMResponse> {
    // TODO: Implement Ollama API call using this.config
    void this.config; // Reference config to satisfy linter until implementation
    throw new Error('Not implemented');
  }

  async *stream(_prompt: string, _options?: LLMOptions): AsyncIterable<string> {
    // TODO: Implement streaming using this.config
    void this.config; // Reference config to satisfy linter until implementation
    yield '';
  }

  async checkServer(): Promise<boolean> {
    // TODO: Check if Ollama server is available using this.config.baseUrl
    void this.config; // Reference config to satisfy linter until implementation
    return false;
  }
}
