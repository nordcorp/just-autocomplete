import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_SETTINGS } from '../src/settingsModel.js';
import { persistSettings } from '../src/settingsPersistence.js';

describe('settings persistence', () => {
  it('saves machine configuration through the adapter and stores the key as a secret', async () => {
    const writeConfiguration = vi.fn(async () => {});
    const secrets = { store: vi.fn(async () => {}), delete: vi.fn(async () => {}) };
    const settings = { ...DEFAULT_SETTINGS, model: 'local-model' };
    await persistSettings(settings, 'private-key', false, writeConfiguration, secrets);
    expect(writeConfiguration).toHaveBeenCalledWith(settings);
    expect(secrets.store).toHaveBeenCalledWith('justAutocomplete.apiKey', 'private-key');
    expect(secrets.delete).not.toHaveBeenCalled();
  });

  it('can remove a stored key without putting it in configuration', async () => {
    const writeConfiguration = vi.fn(async () => {});
    const secrets = { store: vi.fn(async () => {}), delete: vi.fn(async () => {}) };
    await persistSettings({ ...DEFAULT_SETTINGS, model: 'm' }, '', true, writeConfiguration, secrets);
    expect(secrets.delete).toHaveBeenCalledWith('justAutocomplete.apiKey');
    expect(secrets.store).not.toHaveBeenCalled();
  });
});
