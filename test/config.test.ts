import { describe, expect, it, vi } from 'vitest';

const updates: Array<[string, unknown, unknown]> = [];
vi.mock('vscode', () => ({
  ConfigurationTarget: { Global: 'global' },
  workspace: {
    getConfiguration: () => ({
      get: (_key: string, fallback: unknown) => fallback,
      update: async (key: string, value: unknown, target: unknown) => { updates.push([key, value, target]); }
    })
  }
}));

describe('VS Code configuration adapter', () => {
  it('writes every non-secret setting to global machine-scoped configuration', async () => {
    updates.length = 0;
    const { saveSettings } = await import('../src/config.js');
    await saveSettings({
      baseURL: 'http://localhost:11434/v1', model: 'm', delay: 400, timeout: 20000,
      maxTokens: 128, temperature: 0.2, prefixChars: 12000, suffixChars: 4000, maxLines: 20
    });
    expect(updates).toHaveLength(9);
    expect(updates.every(([, , target]) => target === 'global')).toBe(true);
    expect(updates.some(([key]) => key.toLowerCase().includes('apikey'))).toBe(false);
  });
});
