import { NextRequest, NextResponse } from 'next/server';
import { notion } from '@/lib/notion';
import { getNoteSettings, validateNote } from '@/lib/workspace-notes';
import { createHmac } from 'node:crypto';

export const runtime = 'nodejs';
const activeRequests = new Set<string>();
const activeClients = new Set<string>();

export async function POST(request: NextRequest) {
  // Public submissions. The server key salts client identifiers; it never reaches visitors.
  const origin = request.headers.get('origin');
  let sameOrigin = false;
  try { const source = new URL(origin || ''); sameOrigin = ['https:', 'http:'].includes(source.protocol) && source.host === request.headers.get('host'); } catch {}
  if (!sameOrigin) return NextResponse.json({ error: '请求来源不匹配' }, { status: 403 });
  if (!request.headers.get('content-type')?.startsWith('application/json')) return NextResponse.json({ error: '请使用 JSON 格式' }, { status: 415 });
  if (Number(request.headers.get('content-length') || 0) > 24000) return NextResponse.json({ error: '内容过长' }, { status: 413 });
  let requestId = '';
  let clientHash = '';
  try {
    const settings = await getNoteSettings();
    if (!settings.databaseId || !settings.key) return NextResponse.json({ error: '随手记尚未配置完成，草稿已保留' }, { status: 503 });
    const raw = await request.text();
    if (Buffer.byteLength(raw) > 24000) return NextResponse.json({ error: '内容过长' }, { status: 413 });
    let body: unknown;
    try { body = JSON.parse(raw); } catch { return NextResponse.json({ error: '内容格式无效' }, { status: 400 }); }
    const note = validateNote(body);
    if (!note) return NextResponse.json({ error: '请输入 1–5000 字的内容后重试' }, { status: 400 });
    if (activeRequests.has(note.requestId)) return NextResponse.json({ error: '这条内容正在保存，请稍后重试' }, { status: 409 });
    requestId = note.requestId; activeRequests.add(requestId);
    const existing = await notion.databases.query({ database_id: settings.databaseId, page_size: 1, filter: { property: 'RequestId', rich_text: { equals: note.requestId } } });
    if (existing.results.length) return NextResponse.json({ ok: true });
    const address = request.headers.get('x-vercel-forwarded-for') || request.headers.get('x-forwarded-for') || 'local';
    const hash = createHmac('sha256', settings.key).update(address.split(',')[0].trim()).digest('hex');
    if (activeClients.has(hash)) return NextResponse.json({ error: '正在提交，请稍后再试' }, { status: 429 });
    clientHash = hash; activeClients.add(hash);
    // Persisted rate check also covers subsequent serverless instances. In-flight guards
    // additionally serialize submissions within an instance, not across all regions.
    const recent = await notion.databases.query({ database_id: settings.databaseId, page_size: 3, filter: { and: [
      { property: 'ClientHash', rich_text: { equals: hash } },
      { property: 'Created', created_time: { on_or_after: new Date(Date.now() - 60000).toISOString() } },
    ] } });
    if (recent.results.length >= 3) return NextResponse.json({ error: '留言太频繁，请一分钟后再试，草稿已保留' }, { status: 429, headers: { 'Retry-After': '60' } });
    const chunks = note.text.match(/[\s\S]{1,1800}/g) || [];
    await notion.pages.create({ parent: { database_id: settings.databaseId }, properties: {
      Name: { title: [{ text: { content: note.text.split('\n')[0].slice(0, 70) } }] },
      Content: { rich_text: chunks.map(content => ({ text: { content } })) },
      RequestId: { rich_text: [{ text: { content: note.requestId } }] },
      Nickname: { rich_text: [{ text: { content: note.nickname } }] },
      ClientHash: { rich_text: [{ text: { content: hash } }] },
      Status: { select: { name: '未整理' } },
    }, children: chunks.map(content => ({ object: 'block' as const, type: 'paragraph' as const, paragraph: { rich_text: [{ type: 'text' as const, text: { content } }] } })) });
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch { return NextResponse.json({ error: 'Notion 暂时无法保存，草稿已保留，请稍后重试' }, { status: 502 }); }
  finally { if (requestId) activeRequests.delete(requestId); if (clientHash) activeClients.delete(clientHash); }
}
