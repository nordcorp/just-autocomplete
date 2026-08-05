import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { afterEach, describe, expect, it } from 'vitest';
import { OllamaGenerateBackend } from '../src/ollamaGenerateBackend.js';
import { DEFAULT_SETTINGS } from '../src/settingsModel.js';

let server: Server | undefined;
afterEach(async () => {
  server?.closeAllConnections();
  if (server) await new Promise<void>(resolve => server?.close(() => resolve()));
  server = undefined;
});

type RequestListener = (request: IncomingMessage, response: ServerResponse) => void;

async function listen(handler: RequestListener): Promise<string> {
  server = createServer(handler);
  await new Promise<void>(resolve => server?.listen(0, '127.0.0.1', () => resolve()));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Missing test server address');
  return `http://127.0.0.1:${address.port}/api`;
}

describe('OllamaGenerateBackend integration', () => {
  it('posts native prefix/suffix FIM and parses the response', async () => {
    let requestBody = '';
    let requestURL: string | undefined;
    let authorization: string | undefined;
    const baseURL = await listen((request, response) => {
      requestURL = request.url;
      authorization = request.headers.authorization;
      request.on('data', chunk => { requestBody += String(chunk); });
      request.on('end', () => {
        response.setHeader('content-type', 'application/json');
        response.end(JSON.stringify({ model: 'qwen2.5-coder:7b', response: '42', done: true }));
      });
    });
    const result = await new OllamaGenerateBackend().complete(
      { language: 'typescript', filename: 'a.ts', prefix: 'const x = ', suffix: ';\n' },
      { ...DEFAULT_SETTINGS, backend: 'ollama', baseURL, model: 'qwen2.5-coder:7b', maxTokens: 64, temperature: 0.35 },
      'secret'
    );
    expect(result).toBe('42');
    expect(requestURL).toBe('/api/generate');
    expect(authorization).toBe('Bearer secret');
    expect(JSON.parse(requestBody)).toEqual({
      model: 'qwen2.5-coder:7b',
      prompt: 'const x = ',
      suffix: ';\n',
      stream: false,
      options: {
        num_predict: 64,
        temperature: 0.35
      }
    });
    expect(requestBody).not.toContain('messages');
    expect(requestBody).not.toContain('input_prefix');
  });

  it('uses a real short FIM request for Test Connection', async () => {
    let requestBody = '';
    const baseURL = await listen((request, response) => {
      request.on('data', chunk => { requestBody += String(chunk); });
      request.on('end', () => {
        response.setHeader('content-type', 'application/json');
        response.end(JSON.stringify({ response: '42', done: true }));
      });
    });
    const latency = await new OllamaGenerateBackend().testConnection(
      { ...DEFAULT_SETTINGS, backend: 'ollama', baseURL, model: 'qwen2.5-coder:7b' },
      undefined
    );
    expect(latency).toBeGreaterThanOrEqual(0);
    expect(JSON.parse(requestBody)).toEqual(expect.objectContaining({
      prompt: 'const answer = ',
      suffix: ';\n',
      options: expect.objectContaining({ num_predict: 8 })
    }));
  });

  it.each([
    [{}, 'invalid Ollama Generate response'],
    [{ response: '' }, 'empty completion']
  ])('rejects an unusable response %#', async (payload, message) => {
    const baseURL = await listen((_request, response) => {
      response.setHeader('content-type', 'application/json');
      response.end(JSON.stringify(payload));
    });
    await expect(new OllamaGenerateBackend().complete(
      { language: 'text', filename: 'a', prefix: '', suffix: '' },
      { ...DEFAULT_SETTINGS, backend: 'ollama', baseURL, model: 'm' },
      undefined
    )).rejects.toThrow(message);
  });

  it('uses common HTTP error and timeout handling', async () => {
    let baseURL = await listen((_request, response) => { response.statusCode = 404; response.end('model not found'); });
    await expect(new OllamaGenerateBackend().complete(
      { language: 'text', filename: 'a', prefix: '', suffix: '' },
      { ...DEFAULT_SETTINGS, backend: 'ollama', baseURL, model: 'missing' },
      undefined
    )).rejects.toThrow('404: model not found');

    server?.closeAllConnections();
    if (server) await new Promise<void>(resolve => server?.close(() => resolve()));
    server = undefined;
    baseURL = await listen(() => {});
    await expect(new OllamaGenerateBackend().complete(
      { language: 'text', filename: 'a', prefix: '', suffix: '' },
      { ...DEFAULT_SETTINGS, backend: 'ollama', baseURL, model: 'm', timeout: 20 },
      undefined
    )).rejects.toThrow('timed out after 20 ms');
  });

  it('supports external cancellation', async () => {
    const baseURL = await listen(() => {});
    const controller = new AbortController();
    const result = new OllamaGenerateBackend().complete(
      { language: 'text', filename: 'a', prefix: '', suffix: '' },
      { ...DEFAULT_SETTINGS, backend: 'ollama', baseURL, model: 'm' },
      undefined,
      controller.signal
    );
    controller.abort();
    await expect(result).rejects.toMatchObject({ name: 'AbortError' });
  });
});
