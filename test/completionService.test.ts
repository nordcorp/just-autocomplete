import { describe, expect, it, vi } from 'vitest';
import type { CompletionBackend } from '../src/backend.js';
import { CompletionService } from '../src/completionService.js';
import { DEFAULT_SETTINGS } from '../src/settingsModel.js';
import type { CompletionSnapshot } from '../src/types.js';

const snapshot: CompletionSnapshot = {
  language: 'typescript', filename: 'a.ts', prefix: 'const x = ', suffix: ';', documentVersion: 1, offset: 10, eol: '\n'
};

describe('CompletionService', () => {
  it('drops a result when document or cursor snapshot is stale', async () => {
    const backend = fakeBackend('42');
    const service = new CompletionService(backend);
    await expect(service.generate(snapshot, { ...DEFAULT_SETTINGS, model: 'm', delay: 0 }, undefined, () => false)).resolves.toBeUndefined();
    expect(backend.complete).toHaveBeenCalledOnce();
  });

  it('returns a current cleaned result', async () => {
    const service = new CompletionService(fakeBackend('42;'));
    await expect(service.generate(snapshot, { ...DEFAULT_SETTINGS, model: 'm', delay: 0 }, undefined, () => true)).resolves.toBe('42');
  });

  it('always drops whitespace-only results', async () => {
    const service = new CompletionService(fakeBackend(' \n\t '));
    await expect(service.generate(snapshot, { ...DEFAULT_SETTINGS, model: 'm', delay: 0 }, undefined, () => true)).resolves.toBeUndefined();
  });
});

function fakeBackend(result: string): CompletionBackend {
  return {
    complete: vi.fn(async () => result),
    testConnection: vi.fn(async () => 0)
  };
}
