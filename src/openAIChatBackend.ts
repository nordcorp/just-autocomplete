import type { CompletionBackend } from './backend.js';
import { chatCompletionsURL } from './endpoint.js';
import { buildMessages } from './prompt.js';
import { postJson, type FetchLike } from './transport.js';
import type { CompletionContext, Settings } from './types.js';

export class OpenAIChatBackend implements CompletionBackend {
  constructor(private readonly fetcher: FetchLike = fetch) {}

  async complete(context: CompletionContext, settings: Settings, apiKey: string | undefined, signal?: AbortSignal): Promise<string> {
    return this.request(buildMessages(context), settings, apiKey, signal, settings.maxTokens);
  }

  async testConnection(settings: Settings, apiKey: string | undefined, signal?: AbortSignal): Promise<number> {
    const started = Date.now();
    await this.request(
      [
        { role: 'system', content: 'Reply with exactly OK.' },
        { role: 'user', content: 'Connection test' }
      ],
      settings,
      apiKey,
      signal,
      8
    );
    return Date.now() - started;
  }

  private async request(
    messages: Array<{ role: 'system' | 'user'; content: string }>,
    settings: Settings,
    apiKey: string | undefined,
    signal: AbortSignal | undefined,
    maxTokens: number
  ): Promise<string> {
    const data = await postJson({
      url: chatCompletionsURL(settings.baseURL),
      body: {
        model: settings.model,
        messages,
        max_tokens: maxTokens,
        temperature: settings.temperature,
        stream: false
      },
      apiKey,
      timeout: settings.timeout,
      signal
    }, this.fetcher);
    const content = extractContent(data);
    if (!content) throw new Error('Server returned an empty completion.');
    return content;
  }
}

export function extractContent(data: unknown): string {
  if (!isRecord(data) || !Array.isArray(data.choices)) throw new Error('Server returned an invalid Chat Completions response.');
  const choice = data.choices[0];
  if (!isRecord(choice) || !isRecord(choice.message) || typeof choice.message.content !== 'string') {
    throw new Error('Server returned an invalid Chat Completions response.');
  }
  return choice.message.content;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
