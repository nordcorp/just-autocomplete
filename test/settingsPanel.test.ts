import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_SETTINGS } from '../src/settingsModel.js';

vi.mock('vscode', () => ({}));

describe('settings panel backend selector', () => {
  it.each([
    ['openai-compatible', 'http://localhost:11434/v1'],
    ['llama-cpp', 'http://localhost:8080']
  ] as const)('renders, restores, and submits %s', async (backend, placeholder) => {
    const { renderHtml } = await import('../src/settingsPanel.js');
    const html = renderHtml({ cspSource: 'test-csp' } as never, { ...DEFAULT_SETTINGS, backend, model: 'm' });
    expect(html).toContain('<select name="backend" required>');
    expect(html).toContain('OpenAI-compatible — Chat Completions');
    expect(html).toContain('llama.cpp — Native FIM');
    expect(html).toContain(`"backend":"${backend}"`);
    expect(html).toContain(`'${backend}':'${placeholder}'`);
    expect(html).toContain('settings:{backend:data.backend,baseURL:data.baseURL');
  });
});
