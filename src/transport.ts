export type FetchLike = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

export interface JsonPostRequest {
  url: string;
  body: unknown;
  apiKey?: string;
  timeout: number;
  signal?: AbortSignal;
}

export async function postJson(request: JsonPostRequest, fetcher: FetchLike = fetch): Promise<unknown> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(new Error('Request timed out.')), request.timeout);
  const abort = (): void => controller.abort(request.signal?.reason);
  request.signal?.addEventListener('abort', abort, { once: true });
  if (request.signal?.aborted) abort();

  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (request.apiKey) headers.Authorization = `Bearer ${request.apiKey}`;
    const response = await fetcher(request.url, {
      method: 'POST',
      headers,
      body: JSON.stringify(request.body),
      signal: controller.signal
    });
    if (!response.ok) {
      const detail = (await response.text()).trim().slice(0, 300);
      throw new Error(`Server returned ${response.status}${detail ? `: ${detail}` : ''}`);
    }
    return await response.json() as unknown;
  } catch (error) {
    if (controller.signal.aborted && !request.signal?.aborted) {
      throw new Error(`Request timed out after ${request.timeout} ms.`);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
    request.signal?.removeEventListener('abort', abort);
  }
}
