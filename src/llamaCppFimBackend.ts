import type { CompletionBackend } from './backend.js';
import { infillURL } from './endpoint.js';
import { postJson, type FetchLike } from './transport.js';
import type { CompletionContext, Settings } from './types.js';

export class LlamaCppFimBackend implements CompletionBackend {
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
      url: infillURL(settings.baseURL),
      body: {
        model: settings.model,
        input_prefix: prefix,
        input_suffix: suffix,
        n_predict: nPredict,
        temperature: settings.temperature,
        stream: false,
        cache_prompt: true
      },
      apiKey,
      timeout: settings.timeout,
      signal
    }, this.fetcher);
    return extractFimContent(data);
  }
}

export function extractFimContent(data: unknown): string {
  if (!isRecord(data) || typeof data.content !== 'string') {
    throw new Error('Server returned an invalid llama.cpp infill response.');
  }
  if (!data.content) throw new Error('Server returned an empty completion.');
  return data.content;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
