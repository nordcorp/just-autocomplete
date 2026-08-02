import { describe, expect, it } from 'vitest';
import { CompletionClient, type FetchLike } from '../src/client.js';
import { CompletionService } from '../src/completionService.js';
import { DEFAULT_SETTINGS } from '../src/settingsModel.js';
import type { CompletionSnapshot } from '../src/types.js';

const snapshot: CompletionSnapshot = {
  language: 'typescript', filename: 'a.ts', prefix: 'const x = ', suffix: ';', documentVersion: 1, offset: 10, eol: '\n'
};

describe('CompletionService', () => {
  it('drops a result when document or cursor snapshot is stale', async () => {
    const fetcher: FetchLike = async () => new Response(JSON.stringify({ choices: [{ message: { content: '42' } }] }), {
      headers: { 'content-type': 'application/json' }
    });
    const service = new CompletionService(new CompletionClient(fetcher));
    await expect(service.generate(snapshot, { ...DEFAULT_SETTINGS, model: 'm', delay: 0 }, undefined, () => false)).resolves.toBeUndefined();
  });

  it('returns a current cleaned result', async () => {
    const fetcher: FetchLike = async () => new Response(JSON.stringify({ choices: [{ message: { content: '42;' } }] }));
    const service = new CompletionService(new CompletionClient(fetcher));
    await expect(service.generate(snapshot, { ...DEFAULT_SETTINGS, model: 'm', delay: 0 }, undefined, () => true)).resolves.toBe('42');
  });
});
