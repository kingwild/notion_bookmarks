import { NextResponse } from 'next/server';
import { getTodayTasks } from '@/lib/workspace-tasks';
import { isOwner } from '@/lib/workspace-owner';
export const dynamic = 'force-dynamic';
export async function GET() {
  try {
    if (!await isOwner()) return NextResponse.json({ error: '请先登录站主管理' }, { status: 401, headers: { 'Cache-Control': 'private, no-store' } });
    return NextResponse.json({ tasks: await getTodayTasks(), updatedAt: new Date().toISOString() }, { headers: { 'Cache-Control': 'private, no-store' } });
  }
  catch (error) {
    const missing = error && typeof error === 'object' && 'code' in error && error.code === 'object_not_found';
    return NextResponse.json({ error: missing ? '任务库尚未连接：请在 Notion「KING / 任务」添加「KING导航」连接。' : '任务暂时无法同步，请稍后重试' }, { status: 503 });
  }
}
