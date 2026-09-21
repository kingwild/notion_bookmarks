'use client';
import { useEffect, useState } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { NewsItem, NewsSourceId } from '@/lib/workspace';
import { workspaceJson } from './OwnerTools';

type Overview = { text: string; kind: string; sourceLabel?: string; sourceUrl?: string };
export default function NewsOverview({ item, source, id, onClose }: { item: NewsItem; source: NewsSourceId; id: string; onClose: () => void }) {
  const [data, setData] = useState<Overview | null>(null), [error, setError] = useState(''), [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController(); setData(null); setError('');
    workspaceJson<Overview>(`/api/workspace/news/summary?source=${source}&url=${encodeURIComponent(item.url)}`, { signal: controller.signal })
      .then(value => { if (!controller.signal.aborted) setData(value); })
      .catch(e => { if (!controller.signal.aborted) setError(e.message); });
    return () => controller.abort();
  }, [source, item.url, retry]);
  return <div className="ws-news-inline" id={id} role="region" aria-label={`${item.title}的概况`}>
    <span className="ws-eyebrow">{data?.kind === 'ai' ? 'AI 总结 · 公开资料' : data?.kind === 'related' ? '相关报道摘要' : data?.kind === 'source' ? '源站概况' : '新闻概况'} · 100 字以内</span>
    <p role="status">{error || data?.text || '正在读取公开概况…'}</p>
    {data?.sourceUrl && <a className="ws-summary-source" href={data.sourceUrl} target="_blank" rel="noreferrer">{data.sourceLabel || '概况来源'} <ArrowUpRight size={12} /></a>}
    <div className="ws-news-inline-actions"><a href={item.url} target="_blank" rel="noreferrer">打开原文 <ArrowUpRight size={13} /></a>{error && <button onClick={() => setRetry(v => v + 1)}>重试</button>}<button onClick={onClose}>收起</button></div>
  </div>;
}
