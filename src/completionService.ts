import type { CompletionBackend } from './backend.js';
import { DebouncedRequest } from './debouncedRequest.js';
import { cleanCompletion } from './response.js';
import type { CompletionSnapshot, Settings } from './types.js';

export class CompletionService {
  private readonly requests = new DebouncedRequest();

  constructor(private readonly backend: CompletionBackend) {}

  async generate(
    snapshot: CompletionSnapshot,
    settings: Settings,
    apiKey: string | undefined,
    isCurrent: () => boolean,
    signal?: AbortSignal
  ): Promise<string | undefined> {
    const raw = await this.requests.run(
      settings.delay,
      requestSignal => this.backend.complete(snapshot, settings, apiKey, requestSignal),
      signal
    );
    if (!isCurrent()) return undefined;
    const cleaned = cleanCompletion(raw, snapshot.prefix, snapshot.suffix, snapshot.eol, settings.maxLines);
    return cleaned.trim().length > 0 ? cleaned : undefined;
  }

  cancel(): void {
    this.requests.cancel();
  }

  dispose(): void {
    this.requests.dispose();
  }
}
