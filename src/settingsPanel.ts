import { randomBytes } from 'node:crypto';
import * as vscode from 'vscode';
import type { CompletionClient } from './client.js';
import { readSettings, saveSettings } from './config.js';
import { isRecord, validateSettings } from './settingsModel.js';
import { persistSettings } from './settingsPersistence.js';
import type { Settings } from './types.js';

type IncomingMessage =
  | { type: 'save'; settings: unknown; apiKey: string; clearApiKey: boolean }
  | { type: 'test'; settings: unknown; apiKey: string };

export class SettingsPanel {
  private static current: SettingsPanel | undefined;

  static show(context: vscode.ExtensionContext, client: CompletionClient): void {
    if (this.current) {
      this.current.panel.reveal(vscode.ViewColumn.One);
      return;
    }
    const panel = vscode.window.createWebviewPanel(
      'justAutocomplete.settings',
      'Just Autocomplete Settings',
      vscode.ViewColumn.One,
      { enableScripts: true, retainContextWhenHidden: true }
    );
    this.current = new SettingsPanel(panel, context, client);
  }

  private constructor(
    private readonly panel: vscode.WebviewPanel,
    private readonly context: vscode.ExtensionContext,
    private readonly client: CompletionClient
  ) {
    this.panel.webview.html = renderHtml(this.panel.webview, readSettings());
    this.panel.onDidDispose(() => { SettingsPanel.current = undefined; });
    this.panel.webview.onDidReceiveMessage(message => { void this.handleMessage(message); });
  }

  private async handleMessage(raw: unknown): Promise<void> {
    if (!isIncomingMessage(raw)) {
      await this.post({ type: 'result', ok: false, message: 'Invalid message.' });
      return;
    }
    const validation = validateSettings(raw.settings);
    if (!validation.value) {
      await this.post({ type: 'result', ok: false, message: validation.errors.join(' ') });
      return;
    }
    if (typeof raw.apiKey !== 'string' || raw.apiKey.length > 10_000) {
      await this.post({ type: 'result', ok: false, message: 'API key is invalid.' });
      return;
    }
    try {
      if (raw.type === 'save') {
        await persistSettings(validation.value, raw.apiKey, raw.clearApiKey, saveSettings, this.context.secrets);
        await this.post({ type: 'result', ok: true, message: 'Settings saved.' });
      } else {
        const stored = await this.context.secrets.get('justAutocomplete.apiKey');
        const latency = await this.client.testConnection(validation.value, raw.apiKey || stored);
        await this.post({ type: 'result', ok: true, message: `Connection succeeded in ${latency} ms.` });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await this.post({ type: 'result', ok: false, message: message.slice(0, 300) });
    }
  }

  private async post(message: unknown): Promise<void> {
    await this.panel.webview.postMessage(message);
  }
}

function isIncomingMessage(value: unknown): value is IncomingMessage {
  if (!isRecord(value) || (value.type !== 'save' && value.type !== 'test')) return false;
  if (!Object.hasOwn(value, 'settings') || typeof value.apiKey !== 'string') return false;
  return value.type === 'test' || typeof value.clearApiKey === 'boolean';
}

function renderHtml(webview: vscode.Webview, settings: Settings): string {
  const nonce = randomBytes(18).toString('base64');
  const initial = JSON.stringify(settings).replaceAll('<', '\\u003c');
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'nonce-${nonce}'; script-src 'nonce-${nonce}';">
  <style nonce="${nonce}">
    body{font-family:var(--vscode-font-family);color:var(--vscode-foreground);background:var(--vscode-editor-background);max-width:760px;margin:32px auto;padding:0 24px}h1{font-size:24px}fieldset{border:1px solid var(--vscode-widget-border);margin:20px 0;padding:18px}legend{padding:0 8px;font-weight:600}.grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}.wide{grid-column:1/-1}label{display:flex;flex-direction:column;gap:6px}input{box-sizing:border-box;width:100%;padding:7px;border:1px solid var(--vscode-input-border);color:var(--vscode-input-foreground);background:var(--vscode-input-background)}.check{display:flex;flex-direction:row;align-items:center}.check input{width:auto}button{padding:7px 14px;margin-right:8px;border:0;color:var(--vscode-button-foreground);background:var(--vscode-button-background)}button:hover{background:var(--vscode-button-hoverBackground)}#status{margin-top:16px;min-height:20px}.error{color:var(--vscode-errorForeground)}@media(max-width:560px){.grid{grid-template-columns:1fr}}
  </style>
</head>
<body>
  <h1>Just Autocomplete</h1>
  <p>Configure an OpenAI-compatible Chat Completions endpoint. The API key is stored only in VS Code SecretStorage.</p>
  <form id="form">
    <fieldset><legend>Basic</legend><div class="grid">
      <label class="wide">Base URL<input name="baseURL" type="url" required></label>
      <label>Model<input name="model" required></label>
      <label>Delay (ms)<input name="delay" type="number" min="0" max="5000" step="1" required></label>
      <label class="wide">API key (blank keeps stored key)<input name="apiKey" type="password" autocomplete="off"></label>
      <label class="check wide"><input name="clearApiKey" type="checkbox"> Remove stored API key on save</label>
    </div></fieldset>
    <fieldset><legend>Advanced</legend><div class="grid">
      <label>Timeout (ms)<input name="timeout" type="number" min="1000" max="120000" step="1" required></label>
      <label>Max tokens<input name="maxTokens" type="number" min="1" max="4096" step="1" required></label>
      <label>Temperature<input name="temperature" type="number" min="0" max="2" step="0.1" required></label>
      <label>Prefix characters<input name="prefixChars" type="number" min="100" max="100000" step="1" required></label>
      <label>Suffix characters<input name="suffixChars" type="number" min="0" max="50000" step="1" required></label>
      <label>Maximum lines<input name="maxLines" type="number" min="1" max="100" step="1" required></label>
    </div></fieldset>
    <button type="submit">Save</button><button id="test" type="button">Test Connection</button>
    <div id="status" role="status" aria-live="polite"></div>
  </form>
  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi(); const initial = ${initial}; const form = document.getElementById('form'); const status = document.getElementById('status');
    for (const [key,value] of Object.entries(initial)) if (form.elements.namedItem(key)) form.elements.namedItem(key).value = String(value);
    const numbers = ['delay','timeout','maxTokens','temperature','prefixChars','suffixChars','maxLines'];
    function payload(){const data=Object.fromEntries(new FormData(form));for(const key of numbers)data[key]=Number(data[key]);return {settings:{baseURL:data.baseURL,model:data.model,delay:data.delay,timeout:data.timeout,maxTokens:data.maxTokens,temperature:data.temperature,prefixChars:data.prefixChars,suffixChars:data.suffixChars,maxLines:data.maxLines},apiKey:data.apiKey||'',clearApiKey:form.elements.clearApiKey.checked};}
    function send(type){status.textContent='Working…';status.className='';vscode.postMessage({type,...payload()});}
    form.addEventListener('submit',event=>{event.preventDefault();if(form.reportValidity())send('save');}); document.getElementById('test').addEventListener('click',()=>{if(form.reportValidity())send('test');});
    window.addEventListener('message',event=>{const m=event.data;if(!m||m.type!=='result'||typeof m.ok!=='boolean'||typeof m.message!=='string')return;status.textContent=m.message;status.className=m.ok?'':'error';});
  </script>
</body></html>`;
}
