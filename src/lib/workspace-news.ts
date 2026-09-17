import { parse } from 'node-html-parser';
import { NewsItem, NewsSourceId, safeUrl } from './workspace';

async function read(url: string) {
  const result = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0', Referer: url.includes('bilibili.com') ? 'https://www.bilibili.com/' : new URL(url).origin + '/', Accept: 'application/json,text/html,application/atom+xml' }, signal: AbortSignal.timeout(15000), cache: 'no-store' });
  if (!result.ok) throw new Error(`upstream ${result.status}`);
  return result.text();
}
const heat = (value: unknown) => Number.isFinite(Number(value)) && Number(value) > 0 ? `${(Number(value) / 10000).toFixed(1)}万` : '';

export async function loadFeed(source: NewsSourceId): Promise<NewsItem[]> {
  let items: NewsItem[] = [];
  switch (source) {
    case 'weibo': {
      const data = JSON.parse(await read('https://weibo.com/ajax/statuses/hot_band'));
      items = (data.data?.band_list || []).filter((item: { is_ad?: boolean }) => !item.is_ad).map((item: { note: string; num: number }) => ({ title: item.note, url: `https://s.weibo.com/weibo?q=${encodeURIComponent(item.note)}`, detail: heat(item.num) })); break;
    }
    case 'baidu': {
      const root = parse(await read('https://top.baidu.com/board?tab=realtime'));
      items = root.querySelectorAll('.category-wrap_iQLoo').map(item => ({ title: item.querySelector('.c-single-text-ellipsis')?.text.trim() || '', url: item.querySelector('a')?.getAttribute('href') || '', detail: item.querySelector('.hot-index_1Bl1a')?.text.trim() })); break;
    }
    case 'bilibili': {
      const data = JSON.parse(await read('https://api.bilibili.com/x/web-interface/popular?ps=50&pn=1'));
      items = (data.data?.list || []).map((item: { title: string; bvid: string; owner?: { name: string } }) => ({ title: item.title, url: `https://www.bilibili.com/video/${encodeURIComponent(item.bvid)}`, detail: item.owner?.name })); break;
    }
    case 'toutiao': {
      const data = JSON.parse(await read('https://www.toutiao.com/hot-event/hot-board/?origin=toutiao_pc'));
      items = (data.data || []).map((item: { Title: string; HotValue: number }) => ({ title: item.Title, url: `https://www.toutiao.com/search/?keyword=${encodeURIComponent(item.Title)}`, detail: heat(item.HotValue) })); break;
    }
    case 'douyin': {
      const data = JSON.parse(await read('https://aweme.snssdk.com/aweme/v1/hot/search/list/'));
      items = (data.data?.word_list || []).map((item: { word: string; sentence_id: string; hot_value: number }) => ({ title: item.word, url: `https://www.douyin.com/hot/${encodeURIComponent(item.sentence_id)}`, detail: heat(item.hot_value) })); break;
    }
    case 'github': {
      const since = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
      const data = JSON.parse(await read(`https://api.github.com/search/repositories?q=${encodeURIComponent(`archived:false pushed:>=${since}`)}&sort=stars&order=desc&per_page=50`));
      items = (data.items || []).map((item: { full_name: string; html_url: string; description: string; stargazers_count: number }) => ({ title: item.full_name, url: item.html_url, detail: `★ ${item.stargazers_count.toLocaleString()} · ${item.description || ''}` })); break;
    }
    case 'tools': {
      const root = parse(await read('https://www.producthunt.com/feed'));
      items = root.querySelectorAll('entry').map(item => ({ title: item.querySelector('title')?.text.trim() || '', url: item.querySelector('link')?.getAttribute('href') || '', detail: item.querySelector('published')?.text.slice(0, 10) })); break;
    }
    case 'industry': {
      const root = parse(await read('https://www.gongkong.com/news/'));
      items = root.querySelectorAll('a').filter(a => !a.text.includes('小程序') && /\/news\/\d{6}\/\d+\.html/.test(a.getAttribute('href') || '')).map(a => ({ title: a.getAttribute('title')?.trim() || a.text.trim(), url: safeUrl(a.getAttribute('href') || '', 'https://www.gongkong.com') || '' })); break;
    }
    case 'brand': {
      const root = parse(await read('https://socialbeta.com/campaign'));
      const anchors = root.querySelectorAll('.tit a');
      const more = root.querySelector('.more a');
      const date = more?.getAttribute('date'), page = more?.getAttribute('num');
      if (date && page && /^\d+$/.test(date) && /^\d+$/.test(page)) {
        try { anchors.push(...parse(await read(`https://socialbeta.com/get/campaign?page=${page}&date=${date}`)).querySelectorAll('.tit a')); } catch { /* Keep the first page if pagination is unavailable. */ }
      }
      items = anchors.filter(a => /\/campaign\/\d+/.test(a.getAttribute('href') || '')).map(a => ({ title: a.text.replace(/\s+/g, ' ').trim(), url: safeUrl(a.getAttribute('href') || '', 'https://socialbeta.com') || '' })); break;
    }
  }
  const seen = new Set<string>();
  return items.filter(item => { if (!item.title || !safeUrl(item.url) || seen.has(item.url)) return false; seen.add(item.url); return true; }).slice(0, 50);
}
