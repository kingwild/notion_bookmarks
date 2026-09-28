import { NextRequest, NextResponse } from 'next/server';
import { getTodayTasks, TASK_DATABASE_ID } from '@/lib/workspace-tasks';
import { isOwner, requireOwner, readBody } from '@/lib/workspace-owner';
import { notion } from '@/lib/notion';
export const dynamic = 'force-dynamic';
export async function GET(request: NextRequest) {
  try {
    if (!await isOwner()) return NextResponse.json({ error: '请先登录站主管理' }, { status: 401, headers: { 'Cache-Control': 'private, no-store' } });
    return NextResponse.json({ tasks: await getTodayTasks(request.nextUrl.searchParams.get('days') === '7' ? 7 : 1), updatedAt: new Date().toISOString() }, { headers: { 'Cache-Control': 'private, no-store' } });
  }
  catch (error) {
    const missing = error && typeof error === 'object' && 'code' in error && error.code === 'object_not_found';
    return NextResponse.json({ error: missing ? '任务库尚未连接：请在 Notion「KING / 任务」添加「KING导航」连接。' : '任务暂时无法同步，请稍后重试' }, { status: 503 });
  }
}
export async function PATCH(request: NextRequest) {
  try {
    const denied = await requireOwner(request); if (denied) return denied;
    const body = await readBody(request, 1000);
    if (typeof body.id !== 'string' || !/^[a-f0-9-]{32,36}$/i.test(body.id) || body.completed !== true) return NextResponse.json({ error: '任务格式无效' }, { status: 400 });
    const databaseId = process.env.NOTION_TASKS_DB_ID || TASK_DATABASE_ID;
    const page = await notion.pages.retrieve({ page_id: body.id });
    if (!('parent' in page) || page.parent.type !== 'database_id' || page.parent.database_id.replaceAll('-', '') !== databaseId.replaceAll('-', '') || page.archived) return NextResponse.json({ error: '任务不在任务库中' }, { status: 400 });
    const database = await notion.databases.retrieve({ database_id: databaseId });
    const field = 'properties' in database ? database.properties['状态'] : null;
    const status = field?.type === 'status' ? field.status.options.find(option => option.name === '已完成') : null;
    if (!status) return NextResponse.json({ error: '任务库缺少「已完成」状态，请在 Notion 中检查' }, { status: 409 });
    await notion.pages.update({ page_id: body.id, properties: { '状态': { status: { id: status.id } } } });
    return NextResponse.json({ id: body.id, status: status.name }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch { return NextResponse.json({ error: '未能确认完成状态，请刷新后重试' }, { status: 502 }); }
}
