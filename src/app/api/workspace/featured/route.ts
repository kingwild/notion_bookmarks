import { NextRequest, NextResponse } from 'next/server';
import { notion } from '@/lib/notion';
import { requireOwner, readBody } from '@/lib/workspace-owner';

export async function PUT(request: NextRequest) {
  try {
    const denied = await requireOwner(request); if (denied) return denied;
    const body = await readBody(request, 1000);
    if (typeof body.id !== 'string' || !/^[a-f0-9-]{32,36}$/i.test(body.id) || typeof body.featured !== 'boolean') return NextResponse.json({ error: '无效收藏' }, { status: 400 });
    const page = await notion.pages.retrieve({ page_id: body.id });
    if (!('parent' in page) || page.parent.type !== 'database_id' || page.parent.database_id.replaceAll('-', '') !== process.env.NOTION_LINKS_DB_ID?.replaceAll('-', '') || page.archived) return NextResponse.json({ error: '该网站不在导航数据库中' }, { status: 400 });
    await notion.pages.update({ page_id: body.id, properties: { '精选': { checkbox: body.featured } } });
    return NextResponse.json({ featured: body.featured });
  } catch { return NextResponse.json({ error: '精选保存失败，请刷新后重试' }, { status: 502 }); }
}
