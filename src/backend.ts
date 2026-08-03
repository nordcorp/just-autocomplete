import type { CompletionContext, Settings } from './types.js';

export interface CompletionBackend {
  complete(
    context: CompletionContext,
    settings: Settings,
    apiKey: string | undefined,
    signal?: AbortSignal
  ): Promise<string>;

  testConnection(
    settings: Settings,
    apiKey: string | undefined,
    signal?: AbortSignal
  ): Promise<number>;
}
