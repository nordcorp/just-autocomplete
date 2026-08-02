import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, validateSettings } from '../src/settingsModel.js';

describe('settings validation', () => {
  it('accepts valid settings', () => {
    expect(validateSettings({ ...DEFAULT_SETTINGS, model: 'qwen2.5-coder' }).errors).toEqual([]);
  });

  it('validates URL, model and numeric ranges', () => {
    const result = validateSettings({ ...DEFAULT_SETTINGS, baseURL: 'file:///tmp/model', model: '', delay: -1, maxLines: 1.5 });
    expect(result.errors).toContain('Base URL must use HTTP or HTTPS.');
    expect(result.errors).toContain('Model is required.');
    expect(result.errors).toContain('delay must be between 0 and 5000.');
    expect(result.errors).toContain('maxLines must be an integer.');
  });
});
