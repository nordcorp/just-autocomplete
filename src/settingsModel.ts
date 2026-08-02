import type { Settings } from './types.js';

export const DEFAULT_SETTINGS: Settings = {
  baseURL: 'http://localhost:11434/v1',
  model: '',
  delay: 400,
  timeout: 20_000,
  maxTokens: 128,
  temperature: 0.2,
  prefixChars: 12_000,
  suffixChars: 4_000,
  maxLines: 20
};

const ranges: Record<Exclude<keyof Settings, 'baseURL' | 'model'>, readonly [number, number]> = {
  delay: [0, 5_000],
  timeout: [1_000, 120_000],
  maxTokens: [1, 4_096],
  temperature: [0, 2],
  prefixChars: [100, 100_000],
  suffixChars: [0, 50_000],
  maxLines: [1, 100]
};

export function validateSettings(value: unknown): { value?: Settings; errors: string[] } {
  if (!isRecord(value)) return { errors: ['Settings must be an object.'] };
  const errors: string[] = [];
  const baseURL = typeof value.baseURL === 'string' ? value.baseURL.trim() : '';
  const model = typeof value.model === 'string' ? value.model.trim() : '';
  try {
    const url = new URL(baseURL);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') errors.push('Base URL must use HTTP or HTTPS.');
    if (url.search || url.hash) errors.push('Base URL must not contain a query or fragment.');
  } catch {
    errors.push('Base URL is not a valid URL.');
  }
  if (!model) errors.push('Model is required.');

  const numeric = {} as Pick<Settings, keyof typeof ranges>;
  for (const [key, [min, max]] of Object.entries(ranges) as Array<[keyof typeof ranges, readonly [number, number]]>) {
    const number = value[key];
    if (typeof number !== 'number' || !Number.isFinite(number) || number < min || number > max) {
      errors.push(`${key} must be between ${min} and ${max}.`);
    } else if (key !== 'temperature' && !Number.isInteger(number)) {
      errors.push(`${key} must be an integer.`);
    } else {
      numeric[key] = number;
    }
  }

  return errors.length > 0 ? { errors } : { value: { baseURL, model, ...numeric }, errors };
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
