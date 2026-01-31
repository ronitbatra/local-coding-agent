/**
 * Ollama adapter - First model provider
 * 
 * Connects to local Ollama server for inference.
 */

import type { LLM, LLMResponse, LLMOptions } from '../LLM';

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

  async complete(prompt: string, options?: LLMOptions): Promise<LLMResponse> {
    // TODO: Implement Ollama API call
    throw new Error('Not implemented');
  }

  async *stream(prompt: string, options?: LLMOptions): AsyncIterable<string> {
    // TODO: Implement streaming
    yield '';
  }

  async checkServer(): Promise<boolean> {
    // TODO: Check if Ollama server is available
    return false;
  }
}
