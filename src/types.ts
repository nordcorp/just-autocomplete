export type BackendKind = 'openai-compatible' | 'llama-cpp' | 'ollama';

export interface Settings {
  backend: BackendKind;
  baseURL: string;
  model: string;
  delay: number;
  timeout: number;
  maxTokens: number;
  temperature: number;
  prefixChars: number;
  suffixChars: number;
  maxLines: number;
}

export interface CompletionContext {
  language: string;
  filename: string;
  prefix: string;
  suffix: string;
}

export interface CompletionSnapshot extends CompletionContext {
  documentVersion: number;
  offset: number;
  eol: '\n' | '\r\n';
}

export interface ChatMessage {
  role: 'system' | 'user';
  content: string;
}

export type StatusState = 'ready' | 'generating' | 'error' | 'disabled' | 'setup required';
