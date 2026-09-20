import { NextRequest, NextResponse } from 'next/server';
import type { CreatePageParameters } from '@notionhq/client/build/src/api-endpoints';
import { notion } from '@/lib/notion';
import { readBody, requireOwner } from '@/lib/workspace-owner';
import { validateCapture } from '@/lib/workspace-validation';

const destinations = {
  task: { database: '201056cc-e99d-81a2-a7b8-cff3b7e7a45c', title: '任务' },
  idea: { database: '201056cc-e99d-81a9-9b2c-d3ca0303f998', title: '名称' },
  expense: { database: '201056cc-e99d-8110-8274-e9d70be17f18', title: '支出' },
  income: { database: '201056cc-e99d-815a-b52f-c72fb7ea5ab4', title: '收入' },
};
const active = new Set<string>();
export async function POST(request: NextRequest) {
  let id = '', locked = false;
  try {
    const denied = await requireOwner(request); if (denied) return denied;
    const body = await readBody(request);
    const item = validateCapture(body.item);
    if (!item || typeof body.original !== 'string' || !body.original.trim() || body.original.length > 5000) return NextResponse.json({ error: '请检查标题、日期和金额（最多两位小数）' }, { status: 400 });
    id = item.id;
    if (active.has(id)) return NextResponse.json({ error: '这条内容正在保存，请稍后重试' }, { status: 409 });
    active.add(id); locked = true;
    // Check all destinations so changing a category after a timeout cannot create a second record.
    for (const destination of Object.values(destinations)) {
      const existing = await notion.databases.query({ database_id: destination.database, filter: { property: 'KING记录ID', rich_text: { equals: id } }, page_size: 1 }).catch(error => { if (error?.code === 'object_not_found' && destination.database !== destinations[item.kind].database) return { results: [] }; throw error; });
      const page = existing.results[0];
      if (page && 'url' in page) return NextResponse.json({ url: page.url, repeated: true });
    }
    const destination = destinations[item.kind];
    const properties: CreatePageParameters['properties'] = { [destination.title]: { title: [{ text: { content: item.title } }] }, KING记录ID: { rich_text: [{ text: { content: id } }] } };
    if (item.kind === 'task') { properties['到期'] = { date: { start: item.date } }; properties['状态'] = { status: { name: '待办' } }; }
    else if (item.kind === 'idea') { properties['状态'] = { status: { name: '探索中' } }; }
    else { properties['日期'] = { date: { start: item.date } }; properties[item.kind === 'expense' ? '支出 ' : '金额'] = { number: Number(item.amount) }; }
    const original = `来自 KING 工作基地，经站主预览确认。\n记录日期：${item.date}\n原始随手记：\n${body.original}`;
    const page = await notion.pages.create({ parent: { database_id: destination.database }, properties, children: [{ object: 'block', type: 'paragraph', paragraph: { rich_text: (original.match(/[\s\S]{1,1800}/g) || []).map(content => ({ type: 'text', text: { content } })) } }] });
    return NextResponse.json({ url: 'url' in page ? page.url : '' }, { status: 201 });
  } catch { return NextResponse.json({ error: '未确认保存成功，请保留草稿并重试。若持续失败，请检查 KING 任务、想法、收入和支出数据库是否已连接 KING导航。' }, { status: 502 }); }
  finally { if (locked) active.delete(id); }
}
