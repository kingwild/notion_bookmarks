import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { notion } from './notion';
import { getNoteSettings } from './workspace-notes';
import { validSession } from './workspace-owner-crypto';
import { isNotionConfigPage, getConfigItem } from '@/types';

export const OWNER_COOKIE = 'king-owner';
export async function privateSetting(name: string) {
  const data = await notion.databases.query({ database_id: process.env.NOTION_WEBSITE_CONFIG_ID!, filter: { property: 'Name', title: { equals: name } } });
  const page = data.results.find(isNotionConfigPage);
  return page ? { id: page.id, value: getConfigItem(page)?.value || '', revision: page.last_edited_time } : null;
}
export async function ownerSettings() {
  const [settings, hash] = await Promise.all([getNoteSettings(), privateSetting('OWNER_PASSWORD_HASH')]);
  return { key: settings.key, hash: hash?.value || '' };
}
export async function isOwner() {
  const token = (await cookies()).get(OWNER_COOKIE)?.value;
  if (!token) return false;
  const { key, hash } = await ownerSettings();
  return validSession(token, key, hash);
}
export function sameOrigin(request: NextRequest) {
  try { return new URL(request.headers.get('origin') || '').host === request.headers.get('host'); } catch { return false; }
}
export async function requireOwner(request: NextRequest) {
  if (!sameOrigin(request)) return NextResponse.json({ error: '请从本网站提交' }, { status: 403 });
  if (!await isOwner()) return NextResponse.json({ error: '请先登录站主管理' }, { status: 401 });
  return null;
}
export async function readBody(request: NextRequest, limit = 24000): Promise<Record<string, unknown>> {
  const reader = request.body?.getReader();
  if (!reader) throw new Error('缺少请求内容');
  const chunks: Uint8Array[] = []; let size = 0;
  try { for (;;) { const { done, value } = await reader.read(); if (done) break; size += value.length; if (size > limit) throw new Error('内容过长'); chunks.push(value); } }
  finally { await reader.cancel(); }
  const body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('内容格式不正确');
  return body;
}
