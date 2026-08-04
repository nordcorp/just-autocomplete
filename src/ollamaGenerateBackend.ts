import type { CompletionBackend } from './backend.js';
import { ollamaGenerateURL } from './endpoint.js';
import { postJson, type FetchLike } from './transport.js';
import type { CompletionContext, Settings } from './types.js';

export class OllamaGenerateBackend implements CompletionBackend {
  constructor(private readonly fetcher: FetchLike = fetch) {}

  async complete(context: CompletionContext, settings: Settings, apiKey: string | undefined, signal?: AbortSignal): Promise<string> {
    return this.request(context.prefix, context.suffix, settings, apiKey, signal, settings.maxTokens);
  }

  async testConnection(settings: Settings, apiKey: string | undefined, signal?: AbortSignal): Promise<number> {
    const started = Date.now();
    await this.request('const answer = ', ';\n', settings, apiKey, signal, 8);
    return Date.now() - started;
  }

  private async request(
    prefix: string,
    suffix: string,
    settings: Settings,
    apiKey: string | undefined,
    signal: AbortSignal | undefined,
    nPredict: number
  ): Promise<string> {
    const data = await postJson({
      url: ollamaGenerateURL(settings.baseURL),
      body: {
        model: settings.model,
        prompt: prefix,
        suffix,
        stream: false,
        options: {
          num_predict: nPredict,
          temperature: settings.temperature
        }
      },
      apiKey,
      timeout: settings.timeout,
      signal
    }, this.fetcher);
    return extractOllamaContent(data);
  }
}

export function extractOllamaContent(data: unknown): string {
  if (!isRecord(data) || typeof data.response !== 'string') {
    throw new Error('Server returned an invalid Ollama Generate response.');
  }
  if (!data.response) throw new Error('Server returned an empty completion.');
  return data.response;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
