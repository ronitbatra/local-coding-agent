/**
 * LLM - Provider interface
 * 
 * Abstract interface for model providers.
 * Keeps adapters pluggable.
 */

export interface LLMResponse {
  content: string;
  finishReason: 'stop' | 'length' | 'error';
}

export interface LLM {
  complete(prompt: string, options?: LLMOptions): Promise<LLMResponse>;
  stream?(prompt: string, options?: LLMOptions): AsyncIterable<string>;
}

export interface LLMOptions {
  temperature?: number;
  maxTokens?: number;
  stop?: string[];
}
