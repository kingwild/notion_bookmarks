export const NEWS_SOURCES = [
  { id: 'weibo', name: '微博', label: '实时热搜', mark: '微', color: '#ee684e', group: 'social', url: 'https://s.weibo.com/top/summary' },
  { id: 'baidu', name: '百度', label: '热搜榜', mark: '百', color: '#4773ee', group: 'social', url: 'https://top.baidu.com/board?tab=realtime' },
  { id: 'bilibili', name: '哔哩哔哩', label: '全站热门视频', mark: '哔', color: '#ec8fab', group: 'social', url: 'https://www.bilibili.com/v/popular/all' },
  { id: 'toutiao', name: '今日头条', label: '热榜', mark: '头', color: '#ed595b', group: 'social', url: 'https://www.toutiao.com/' },
  { id: 'douyin', name: '抖音', label: '热点榜', mark: '抖', color: '#333846', group: 'social', url: 'https://www.douyin.com/hot' },
  { id: 'industry', name: '工业观察', label: '中国工控网 · 最新资讯', mark: '工', color: '#538d8d', group: 'industry', url: 'https://www.gongkong.com/news/' },
  { id: 'brand', name: '品牌灵感', label: 'SocialBeta · 营销快讯', mark: 'B', color: '#b07b53', group: 'brand', url: 'https://socialbeta.com/campaign' },
  { id: 'github', name: 'GitHub', label: '近 7 天活跃 · 按 Star 排序', mark: 'G', color: '#4d526b', group: 'tools', url: 'https://github.com/search?q=stars%3A%3E1000&type=repositories&s=stars&o=desc' },
  { id: 'tools', name: '新工具发现', label: 'Product Hunt · 新品', mark: 'P', color: '#da795d', group: 'tools', url: 'https://www.producthunt.com/' },
] as const;

export type NewsSourceId = typeof NEWS_SOURCES[number]['id'];
export type NewsItem = { title: string; url: string; detail?: string };
export type NewsFeed = { items: NewsItem[]; fetchedAt: string; status: 'ok' | 'unavailable' };

export function safeUrl(value: string, base?: string): string | null {
  try { const url = new URL(value, base); return ['https:', 'http:'].includes(url.protocol) ? url.href : null; }
  catch { return null; }
}

export function weatherLabel(code: number): string {
  if (code === 0) return '晴';
  if (code <= 3) return '多云';
  if (code <= 48) return '雾';
  if (code <= 67) return '雨';
  if (code <= 77) return '雪';
  if (code <= 82) return '阵雨';
  if (code <= 86) return '阵雪';
  return '雷雨';
}
