import type { CompletionBackend } from './backend.js';
import { LlamaCppFimBackend } from './llamaCppFimBackend.js';
import { OpenAIChatBackend } from './openAIChatBackend.js';
import type { CompletionContext, Settings } from './types.js';

export class BackendRouter implements CompletionBackend {
  constructor(
    private readonly openAICompatible: CompletionBackend = new OpenAIChatBackend(),
    private readonly llamaCpp: CompletionBackend = new LlamaCppFimBackend()
  ) {}

  complete(context: CompletionContext, settings: Settings, apiKey: string | undefined, signal?: AbortSignal): Promise<string> {
    return this.select(settings).complete(context, settings, apiKey, signal);
  }

  testConnection(settings: Settings, apiKey: string | undefined, signal?: AbortSignal): Promise<number> {
    return this.select(settings).testConnection(settings, apiKey, signal);
  }

  private select(settings: Settings): CompletionBackend {
    switch (settings.backend) {
      case 'openai-compatible': return this.openAICompatible;
      case 'llama-cpp': return this.llamaCpp;
    }
  }
}
