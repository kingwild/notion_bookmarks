import { loadFeed } from './workspace-news';
import type { NewsFeed, NewsSourceId } from './workspace';
const feeds = new Map<NewsSourceId, { until: number; promise: Promise<NewsFeed> }>();
export function cachedFeed(source: NewsSourceId): Promise<NewsFeed> {
  const previous = feeds.get(source);
  if (previous && previous.until > Date.now()) return previous.promise;
  const promise = loadFeed(source).then(items => {
    if (!items.length) throw new Error('empty');
    return { items, fetchedAt: new Date().toISOString(), status: 'ok' as const };
  }).catch(() => {
    const entry = feeds.get(source); if (entry) entry.until = Date.now() + 30000;
    return { items: [], fetchedAt: new Date().toISOString(), status: 'unavailable' as const, message: source === 'xiaohongshu' ? '公开热榜接口暂不可用，原站可能要求登录' : '暂时无法读取榜单，请稍后重试' };
  });
  feeds.set(source, { until: Date.now() + 300000, promise }); return promise;
}
