import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { notion } from '@/lib/notion';
import { requireOwner, readBody } from '@/lib/workspace-owner';

export async function DELETE(request: NextRequest) {
  try {
    const denied = await requireOwner(request); if (denied) return denied;
    const body = await readBody(request, 1000);
    if (typeof body.id !== 'string' || !/^[a-f0-9-]{32,36}$/i.test(body.id) || body.confirmed !== true) return NextResponse.json({ error: '请先确认删除' }, { status: 400 });
    const page = await notion.pages.retrieve({ page_id: body.id });
    if (!('parent' in page) || page.parent.type !== 'database_id' || page.parent.database_id.replaceAll('-', '') !== process.env.NOTION_LINKS_DB_ID?.replaceAll('-', '')) return NextResponse.json({ error: '网站不在导航数据库中' }, { status: 400 });
    if (!page.archived) await notion.pages.update({ page_id: body.id, archived: true });
    revalidatePath('/');
    return NextResponse.json({ deleted: true }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch { return NextResponse.json({ error: '删除结果未确认，请刷新核对后重试' }, { status: 502 }); }
}
