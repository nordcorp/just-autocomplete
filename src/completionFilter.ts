export function isTrivialClosingCompletion(completion: string): boolean {
  const compact = completion.replace(/\s/g, '');
  return compact.length > 0 && /^[)\]};,]+$/.test(compact);
}

export function filterCompletion(completion: string, automatic: boolean): string | undefined {
  if (completion.trim().length === 0) return undefined;
  return automatic && isTrivialClosingCompletion(completion) ? undefined : completion;
}
