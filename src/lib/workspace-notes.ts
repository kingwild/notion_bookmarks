import { unstable_cache } from 'next/cache';
import { notion } from './notion';
import { isNotionConfigPage, getConfigItem } from '@/types';

// Only called on the server. Never include these values in public site config or React props.
export const getNoteSettings = unstable_cache(async () => {
  if (process.env.NOTION_NOTES_DB_ID && process.env.NOTES_WRITE_KEY) return { databaseId: process.env.NOTION_NOTES_DB_ID, key: process.env.NOTES_WRITE_KEY };
  const response = await notion.databases.query({ database_id: process.env.NOTION_WEBSITE_CONFIG_ID!, filter: { or: [{ property: 'Name', title: { equals: 'NOTES_DATABASE_ID' } }, { property: 'Name', title: { equals: 'NOTES_WRITE_KEY' } }] } });
  const settings: Record<string, string> = {};
  for (const page of response.results) if (isNotionConfigPage(page)) { const item = getConfigItem(page); if (item) settings[item.key] = item.value; }
  return { databaseId: process.env.NOTION_NOTES_DB_ID || settings.NOTES_DATABASE_ID || '', key: process.env.NOTES_WRITE_KEY || settings.NOTES_WRITE_KEY || '' };
}, ['king-notes-settings'], { revalidate: 300 });

export function validateNote(body: unknown): { text: string; requestId: string; nickname: string } | null {
  if (!body || typeof body !== 'object') return null;
  const { text, requestId, nickname = '' } = body as Record<string, unknown>;
  if (typeof text !== 'string' || !text.trim() || text.length > 5000 || typeof requestId !== 'string' || !/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(requestId)) return null;
  if (typeof nickname !== 'string' || nickname.length > 40) return null;
  return { text: text.trim(), requestId, nickname: nickname.trim() || '访客' };
}
