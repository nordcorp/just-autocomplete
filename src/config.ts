import * as vscode from 'vscode';
import { DEFAULT_SETTINGS, validateSettings } from './settingsModel.js';
import type { Settings } from './types.js';

const section = 'justAutocomplete';
const keys = Object.keys(DEFAULT_SETTINGS) as Array<keyof Settings>;

export function readSettings(): Settings {
  const configuration = vscode.workspace.getConfiguration(section);
  return Object.fromEntries(keys.map(key => [key, configuration.get(key, DEFAULT_SETTINGS[key])])) as unknown as Settings;
}

export async function saveSettings(settings: Settings): Promise<void> {
  const validated = validateSettings(settings);
  if (!validated.value) throw new Error(validated.errors.join('\n'));
  const configuration = vscode.workspace.getConfiguration(section);
  await Promise.all(keys.map(key => configuration.update(key, validated.value?.[key], vscode.ConfigurationTarget.Global)));
}

export function isConfigured(settings = readSettings()): boolean {
  return validateSettings(settings).errors.length === 0;
}
