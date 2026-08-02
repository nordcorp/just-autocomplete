import * as path from 'node:path';
import * as vscode from 'vscode';
import type { CompletionService } from './completionService.js';
import { readSettings } from './config.js';
import { trimContext } from './prompt.js';
import type { CompletionStatus } from './statusBar.js';
import type { CompletionSnapshot } from './types.js';

export class InlineCompletionProvider implements vscode.InlineCompletionItemProvider, vscode.Disposable {
  private generationId = 0;

  constructor(
    private readonly service: CompletionService,
    private readonly secrets: vscode.SecretStorage,
    private readonly status: CompletionStatus,
    private readonly isEnabled: () => boolean
  ) {}

  async provideInlineCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position,
    _context: vscode.InlineCompletionContext,
    token: vscode.CancellationToken
  ): Promise<vscode.InlineCompletionList> {
    if (!this.isEnabled() || (document.uri.scheme !== 'file' && document.uri.scheme !== 'untitled')) return { items: [] };
    const settings = readSettings();
    if (!settings.model.trim()) return { items: [] };

    const version = document.version;
    const offset = document.offsetAt(position);
    const allText = document.getText();
    const trimmed = trimContext(allText.slice(0, offset), allText.slice(offset), settings.prefixChars, settings.suffixChars);
    const snapshot: CompletionSnapshot = {
      language: document.languageId,
      filename: document.uri.scheme === 'untitled' ? document.fileName : path.basename(document.fileName),
      ...trimmed,
      documentVersion: version,
      offset,
      eol: document.eol === vscode.EndOfLine.CRLF ? '\r\n' : '\n'
    };
    const controller = new AbortController();
    const cancellation = token.onCancellationRequested(() => controller.abort());
    const generationId = ++this.generationId;
    this.status.set('generating', settings.model);
    try {
      const apiKey = await this.secrets.get('justAutocomplete.apiKey');
      const completion = await this.service.generate(
        snapshot,
        settings,
        apiKey,
        () => isSnapshotCurrent(document, position, version),
        controller.signal
      );
      if (generationId === this.generationId) this.status.set('ready', settings.model);
      if (!completion || generationId !== this.generationId) return { items: [] };
      return { items: [new vscode.InlineCompletionItem(completion, new vscode.Range(position, position))] };
    } catch (error) {
      if (isAbort(error) || token.isCancellationRequested) {
        if (generationId === this.generationId) this.status.set('ready', settings.model);
        return { items: [] };
      }
      if (generationId === this.generationId) this.status.set('error', shortError(error));
      return { items: [] };
    } finally {
      cancellation.dispose();
    }
  }

  dispose(): void {
    this.generationId += 1;
    this.service.dispose();
  }
}

export function isSnapshotCurrent(
  document: vscode.TextDocument,
  position: vscode.Position,
  version: number
): boolean {
  const editor = vscode.window.activeTextEditor;
  return document.version === version && editor?.document === document && editor.selection.active.isEqual(position);
}

function isAbort(error: unknown): boolean {
  return error instanceof Error && (error.name === 'AbortError' || /abort/i.test(error.message));
}

export function shortError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return message.replace(/\s+/g, ' ').slice(0, 180);
}
