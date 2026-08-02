import { chatCompletionsURL } from './endpoint.js';
import { buildMessages } from './prompt.js';
import type { CompletionContext, Settings } from './types.js';

export type FetchLike = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

export class CompletionClient {
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
    externalSignal: AbortSignal | undefined,
    maxTokens: number
  ): Promise<string> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(new Error('Request timed out.')), settings.timeout);
    const abort = (): void => controller.abort(externalSignal?.reason);
    externalSignal?.addEventListener('abort', abort, { once: true });
    if (externalSignal?.aborted) abort();
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (apiKey) headers.Authorization = `Bearer ${apiKey}`;
      const response = await this.fetcher(chatCompletionsURL(settings.baseURL), {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: settings.model,
          messages,
          max_tokens: maxTokens,
          temperature: settings.temperature,
          stream: false
        }),
        signal: controller.signal
      });
      if (!response.ok) {
        const detail = (await response.text()).trim().slice(0, 300);
        throw new Error(`Server returned ${response.status}${detail ? `: ${detail}` : ''}`);
      }
      const data: unknown = await response.json();
      const content = extractContent(data);
      if (!content) throw new Error('Server returned an empty completion.');
      return content;
    } catch (error) {
      if (controller.signal.aborted && !externalSignal?.aborted) throw new Error(`Request timed out after ${settings.timeout} ms.`);
      throw error;
    } finally {
      clearTimeout(timeout);
      externalSignal?.removeEventListener('abort', abort);
    }
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
