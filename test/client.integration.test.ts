import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { afterEach, describe, expect, it } from 'vitest';
import { CompletionClient } from '../src/client.js';
import { DEFAULT_SETTINGS } from '../src/settingsModel.js';

let server: Server | undefined;
afterEach(async () => {
  if (server) await new Promise<void>(resolve => server?.close(() => resolve()));
  server = undefined;
});

type RequestListener = (request: IncomingMessage, response: ServerResponse) => void;

async function listen(handler: RequestListener): Promise<string> {
  server = createServer(handler);
  await new Promise<void>(resolve => server?.listen(0, '127.0.0.1', () => resolve()));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Missing test server address');
  return `http://127.0.0.1:${address.port}/v1`;
}

describe('CompletionClient integration', () => {
  it('posts Chat Completions body and Bearer header', async () => {
    let requestBody = '';
    let authorization: string | undefined;
    const baseURL = await listen((request, response) => {
      authorization = request.headers.authorization;
      request.on('data', chunk => { requestBody += String(chunk); });
      request.on('end', () => {
        response.setHeader('content-type', 'application/json');
        response.end(JSON.stringify({ choices: [{ message: { content: 'world' } }] }));
      });
    });
    const result = await new CompletionClient().complete(
      { language: 'text', filename: 'a.txt', prefix: 'hello ', suffix: '' },
      { ...DEFAULT_SETTINGS, baseURL, model: 'local-model' },
      'secret'
    );
    expect(result).toBe('world');
    expect(authorization).toBe('Bearer secret');
    const body = JSON.parse(requestBody) as Record<string, unknown>;
    expect(body.model).toBe('local-model');
    expect(body.max_tokens).toBe(128);
    expect(body.stream).toBe(false);
    expect(JSON.stringify(body.messages)).toContain('<filename>a.txt</filename>');
  });

  it('reports server errors', async () => {
    const baseURL = await listen((_request, response) => { response.statusCode = 503; response.end('model unavailable'); });
    await expect(new CompletionClient().complete(
      { language: 'text', filename: 'a', prefix: '', suffix: '' },
      { ...DEFAULT_SETTINGS, baseURL, model: 'm' },
      undefined
    )).rejects.toThrow('503: model unavailable');
  });

  it('rejects empty and invalid responses', async () => {
    const baseURL = await listen((_request, response) => {
      response.setHeader('content-type', 'application/json');
      response.end(JSON.stringify({ choices: [] }));
    });
    await expect(new CompletionClient().complete(
      { language: 'text', filename: 'a', prefix: '', suffix: '' },
      { ...DEFAULT_SETTINGS, baseURL, model: 'm' },
      undefined
    )).rejects.toThrow('invalid Chat Completions');
  });

  it('enforces the request timeout', async () => {
    const baseURL = await listen(() => {});
    await expect(new CompletionClient().complete(
      { language: 'text', filename: 'a', prefix: '', suffix: '' },
      { ...DEFAULT_SETTINGS, baseURL, model: 'm', timeout: 20 },
      undefined
    )).rejects.toThrow('timed out after 20 ms');
  });

  it('performs a short real connection request', async () => {
    let maxTokens: unknown;
    const baseURL = await listen((request, response) => {
      let body = '';
      request.on('data', chunk => { body += String(chunk); });
      request.on('end', () => {
        maxTokens = (JSON.parse(body) as Record<string, unknown>).max_tokens;
        response.setHeader('content-type', 'application/json');
        response.end(JSON.stringify({ choices: [{ message: { content: 'OK' } }] }));
      });
    });
    const latency = await new CompletionClient().testConnection({ ...DEFAULT_SETTINGS, baseURL, model: 'm' }, undefined);
    expect(latency).toBeGreaterThanOrEqual(0);
    expect(maxTokens).toBe(8);
  });
});
