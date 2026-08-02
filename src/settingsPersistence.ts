import { validateSettings } from './settingsModel.js';
import type { Settings } from './types.js';

export interface SecretWriter {
  store(key: string, value: string): Thenable<void>;
  delete(key: string): Thenable<void>;
}

export async function persistSettings(
  candidate: unknown,
  apiKey: string,
  clearApiKey: boolean,
  writeConfiguration: (settings: Settings) => Promise<void>,
  secrets: SecretWriter
): Promise<void> {
  const validation = validateSettings(candidate);
  if (!validation.value) throw new Error(validation.errors.join(' '));
  await writeConfiguration(validation.value);
  if (clearApiKey) await secrets.delete('justAutocomplete.apiKey');
  else if (apiKey) await secrets.store('justAutocomplete.apiKey', apiKey);
}
