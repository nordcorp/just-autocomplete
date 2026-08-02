import { beforeEach, describe, expect, it, vi } from 'vitest';

const registeredCommands: string[] = [];
let providerRegistered = false;

vi.mock('vscode', () => ({
  StatusBarAlignment: { Right: 2 },
  ConfigurationTarget: { Global: 1 },
  EndOfLine: { CRLF: 2 },
  ViewColumn: { One: 1 },
  ThemeColor: class { constructor(public id: string) {} },
  Range: class {},
  InlineCompletionItem: class {},
  window: {
    activeTextEditor: undefined,
    createStatusBarItem: () => ({ show: vi.fn(), dispose: vi.fn(), text: '', tooltip: '', command: '', backgroundColor: undefined }),
    createWebviewPanel: vi.fn()
  },
  workspace: {
    getConfiguration: () => ({ get: (key: string, fallback: unknown) => key === 'model' ? 'test-model' : fallback, update: vi.fn() }),
    onDidChangeConfiguration: () => ({ dispose: vi.fn() })
  },
  languages: {
    registerInlineCompletionItemProvider: () => { providerRegistered = true; return { dispose: vi.fn() }; }
  },
  commands: {
    registerCommand: (name: string) => { registeredCommands.push(name); return { dispose: vi.fn() }; }
  }
}));

describe('extension smoke test', () => {
  beforeEach(() => { registeredCommands.length = 0; providerRegistered = false; });

  it('activates and registers provider and commands', async () => {
    vi.resetModules();
    const extension = await import('../src/extension.js');
    const subscriptions: Array<{ dispose(): void }> = [];
    extension.activate({
      subscriptions,
      secrets: { get: vi.fn(), store: vi.fn(), delete: vi.fn() },
      globalState: { get: vi.fn((_key: string, fallback: unknown) => fallback), update: vi.fn() }
    } as never);
    expect(providerRegistered).toBe(true);
    expect(registeredCommands).toEqual(expect.arrayContaining(['justAutocomplete.openSettings', 'justAutocomplete.toggle']));
    expect(subscriptions.length).toBeGreaterThanOrEqual(5);
  });
});
