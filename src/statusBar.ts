import * as vscode from 'vscode';
import type { StatusState } from './types.js';

export class CompletionStatus implements vscode.Disposable {
  private readonly item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  private state: StatusState = 'setup required';
  private detail = '';

  constructor() {
    this.item.command = 'justAutocomplete.toggle';
    this.render();
    this.item.show();
  }

  set(state: StatusState, detail = ''): void {
    this.state = state;
    this.detail = detail;
    this.render();
  }

  private render(): void {
    const icons: Record<StatusState, string> = {
      ready: '$(sparkle)',
      generating: '$(loading~spin)',
      error: '$(error)',
      disabled: '$(circle-slash)',
      'setup required': '$(gear)'
    };
    this.item.text = `${icons[this.state]} Just Autocomplete: ${this.state}`;
    this.item.tooltip = this.detail ? `Just Autocomplete — ${this.state}\n${this.detail}` : `Just Autocomplete — ${this.state}`;
    this.item.backgroundColor = this.state === 'error' ? new vscode.ThemeColor('statusBarItem.errorBackground') : undefined;
  }

  dispose(): void {
    this.item.dispose();
  }
}
