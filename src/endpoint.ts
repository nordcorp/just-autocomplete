export function chatCompletionsURL(baseURL: string): string {
  const url = new URL(baseURL.trim());
  url.pathname = `${url.pathname.replace(/\/+$/, '')}/chat/completions`;
  url.search = '';
  url.hash = '';
  return url.toString();
}
