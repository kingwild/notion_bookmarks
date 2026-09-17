import { NextRequest, NextResponse } from 'next/server';
import { NEWS_SOURCES } from '@/lib/workspace';
import { loadFeed } from '@/lib/workspace-news';

export async function GET(request: NextRequest) {
  const source = NEWS_SOURCES.find(item => item.id === request.nextUrl.searchParams.get('source'));
  if (!source) return NextResponse.json({ error: '未知榜单' }, { status: 400 });
  try {
    const items = await loadFeed(source.id);
    if (!items.length) throw new Error('empty');
    return NextResponse.json({ items, fetchedAt: new Date().toISOString(), status: 'ok' });
  } catch { return NextResponse.json({ items: [], fetchedAt: new Date().toISOString(), status: 'unavailable' }); }
}
