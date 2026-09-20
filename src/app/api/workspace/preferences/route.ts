import { NextRequest, NextResponse } from 'next/server';
import { notion } from '@/lib/notion';
import { privateSetting, readBody, requireOwner } from '@/lib/workspace-owner';
import { validateStocks } from '@/lib/workspace-validation';

export const dynamic = 'force-dynamic';
export async function GET() {
  try { const setting = await privateSetting('WORKSPACE_STOCKS'); return NextResponse.json({ stocks: setting ? validateStocks(JSON.parse(setting.value)) : null, revision: setting?.revision || '' }, { headers: { 'Cache-Control': 'no-store' } }); }
  catch { return NextResponse.json({ error: '自选同步暂时不可用' }, { status: 503 }); }
}
export async function PUT(request: NextRequest) {
  try {
    const denied = await requireOwner(request); if (denied) return denied;
    const body = await readBody(request, 6000);
    const stocks = validateStocks(body.stocks);
    if (!stocks) return NextResponse.json({ error: '股票列表格式无效，支持 1 至 10 个自选' }, { status: 400 });
    const setting = await privateSetting('WORKSPACE_STOCKS');
    if (!setting) return NextResponse.json({ error: '请先完成 Notion 同步配置' }, { status: 503 });
    if (body.revision !== setting.revision) return NextResponse.json({ error: '列表已在其他设备更新，请刷新后重试' }, { status: 409 });
    const page = await notion.pages.update({ page_id: setting.id, properties: { Value: { rich_text: [{ text: { content: JSON.stringify(stocks) } }] } } });
    return NextResponse.json({ stocks, revision: 'last_edited_time' in page ? page.last_edited_time : '' });
  } catch { return NextResponse.json({ error: '保存失败，未确认同步；请刷新后重试' }, { status: 502 }); }
}
