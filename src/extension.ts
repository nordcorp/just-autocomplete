import * as vscode from 'vscode';
import { CompletionClient } from './client.js';
import { CompletionService } from './completionService.js';
import { isConfigured, readSettings } from './config.js';
import { InlineCompletionProvider } from './provider.js';
import { SettingsPanel } from './settingsPanel.js';
import { CompletionStatus } from './statusBar.js';

const enabledKey = 'justAutocomplete.enabled';

export function activate(context: vscode.ExtensionContext): void {
  const client = new CompletionClient();
  const status = new CompletionStatus();
  let enabled = context.globalState.get(enabledKey, true);
  const updateStatus = (): void => {
    const settings = readSettings();
    if (!isConfigured(settings)) status.set('setup required', 'Open settings and select a model.');
    else if (!enabled) status.set('disabled', settings.model);
    else status.set('ready', settings.model);
  };
  const provider = new InlineCompletionProvider(new CompletionService(client), context.secrets, status, () => enabled);
  const selector: vscode.DocumentSelector = [{ scheme: 'file' }, { scheme: 'untitled' }];

  context.subscriptions.push(
    status,
    provider,
    vscode.languages.registerInlineCompletionItemProvider(selector, provider),
    vscode.commands.registerCommand('justAutocomplete.openSettings', () => SettingsPanel.show(context, client)),
    vscode.commands.registerCommand('justAutocomplete.toggle', async () => {
      if (!isConfigured()) {
        SettingsPanel.show(context, client);
        return;
      }
      enabled = !enabled;
      provider.dispose();
      await context.globalState.update(enabledKey, enabled);
      updateStatus();
    }),
    vscode.workspace.onDidChangeConfiguration(event => {
      if (event.affectsConfiguration('justAutocomplete')) {
        provider.dispose();
        updateStatus();
      }
    })
  );
  updateStatus();
}

export function deactivate(): void {}
