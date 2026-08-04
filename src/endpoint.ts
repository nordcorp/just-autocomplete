export function chatCompletionsURL(baseURL: string): string {
  return endpointURL(baseURL, 'chat/completions');
}

export function infillURL(baseURL: string): string {
  return endpointURL(baseURL, 'infill');
}

export function ollamaGenerateURL(baseURL: string): string {
  return endpointURL(baseURL, 'generate');
}

function endpointURL(baseURL: string, endpoint: string): string {
  const url = new URL(baseURL.trim());
  url.pathname = `${url.pathname.replace(/\/+$/, '')}/${endpoint}`;
  url.search = '';
  url.hash = '';
  return url.toString();
}
