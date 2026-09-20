import { NextRequest, NextResponse } from 'next/server';
import { NEWS_SOURCES } from '@/lib/workspace';
import { cachedFeed } from '@/lib/workspace-feed-cache';

export async function GET(request: NextRequest) {
  const source = NEWS_SOURCES.find(item => item.id === request.nextUrl.searchParams.get('source'));
  if (!source) return NextResponse.json({ error: '未知榜单' }, { status: 400 });
  return NextResponse.json(await cachedFeed(source.id), { headers: { 'Cache-Control': 'no-store' } });
}
