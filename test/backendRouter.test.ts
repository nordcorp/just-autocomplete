import { describe, expect, it, vi } from 'vitest';
import type { CompletionBackend } from '../src/backend.js';
import { BackendRouter } from '../src/backendRouter.js';
import { DEFAULT_SETTINGS } from '../src/settingsModel.js';

const context = { language: 'typescript', filename: 'a.ts', prefix: 'const x = ', suffix: ';' };

describe('BackendRouter', () => {
  it.each([
    ['openai-compatible', 'openai'],
    ['llama-cpp', 'llama']
  ] as const)('routes only to %s', async (backend, expected) => {
    const openAI = fakeBackend('openai');
    const llama = fakeBackend('llama');
    const router = new BackendRouter(openAI, llama);
    await expect(router.complete(context, { ...DEFAULT_SETTINGS, backend, model: 'm' }, undefined)).resolves.toBe(expected);
    expect(openAI.complete).toHaveBeenCalledTimes(backend === 'openai-compatible' ? 1 : 0);
    expect(llama.complete).toHaveBeenCalledTimes(backend === 'llama-cpp' ? 1 : 0);
  });

  it('tests only the selected backend', async () => {
    const openAI = fakeBackend('openai');
    const llama = fakeBackend('llama');
    const router = new BackendRouter(openAI, llama);
    await expect(router.testConnection({ ...DEFAULT_SETTINGS, backend: 'llama-cpp', model: 'm' }, undefined)).resolves.toBe(12);
    expect(openAI.testConnection).not.toHaveBeenCalled();
    expect(llama.testConnection).toHaveBeenCalledOnce();
  });
});

function fakeBackend(result: string): CompletionBackend {
  return {
    complete: vi.fn(async () => result),
    testConnection: vi.fn(async () => 12)
  };
}
