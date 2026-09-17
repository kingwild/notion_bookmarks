import { readFile } from 'node:fs/promises';
import type { Category, Link, WebsiteConfig } from '@/types';

// Development-only snapshots allow UI review when the local network cannot reach Notion.
// The snapshot is ignored by git. Production always reads Notion.
export async function localPreview(): Promise<{ links: Link[]; categories: Category[]; config: WebsiteConfig } | null> {
  if (process.env.NODE_ENV !== 'development' || process.env.LOCAL_PREVIEW_DATA !== '1') return null;
  return JSON.parse(await readFile('.preview-data.json', 'utf8'));
}
