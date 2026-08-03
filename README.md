# Just Autocomplete

Just Autocomplete is a deliberately small VS Code extension for inline code completion with a local or self-hosted OpenAI-compatible or llama.cpp model. It has no chat, agents, project indexing, code actions, or telemetry.

The extension sends bounded text immediately before and after the cursor. The OpenAI-compatible backend also includes the current language mode and file name in its prompt; native llama.cpp FIM sends the prefix and suffix as separate fields. It never reads other files for a completion.

## Install

1. Build or download `just-autocomplete-0.1.0.vsix`.
2. In VS Code, run **Extensions: Install from VSIX...** and choose the file.
3. Run **Just Autocomplete: Open Settings**.
4. Enter the model exposed by your server, optionally enter an API key, and choose **Test Connection**.
5. Save the settings and start typing. Suggestions appear as standard inline completions and can be accepted with VS Code's usual key binding (normally Tab).

CLI installation is also available:

```sh
code --install-extension just-autocomplete-0.1.0.vsix
```

## Backends and endpoints

Choose the backend explicitly in settings. The extension does not probe servers, auto-detect a backend, or fall back between protocols. `Base URL` is backend-dependent: the extension does not add or remove `/v1`.

For **OpenAI-compatible — Chat Completions**, `Base URL` is normally an API root ending in `/v1`; the extension appends `/chat/completions`.

Example for an OpenAI-compatible Ollama endpoint:

```text
Base URL: http://localhost:11434/v1
Model: qwen2.5-coder:7b
```

For **llama.cpp — Native FIM**, use the llama.cpp server root. The extension appends `/infill` and sends the prefix and suffix separately, allowing llama.cpp to select FIM tokens from GGUF metadata. For example:

```sh
llama-server --fim-qwen-3b-default --port 8080
```

```text
Base URL: http://localhost:8080
Model: <the model or alias exposed by llama-server>
```

The model/alias entered in settings must match a model available from the server. The model must already be installed and served. Native Ollama `/api/generate` is not supported.

## Commands and status

- **Just Autocomplete: Open Settings** opens the protected settings webview.
- **Just Autocomplete: Toggle** enables or disables background completion.
- Clicking the single status bar item toggles completion. If setup is incomplete, it opens settings instead.

The status item reports `ready`, `generating`, `error`, `disabled`, or `setup required`. Background request failures never create popup notifications; a short error is available in the status bar tooltip.

## Settings

All non-secret settings use machine-scoped VS Code configuration and are not synchronized between computers. The optional API key is stored only in VS Code `SecretStorage`.

| Setting | Default | Purpose |
| --- | ---: | --- |
| `justAutocomplete.backend` | `openai-compatible` | Explicit backend protocol |
| `justAutocomplete.baseURL` | `http://localhost:11434/v1` | Backend API root |
| `justAutocomplete.model` | empty | Required model name |
| `justAutocomplete.delay` | `400` ms | Delay after the latest edit |
| `justAutocomplete.timeout` | `20000` ms | HTTP request timeout |
| `justAutocomplete.maxTokens` | `128` | Maximum response tokens |
| `justAutocomplete.temperature` | `0.2` | Sampling temperature |
| `justAutocomplete.prefixChars` | `12000` | Maximum prefix characters |
| `justAutocomplete.suffixChars` | `4000` | Maximum suffix characters |
| `justAutocomplete.maxLines` | `20` | Maximum completion lines |

New typing cancels both the pending debounce timer and active HTTP request. Results are discarded if the document version or cursor position changed while generation was running. Completions work in every language mode, including Markdown and plaintext, for `file` and `untitled` documents.

## Privacy and security

- No telemetry is collected.
- No workspace index is built.
- No other workspace files are read.
- Requests go only to the configured Base URL.
- The API key is never written to VS Code configuration.
- The settings webview uses a restrictive Content Security Policy, per-view nonce, and validated messages.

Your configured server receives bounded cursor context. The OpenAI-compatible backend also sends the current filename and language mode. Review that server's privacy and logging behavior before using sensitive code.

## Development

Requirements: Node.js 20+, npm, and VS Code 1.90+.

```sh
npm install
npm run lint
npm test
npm run build
npm run package
```

The production extension is bundled with esbuild into `dist/extension.js`; `@vscode/vsce` creates the local VSIX.

## Scope and limitations

Version 0.1.0 targets a local desktop VS Code workspace. Remote SSH, WSL, Dev Containers, and browser-based VS Code are not guaranteed. There is no public extension API and no Marketplace publication workflow in this release.
