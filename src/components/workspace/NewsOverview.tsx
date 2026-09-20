'use client';
import { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, X } from 'lucide-react';
import { NewsItem, NewsSourceId } from '@/lib/workspace';
import { workspaceJson } from './OwnerTools';

export default function NewsOverview({ item, source, onClose }: { item: NewsItem; source: NewsSourceId; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [data, setData] = useState<{ text: string; kind: string } | null>(null), [error, setError] = useState('');
  useEffect(() => { ref.current?.showModal(); const controller = new AbortController(); workspaceJson<{ text: string; kind: string }>(`/api/workspace/news/summary?source=${source}&url=${encodeURIComponent(item.url)}`, { signal: controller.signal }).then(setData).catch(e => { if (!controller.signal.aborted) setError(e.message); }); return () => controller.abort(); }, [source, item.url]);
  return <dialog ref={ref} className="ws-dialog ws-news-dialog" aria-labelledby="news-overview-title" onClose={onClose}><button className="ws-dialog-close" aria-label="关闭新闻概况" onClick={() => ref.current?.close()}><X size={18} /></button><span className="ws-eyebrow">{data?.kind === 'ai' ? 'AI 总结 · 仅基于公开资料' : data?.kind === 'source' ? '源站概况 · 100 字以内' : '新闻概况'}</span><h2 id="news-overview-title">{item.title}</h2><p className="ws-overview-text" role="status">{error || data?.text || '正在读取公开概况…'}</p>{item.detail && <small className="ws-muted">{item.detail}</small>}<div className="ws-dialog-actions"><a className="ws-primary" href={item.url} target="_blank" rel="noreferrer">打开原文 <ArrowUpRight size={15} /></a><button className="ws-text-button" onClick={() => ref.current?.close()}>返回榜单</button></div><p className="ws-muted">原文是否需要登录，由来源平台决定。</p></dialog>;
}
