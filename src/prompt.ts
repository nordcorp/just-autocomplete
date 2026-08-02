import type { ChatMessage, CompletionContext } from './types.js';

export const SYSTEM_PROMPT = `You are an inline code completion engine. Return only the exact code to insert at the cursor. Never use Markdown fences, commentary, explanations, or surrounding code. Continue naturally from the prefix toward the suffix without repeating either.`;

export function buildMessages(context: CompletionContext): ChatMessage[] {
  return [
    { role: 'system', content: SYSTEM_PROMPT },
    {
      role: 'user',
      content: [
        `<language>${escapeTag(context.language)}</language>`,
        `<filename>${escapeTag(context.filename)}</filename>`,
        '<prefix>',
        context.prefix,
        '</prefix>',
        '<suffix>',
        context.suffix,
        '</suffix>'
      ].join('\n')
    }
  ];
}

function escapeTag(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

export function trimContext(
  prefix: string,
  suffix: string,
  prefixChars: number,
  suffixChars: number
): Pick<CompletionContext, 'prefix' | 'suffix'> {
  return {
    prefix: prefix.slice(-prefixChars),
    suffix: suffix.slice(0, suffixChars)
  };
}
