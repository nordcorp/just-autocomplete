import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { afterEach, describe, expect, it } from 'vitest';
import { LlamaCppFimBackend } from '../src/llamaCppFimBackend.js';
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
  return `http://127.0.0.1:${address.port}`;
}

describe('LlamaCppFimBackend integration', () => {
  it('posts native prefix/suffix FIM and parses content', async () => {
    let requestBody = '';
    let requestURL: string | undefined;
    let authorization: string | undefined;
    const baseURL = await listen((request, response) => {
      requestURL = request.url;
      authorization = request.headers.authorization;
      request.on('data', chunk => { requestBody += String(chunk); });
      request.on('end', () => {
        response.setHeader('content-type', 'application/json');
        response.end(JSON.stringify({ content: '42' }));
      });
    });
    const result = await new LlamaCppFimBackend().complete(
      { language: 'typescript', filename: 'a.ts', prefix: 'const x = ', suffix: ';\n' },
      { ...DEFAULT_SETTINGS, backend: 'llama-cpp', baseURL, model: 'qwen-fim', maxTokens: 64, temperature: 0.35 },
      'secret'
    );
    expect(result).toBe('42');
    expect(requestURL).toBe('/infill');
    expect(authorization).toBe('Bearer secret');
    expect(JSON.parse(requestBody)).toEqual({
      model: 'qwen-fim',
      input_prefix: 'const x = ',
      input_suffix: ';\n',
      n_predict: 64,
      temperature: 0.35,
      stream: false,
      cache_prompt: true
    });
    expect(requestBody).not.toContain('messages');
    expect(requestBody).not.toContain('<prefix>');
  });

  it('uses a real short infill for Test Connection', async () => {
    let requestBody = '';
    const baseURL = await listen((request, response) => {
      request.on('data', chunk => { requestBody += String(chunk); });
      request.on('end', () => {
        response.setHeader('content-type', 'application/json');
        response.end(JSON.stringify({ content: '42' }));
      });
    });
    const latency = await new LlamaCppFimBackend().testConnection(
      { ...DEFAULT_SETTINGS, backend: 'llama-cpp', baseURL, model: 'qwen-fim' },
      undefined
    );
    expect(latency).toBeGreaterThanOrEqual(0);
    expect(JSON.parse(requestBody)).toEqual(expect.objectContaining({
      input_prefix: 'const answer = ',
      input_suffix: ';\n',
      n_predict: 8
    }));
  });

  it.each([
    [{}, 'invalid llama.cpp infill response'],
    [{ content: '' }, 'empty completion']
  ])('rejects an unusable response %#', async (payload, message) => {
    const baseURL = await listen((_request, response) => {
      response.setHeader('content-type', 'application/json');
      response.end(JSON.stringify(payload));
    });
    await expect(new LlamaCppFimBackend().complete(
      { language: 'text', filename: 'a', prefix: '', suffix: '' },
      { ...DEFAULT_SETTINGS, backend: 'llama-cpp', baseURL, model: 'm' },
      undefined
    )).rejects.toThrow(message);
  });

  it('uses common HTTP error and timeout handling', async () => {
    let baseURL = await listen((_request, response) => { response.statusCode = 503; response.end('model unavailable'); });
    await expect(new LlamaCppFimBackend().complete(
      { language: 'text', filename: 'a', prefix: '', suffix: '' },
      { ...DEFAULT_SETTINGS, backend: 'llama-cpp', baseURL, model: 'm' },
      undefined
    )).rejects.toThrow('503: model unavailable');

    server?.closeAllConnections();
    if (server) await new Promise<void>(resolve => server?.close(() => resolve()));
    server = undefined;
    baseURL = await listen(() => {});
    await expect(new LlamaCppFimBackend().complete(
      { language: 'text', filename: 'a', prefix: '', suffix: '' },
      { ...DEFAULT_SETTINGS, backend: 'llama-cpp', baseURL, model: 'm', timeout: 20 },
      undefined
    )).rejects.toThrow('timed out after 20 ms');
  });

  it('supports external cancellation', async () => {
    const baseURL = await listen(() => {});
    const controller = new AbortController();
    const result = new LlamaCppFimBackend().complete(
      { language: 'text', filename: 'a', prefix: '', suffix: '' },
      { ...DEFAULT_SETTINGS, backend: 'llama-cpp', baseURL, model: 'm' },
      undefined,
      controller.signal
    );
    controller.abort();
    await expect(result).rejects.toMatchObject({ name: 'AbortError' });
  });
});
