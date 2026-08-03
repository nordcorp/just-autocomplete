import { describe, expect, it, vi } from 'vitest';
import { postJson, type FetchLike } from '../src/transport.js';

describe('JSON transport', () => {
  it('posts JSON with content type and optional Bearer authentication', async () => {
    const fetcher = vi.fn<FetchLike>(async () => new Response('{"ok":true}', { headers: { 'content-type': 'application/json' } }));
    await expect(postJson({ url: 'https://example.test/api', body: { value: 1 }, apiKey: 'secret', timeout: 1000 }, fetcher)).resolves.toEqual({ ok: true });
    expect(fetcher).toHaveBeenCalledWith('https://example.test/api', expect.objectContaining({
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer secret' },
      body: '{"value":1}'
    }));
  });

  it('limits HTTP error details to 300 characters', async () => {
    const fetcher: FetchLike = async () => new Response(`  ${'x'.repeat(400)}  `, { status: 503 });
    await expect(postJson({ url: 'https://example.test', body: {}, timeout: 1000 }, fetcher))
      .rejects.toThrow(`Server returned 503: ${'x'.repeat(300)}`);
  });

  it('rejects invalid JSON', async () => {
    const fetcher: FetchLike = async () => new Response('not-json');
    await expect(postJson({ url: 'https://example.test', body: {}, timeout: 1000 }, fetcher)).rejects.toThrow();
  });

  it('enforces timeout and removes the external abort listener', async () => {
    const external = new AbortController();
    const remove = vi.spyOn(external.signal, 'removeEventListener');
    const fetcher: FetchLike = async (_input, init) => new Promise((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => reject(init.signal?.reason), { once: true });
    });
    await expect(postJson({ url: 'https://example.test', body: {}, timeout: 10, signal: external.signal }, fetcher))
      .rejects.toThrow('Request timed out after 10 ms.');
    expect(remove).toHaveBeenCalledWith('abort', expect.any(Function));
  });

  it('propagates an external abort', async () => {
    const external = new AbortController();
    const fetcher: FetchLike = async (_input, init) => new Promise((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => reject(init.signal?.reason), { once: true });
    });
    const result = postJson({ url: 'https://example.test', body: {}, timeout: 1000, signal: external.signal }, fetcher);
    external.abort(new Error('cancelled externally'));
    await expect(result).rejects.toThrow('cancelled externally');
  });
});
