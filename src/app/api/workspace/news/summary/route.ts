import { NextRequest, NextResponse } from 'next/server';
import { NEWS_SOURCES } from '@/lib/workspace';
import { cachedFeed } from '@/lib/workspace-feed-cache';
import { newsOverview } from '@/lib/workspace-summary';
const summaries = new Map<string, { until: number; value: Promise<{ text: string; kind: string }> }>();
export async function GET(request: NextRequest) {
  const source = NEWS_SOURCES.find(s => s.id === request.nextUrl.searchParams.get('source'));
  const url = request.nextUrl.searchParams.get('url');
  if (!source || !url || url.length > 4000) return NextResponse.json({ error: '无效新闻' }, { status: 400 });
  const feed = await cachedFeed(source.id), item = feed.items.find(i => i.url === url);
  if (!item) return NextResponse.json({ error: '该词条已更新，请刷新榜单后重试' }, { status: 404 });
  const key = `${source.id}:${url}`;
  let cached = summaries.get(key);
  if (!cached || cached.until <= Date.now()) {
    if (summaries.size >= 600) summaries.delete(summaries.keys().next().value!);
    cached = { until: Date.now() + 300000, value: newsOverview(item, source.id) }; summaries.set(key, cached);
  }
  return NextResponse.json({ ...await cached.value, url: item.url, title: item.title, source: source.name }, { headers: { 'Cache-Control': 'no-store' } });
}
