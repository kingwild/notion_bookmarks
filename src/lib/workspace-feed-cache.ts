import { loadFeed } from './workspace-news';
import type { NewsFeed, NewsSourceId } from './workspace';
export function createFeedCache(loader: typeof loadFeed, now = Date.now) {
  type Entry = { until: number; started: number; pending: boolean; promise: Promise<NewsFeed>; good?: NewsFeed };
  const feeds = new Map<NewsSourceId, Entry>();
  return function getFeed(source: NewsSourceId, force = false): Promise<NewsFeed> {
    const previous = feeds.get(source);
    if (previous?.pending) return previous.promise;
    if (previous && force && now() - previous.started < 10000) return previous.promise.then(feed => ({ ...feed, refreshAfter: Math.ceil((10000 - (now() - previous.started)) / 1000) }));
    if (previous && !force && previous.until > now()) return previous.promise;
    const entry: Entry = { until: now() + 300000, started: now(), pending: true, promise: Promise.resolve({ items: [], fetchedAt: '', status: 'unavailable' }), good: previous?.good };
    entry.promise = Promise.resolve().then(() => loader(source)).then(items => {
      if (!items.length) throw new Error('empty');
      const feed: NewsFeed = { items, fetchedAt: new Date(now()).toISOString(), status: 'ok' };
      entry.good = feed; entry.until = now() + 300000; return feed;
    }).catch((): NewsFeed => {
      entry.until = now() + 30000;
      return entry.good ? { ...entry.good, stale: true, message: '更新失败，暂时保留上次内容' } : { items: [], fetchedAt: new Date(now()).toISOString(), status: 'unavailable', message: '暂时无法读取榜单，请稍后重试' };
    }).finally(() => { entry.pending = false; });
    feeds.set(source, entry); return entry.promise;
  };
}
export const cachedFeed = createFeedCache(loadFeed);
