import { describe, expect, it } from 'vitest';
import { chatCompletionsURL, infillURL, ollamaGenerateURL } from '../src/endpoint.js';
import { buildMessages, trimContext } from '../src/prompt.js';
import { cleanCompletion, limitLines, removeSuffixOverlap, stripFence } from '../src/response.js';

describe('endpoint normalization', () => {
  it('appends chat/completions without duplicate slashes', () => {
    expect(chatCompletionsURL('http://localhost:11434/v1/')).toBe('http://localhost:11434/v1/chat/completions');
    expect(chatCompletionsURL('https://example.test')).toBe('https://example.test/chat/completions');
    expect(infillURL('http://localhost:8080/')).toBe('http://localhost:8080/infill');
    expect(ollamaGenerateURL('http://localhost:11434/api/')).toBe('http://localhost:11434/api/generate');
  });
});

describe('prompt and context', () => {
  it('includes only language, filename, prefix and suffix', () => {
    const messages = buildMessages({ language: 'typescript', filename: 'demo.ts', prefix: 'const a = ', suffix: ';' });
    expect(messages).toHaveLength(2);
    expect(messages[0]?.content).toContain('only the exact code');
    expect(messages[1]?.content).toContain('<language>typescript</language>');
    expect(messages[1]?.content).toContain('<filename>demo.ts</filename>');
    expect(messages[1]?.content).not.toContain('workspace');
  });

  it('keeps context nearest to the cursor', () => {
    expect(trimContext('0123456789', 'abcdefghij', 4, 3)).toEqual({ prefix: '6789', suffix: 'abc' });
  });
});

describe('completion cleanup', () => {
  it('removes markdown fences', () => {
    expect(stripFence('```ts\nconst x = 1;\n```')).toBe('const x = 1;');
  });

  it('removes repeated prefix and suffix and normalizes EOL', () => {
    expect(cleanCompletion('foo()\n}\nnext()', 'function foo() {\n', '\nnext()', '\r\n', 20)).toBe('foo()\r\n}');
  });

  it('removes overlap with the suffix', () => {
    expect(removeSuffixOverlap('return answer;\n}', '\n}\nnext();')).toBe('return answer;');
  });

  it('limits multiline completions', () => {
    expect(limitLines('a\nb\nc\nd', 3)).toBe('a\nb\nc');
  });
});
