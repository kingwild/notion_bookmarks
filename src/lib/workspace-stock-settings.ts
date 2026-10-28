// Notion limits each rich-text segment to 2,000 characters. Split by code point
// to preserve emoji and keep every segment under 2,000 UTF-16 code units too.
export function stockSettingText(value: unknown) {
  const characters = Array.from(JSON.stringify(value));
  const parts = [];
  for (let i = 0; i < characters.length; i += 1000) parts.push({ text: { content: characters.slice(i, i + 1000).join('') } });
  return parts;
}
