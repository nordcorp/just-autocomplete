export function cleanCompletion(
  raw: string,
  prefix: string,
  suffix: string,
  eol: '\n' | '\r\n',
  maxLines: number
): string {
  let value = stripFence(raw).replace(/\r\n?|\n/g, '\n');
  value = removePrefixOverlap(value, prefix.replace(/\r\n?/g, '\n'));
  value = removeSuffixOverlap(value, suffix.replace(/\r\n?/g, '\n'));
  value = limitLines(value, maxLines);
  return eol === '\r\n' ? value.replace(/\n/g, '\r\n') : value;
}

export function stripFence(value: string): string {
  const match = value.match(/^\s*```[^\n]*\n([\s\S]*?)\n?```\s*$/);
  return match?.[1] ?? value;
}

export function removePrefixOverlap(value: string, prefix: string): string {
  const limit = Math.min(value.length, prefix.length);
  for (let length = limit; length > 0; length -= 1) {
    if (value.startsWith(prefix.slice(-length))) return value.slice(length);
  }
  return value;
}

export function removeSuffixOverlap(value: string, suffix: string): string {
  const limit = Math.min(value.length, suffix.length);
  for (let length = limit; length > 0; length -= 1) {
    if (value.endsWith(suffix.slice(0, length))) return value.slice(0, -length);
  }
  return value;
}

export function limitLines(value: string, maxLines: number): string {
  const lines = value.split('\n');
  return lines.length <= maxLines ? value : lines.slice(0, maxLines).join('\n');
}
