'use client';

import { useRouter } from 'next/navigation';
import type { TodayTask } from '@/lib/workspace-task-dates';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDown, ArrowUpRight, Bookmark, Check, ChevronDown, ChevronUp, Command, Compass, ExternalLink, Globe2, LayoutGrid, Loader2, MapPin, Moon, Plus, RefreshCw, Search, Send, Sparkles, StickyNote, Sun, TrendingUp, X } from 'lucide-react';
import type { Category, Link } from '@/types';
import type { StockIdentity, StockQuote } from '@/types/stock';
import { NEWS_SOURCES, NewsFeed, safeUrl, weatherLabel } from '@/lib/workspace';
import './workspace.css';
import MarketingCalendar from './MarketingCalendar';
import NewsOverview from './NewsOverview';
import { OwnerLogin, OwnerCapture } from './OwnerTools';
import type { NewsItem } from '@/lib/workspace';
import { validateStocks } from '@/lib/workspace-validation';

type Props = { links: Link[]; categories: Category[]; title: string; defaultCity: string; initialStocks: StockIdentity[]; notesEnabled: boolean };
type Weather = { city: string; temperature: number; code: number; humidity: number; high: number; low: number; updatedAt: string };

async function requestJson<T>(url: string, options?: RequestInit): Promise<T> {
  const result = await fetch(url, { ...options, signal: options?.signal || AbortSignal.timeout(20000) });
  const data = await result.json();
  if (!result.ok) throw new Error(data.error || '请求失败，请稍后重试');
  return data;
}

function DateCard() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => { setNow(new Date()); const timer = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(timer); }, []);
  return <section className="ws-card ws-date"><div className="ws-eyebrow"><span className="ws-dot" /> TODAY, YOUR DAY</div><div className="ws-time">{now ? now.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false }) : '—:—'}<span>{now ? now.toLocaleDateString('zh-CN', { weekday: 'long' }) : '新的一天'}</span></div><div className="ws-date-bottom"><span>{now ? now.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' }) : '正在读取日期'}</span><span className="ws-soft-label">保持专注，从容开始</span></div><div className="ws-date-orbit" aria-hidden="true" /></section>;
}

function WeatherCard({ defaultCity }: { defaultCity: string }) {
  const [city, setCity] = useState(defaultCity);
  const [input, setInput] = useState(defaultCity);
  const [editing, setEditing] = useState(false);
  const [weather, setWeather] = useState<Weather | null>(null);
  const [error, setError] = useState('');
  const [refresh, setRefresh] = useState(0);
  useEffect(() => { try { const value = localStorage.getItem('king:city'); if (value) { setCity(value); setInput(value); } } catch {} }, []);
  useEffect(() => {
    const controller = new AbortController(); setWeather(null); setError('');
    requestJson<Weather>(`/api/workspace/weather?city=${encodeURIComponent(city)}`, { signal: controller.signal }).then(setWeather).catch(e => { if (!controller.signal.aborted) setError(e.message); });
    const timer = setInterval(() => setRefresh(value => value + 1), 300000);
    return () => { controller.abort(); clearInterval(timer); };
  }, [city, refresh]);
  return <section className="ws-card ws-weather"><div className="ws-card-top"><button className="ws-text-button" onClick={() => setEditing(!editing)} aria-expanded={editing}><MapPin size={14} />{weather?.city || city}<ChevronDown size={13} /></button><span className="ws-eyebrow">WEATHER</span></div>
    {editing && <form className="ws-inline-edit" onSubmit={e => { e.preventDefault(); if (!input.trim()) return; setCity(input.trim()); try { localStorage.setItem('king:city', input.trim()); } catch {} setRefresh(v => v + 1); setEditing(false); }}><input aria-label="天气城市" placeholder="城市名称或拼音" value={input} onChange={e => setInput(e.target.value)} maxLength={60} autoFocus /><button type="submit" aria-label="保存天气城市"><Check size={16} /></button></form>}
    <div className="ws-weather-main"><div><strong>{weather ? Math.round(weather.temperature) : '—'}<sup>°</sup></strong><p>{weather ? weatherLabel(weather.code) : error ? '暂时无法获取天气' : '正在获取天气'}</p></div><div className="ws-sun" aria-hidden="true"><Sun size={68} strokeWidth={1.2} /></div></div>
    <div className="ws-weather-footer">{error ? <button className="ws-text-button" onClick={() => setRefresh(v => v + 1)}>重试 <RefreshCw size={12} /></button> : <span>{weather ? `最高 ${Math.round(weather.high)}° · 最低 ${Math.round(weather.low)}°` : '天气随时掌握'}</span>}<a href="https://open-meteo.com/" target="_blank" rel="noreferrer">Open-Meteo</a></div></section>;
}

function MarketsCard({ initialStocks, owner, syncRefresh }: { initialStocks: StockIdentity[]; owner: boolean; syncRefresh: number }) {
  const [stocks, setStocks] = useState(initialStocks);
  const [revision, setRevision] = useState(''), [syncError, setSyncError] = useState(''), [saving, setSaving] = useState(false);
  const [legacy, setLegacy] = useState<StockIdentity[] | null>(null);
  const stockSaveLock = useRef(false);
  const [quotes, setQuotes] = useState<StockQuote[]>([]);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<StockIdentity[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [refresh, setRefresh] = useState(0);
  const [loading, setLoading] = useState(true);
  useEffect(() => { try { setLegacy(validateStocks(JSON.parse(localStorage.getItem('king:stocks') || localStorage.getItem('stockWatchlist:v1') || 'null'))); } catch {} }, []);
  useEffect(() => { const controller = new AbortController(); requestJson<{ stocks: StockIdentity[] | null; revision: string }>('/api/workspace/preferences', { signal: controller.signal }).then(data => { if (!stockSaveLock.current) { if (data.stocks) setStocks(data.stocks); setRevision(data.revision); setSyncError(''); } }).catch(e => { if (!controller.signal.aborted) setSyncError(e.message); }); return () => controller.abort(); }, [syncRefresh, owner]);
  useEffect(() => { if (!owner) setEditing(false); }, [owner]);
  useEffect(() => {
    const controller = new AbortController(); setLoading(true); setError('');
    requestJson<{ quotes: StockQuote[] }>(`/api/workspace/markets?ids=${encodeURIComponent(stocks.map(s => s.secid).join(','))}`, { signal: controller.signal }).then(data => setQuotes(data.quotes)).catch(e => { if (!controller.signal.aborted) setError(e.message); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    const timer = setInterval(() => setRefresh(v => v + 1), 300000); return () => { controller.abort(); clearInterval(timer); };
  }, [stocks, refresh]);
  useEffect(() => {
    const controller = new AbortController(); setResults([]); setSearchError('');
    if (!query.trim()) { setSearching(false); return; }
    setSearching(true);
    const timer = setTimeout(() => requestJson<{ results: StockIdentity[] }>(`/api/workspace/markets?q=${encodeURIComponent(query)}`, { signal: controller.signal }).then(data => setResults(data.results)).catch(() => { if (!controller.signal.aborted) setSearchError('搜索暂时不可用'); }).finally(() => { if (!controller.signal.aborted) setSearching(false); }), 350);
    return () => { controller.abort(); clearTimeout(timer); };
  }, [query]);
  const save = async (value: StockIdentity[]) => { if (stockSaveLock.current) return; stockSaveLock.current = true; setSaving(true); setSyncError(''); try { const data = await requestJson<{ stocks: StockIdentity[]; revision: string }>('/api/workspace/preferences', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ stocks: value, revision }) }); setStocks(data.stocks); setRevision(data.revision); setLegacy(null); try { localStorage.removeItem('king:stocks'); localStorage.removeItem('stockWatchlist:v1'); } catch {} } catch (e) { setSyncError(e instanceof Error ? e.message : '同步失败'); } finally { stockSaveLock.current = false; setSaving(false); } };
  return <section className="ws-card ws-markets"><div className="ws-card-top"><span className="ws-widget-title"><TrendingUp size={16} /> 自选行情</span><button disabled={!owner} title={owner ? '管理云端自选' : '站主登录后可修改'} className="ws-icon-button" aria-label="管理自选股票" aria-expanded={editing} onClick={() => setEditing(!editing)}>{editing ? <X size={16} /> : <Plus size={16} />}</button></div>
    {editing ? <div className="ws-stock-editor"><input value={query} onChange={e => setQuery(e.target.value)} placeholder="搜索股票名称或代码" aria-label="搜索股票" maxLength={40} autoFocus /><div className="ws-stock-chips">{stocks.map(stock => <button key={stock.secid} disabled={saving || stocks.length === 1} onClick={() => save(stocks.filter(item => item.secid !== stock.secid))}>{stock.name}<X size={11} /></button>)}</div><div className="ws-stock-results" aria-live="polite">{searching ? '正在搜索…' : searchError || (query && !results.length ? '没有找到匹配的股票' : '')}{results.map(stock => <button key={stock.secid} disabled={saving || stocks.length >= 10 || stocks.some(s => s.secid === stock.secid)} onClick={() => { save([...stocks, stock]); setQuery(''); }}><span>{stock.name} <small>{stock.code}</small></span><Plus size={14} /></button>)}</div><small className="ws-muted">最多 10 个 · 保存到 Notion，各设备同步</small></div> : <><div className="ws-stock-list" tabIndex={0} role="region" aria-label="自选股票，可上下滚动">{stocks.map(stock => { const quote = quotes.find(q => q.secid === stock.secid); const change = quote?.changePercent; return <a key={stock.secid} className="ws-stock-row" href={`https://quote.eastmoney.com/${stock.secid.startsWith('116.') ? 'hk/' : stock.secid.startsWith('1.') ? 'sh' : 'sz'}${stock.code}.html`} target="_blank" rel="noreferrer"><span>{stock.name}<small>{stock.code}</small></span><strong>{quote?.price?.toFixed(2) ?? '—'}</strong><span className={`ws-change ${change == null ? '' : change >= 0 ? 'up' : 'down'}`}>{change == null ? '—' : `${change >= 0 ? '+' : ''}${change.toFixed(2)}%`}</span></a>; })}</div><div className="ws-market-footer"><span>{loading ? '正在更新…' : error || `腾讯行情 · ${quotes[0]?.updatedAt ? new Date(quotes[0].updatedAt).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Shanghai' }) : '时间未知'} · 可能延迟`}</span><button className="ws-icon-button" aria-label="刷新行情" disabled={loading} onClick={() => setRefresh(v => v + 1)}><RefreshCw size={12} /></button></div></>}
    {owner && legacy && <button className="ws-text-button" disabled={saving || !revision} onClick={() => save(legacy)}>将此浏览器原有自选同步到 Notion</button>}{syncError && <p className="ws-muted" role="status">{syncError}</p>}
  </section>;
}

function LinkIcon({ link }: { link: Link }) {
  const [failed, setFailed] = useState(false);
  const icon = safeUrl(link.iconfile || link.iconlink);
  return <span className="ws-link-icon">{icon && !failed ? <img src={icon} alt="" loading="lazy" onError={() => setFailed(true)} /> : link.name.slice(0, 1).toUpperCase()}</span>;
}

function NewsCard({ source, refresh }: { source: typeof NEWS_SOURCES[number]; refresh: number }) {
  const [feed, setFeed] = useState<NewsFeed | null>(null);
  const [selected, setSelected] = useState<NewsItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController(); setLoading(true);
    requestJson<NewsFeed>(`/api/workspace/news?source=${source.id}`, { signal: controller.signal }).then(setFeed).catch(() => { if (!controller.signal.aborted) setFeed({ items: [], fetchedAt: '', status: 'unavailable' }); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [source.id, refresh, retry]);
  return <article className="ws-card ws-news-card"><header><span className="ws-source-mark" style={{ background: source.color }}>{source.mark}</span><div><h3>{source.name}</h3><p>{source.label}</p></div><a href={source.url} target="_blank" rel="noreferrer" aria-label={`打开${source.name}`}><ArrowUpRight size={17} /></a></header>
    {loading && !feed ? <div className="ws-news-loading" aria-label="加载榜单中">{[1,2,3,4,5].map(n => <div key={n} />)}</div> : feed?.items.length ? <ol tabIndex={0} aria-label={`${source.name}榜单，可上下滚动`}>{feed.items.slice(0, 50).map((item, index) => <li key={item.url}><span className={index < 3 ? 'ws-rank-top' : ''}>{String(index + 1).padStart(2, '0')}</span><button className="ws-news-title" aria-expanded={selected?.url === item.url} aria-controls={`news-${source.id}-${index}`} onClick={() => setSelected(selected?.url === item.url ? null : item)} title={item.detail || item.title}>{item.title}</button>{selected?.url === item.url && <NewsOverview item={item} source={source.id} id={`news-${source.id}-${index}`} onClose={() => setSelected(null)} />}</li>)}</ol> : <div className="ws-feed-empty"><Globe2 size={24} /><p>{feed?.message || '暂时无法读取榜单'}</p><span>可以前往原站查看最新内容</span><div><button onClick={() => setRetry(v => v + 1)}>重试</button><a href={source.url} target="_blank" rel="noreferrer">打开原站 <ArrowUpRight size={12} /></a></div></div>}
    <footer><span>{feed?.status === 'ok' ? `共 ${feed.items.length} 条 · ${new Date(feed.fetchedAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}` : '独立数据源'}</span><a href={source.url} target="_blank" rel="noreferrer">查看完整内容 <ArrowUpRight size={11} /></a></footer></article>;
}

function TasksCard({ refresh }: { refresh: number }) {
  const [tasks, setTasks] = useState<TodayTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const [updatedAt, setUpdatedAt] = useState('');
  useEffect(() => {
    const controller = new AbortController(); setLoading(true); setError('');
    requestJson<{ tasks: TodayTask[]; updatedAt: string }>('/api/workspace/tasks', { signal: controller.signal })
      .then(data => { setTasks(data.tasks); setUpdatedAt(data.updatedAt); })
      .catch(e => { if (!controller.signal.aborted) setError(e.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [refresh, retry]);
  return <section className="ws-card ws-tasks" id="tasks"><div className="ws-section-heading"><div><span className="ws-eyebrow">FOCUS ON TODAY</span><h2><Check size={20} /> 当天任务 <span className="ws-count">{tasks.length}</span></h2></div><a className="ws-text-button" href="https://www.notion.so/201056cce99d816b86adfaefd1a47ef0" target="_blank" rel="noreferrer">KING / 任务 <ArrowUpRight size={14} /></a></div>
    {loading && !updatedAt ? <p className="ws-muted">正在同步今日任务…</p> : error ? <p className="ws-muted" role="status">{error} <button className="ws-text-button" onClick={() => setRetry(v => v + 1)}>重试</button></p> : !tasks.length ? <p className="ws-muted">今天暂无安排，给新的灵感留一点空间。</p> : null}
    {!!tasks.length && <div className="ws-task-list">{tasks.map(task => <a key={task.id} href={task.url} target="_blank" rel="noreferrer" className={`ws-task ${task.status === '已完成' ? 'is-done' : ''}`}><span className="ws-task-state">{task.status === '已完成' && <Check size={12} />}</span><div><strong>{task.title}</strong><small>{task.status}{task.priority ? ` · ${task.priority}` : ''}</small></div><ArrowUpRight size={14} /></a>)}</div>}
    <p className="ws-muted">按上海日期 · 每 5 分钟同步{updatedAt ? ` · 上次成功 ${new Date(updatedAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Shanghai' })}` : ''}</p>
  </section>;
}

function Notes({ enabled }: { enabled: boolean }) {
  const [text, setText] = useState('');
  const [nickname, setNickname] = useState('');
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const [requestId, setRequestId] = useState('');
  useEffect(() => { try { setText(localStorage.getItem('king:note-draft') || ''); } catch {} setRequestId(crypto.randomUUID()); setReady(true); }, []);
  useEffect(() => { if (ready) try { localStorage.setItem('king:note-draft', text); } catch {} }, [text, ready]);
  async function submit() {
    if (!text.trim() || busy) return;
    setBusy(true); setStatus('');
    try { await requestJson('/api/workspace/notes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text, requestId, nickname }) }); setText(''); setRequestId(crypto.randomUUID()); setStatus('已保存到 Notion。灵感，妥善收藏。'); }
    catch (error) { setStatus(error instanceof Error ? error.message : '保存失败，草稿已保留'); }
    finally { setBusy(false); }
  }
  return <section className="ws-card ws-notes" id="notes"><div className="ws-section-heading"><div><span className="ws-eyebrow">QUICK CAPTURE</span><h2><StickyNote size={20} /> 留一句，记一笔。</h2></div><span className="ws-note-badge">访客留言</span></div><p className="ws-muted">让一闪而过的想法，有一个安放的地方。</p><label className="ws-sr-only" htmlFor="note-content">随手记内容</label><textarea id="note-content" value={text} disabled={busy} onChange={e => { setText(e.target.value); setRequestId(crypto.randomUUID()); setStatus(''); }} placeholder="此刻的灵感、待办，或想对自己说的话…" maxLength={5000} onKeyDown={e => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); if (enabled) void submit(); } }} /><div className="ws-note-meta"><span>草稿自动保存在此浏览器</span><span>{text.length} / 5000</span></div><div className="ws-note-actions"><input aria-label="留言昵称（选填）" placeholder="你的昵称（选填）" maxLength={40} value={nickname} onChange={e => setNickname(e.target.value)} /><button className="ws-primary" disabled={!enabled || !text.trim() || busy} onClick={submit}>{busy ? <Loader2 className="ws-spin" size={15} /> : <Send size={15} />}{busy ? '正在保存' : '保存到 Notion'}</button></div><p className="ws-note-status" role="status">{status || (enabled ? '所有访客均可留言，内容发送至站主的 Notion。' : '留言服务暂时不可用，草稿会保留。')}</p></section>;
}

export default function Workspace({ links, categories, title, defaultCity, initialStocks, notesEnabled }: Props) {
  const router = useRouter();
  const [dark, setDark] = useState(false);
  const [owner, setOwner] = useState(false), [aiReady, setAiReady] = useState(false), [ownerRefresh, setOwnerRefresh] = useState(0);
  const [onlyFeatured, setOnlyFeatured] = useState(false), [featured, setFeatured] = useState<Record<string, boolean>>({}), [featuredBusy, setFeaturedBusy] = useState(''), [featuredError, setFeaturedError] = useState('');
  const featuredLock = useRef(false);
  useEffect(() => { setFeatured({}); }, [links]);
  async function toggleFeatured(link: Link) { if (featuredLock.current) return; featuredLock.current = true; setFeaturedBusy(link.id); setFeaturedError(''); try { const value = !(featured[link.id] ?? link.featured ?? false); await requestJson('/api/workspace/featured', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: link.id, featured: value }) }); setFeatured(previous => ({ ...previous, [link.id]: value })); } catch (e) { setFeaturedError(e instanceof Error ? e.message : '保存失败'); } finally { featuredLock.current = false; setFeaturedBusy(''); } }
  useEffect(() => { const timer = setInterval(() => { router.refresh(); setRefresh(v => v + 1); }, 300000); return () => clearInterval(timer); }, [router]);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('全部');
  const [sub, setSub] = useState('全部');
  const [expanded, setExpanded] = useState(false);
  const [group, setGroup] = useState('all');
  const [refresh, setRefresh] = useState(0);
  const searchRef = useRef<HTMLInputElement>(null);
  useEffect(() => { const controller = new AbortController(); requestJson<{ owner: boolean; aiReady: boolean }>('/api/workspace/owner', { signal: controller.signal }).then(data => { setOwner(data.owner); setAiReady(data.aiReady); }).catch(() => { if (!controller.signal.aborted) setOwner(false); }); return () => controller.abort(); }, [ownerRefresh, refresh]);
  useEffect(() => {
    try { setDark(localStorage.getItem('king:appearance') === 'dark'); } catch {}
    function onKey(e: KeyboardEvent) { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); searchRef.current?.focus(); document.getElementById('navigation')?.scrollIntoView({ behavior: 'smooth' }); } }
    document.addEventListener('keydown', onKey); return () => document.removeEventListener('keydown', onKey);
  }, []);
  const categoryNames = [...new Set(categories.map(c => c.name).filter(name => links.some(link => link.category1 === name)))];
  const subs = [...new Set(links.filter(link => category === '全部' || link.category1 === category).map(link => link.category2).filter(Boolean))];
  const filtered = useMemo(() => links.filter(link => (!onlyFeatured || (featured[link.id] ?? link.featured)) && (category === '全部' || link.category1 === category) && (sub === '全部' || link.category2 === sub) && `${link.name} ${link.desc} ${link.tags.join(' ')} ${link.category1} ${link.category2}`.toLowerCase().includes(query.trim().toLowerCase())), [links, category, sub, query, onlyFeatured, featured]);
  const selectedSources = NEWS_SOURCES.filter(source => group === 'all' || source.group === group);
  return <div className={`king-workspace ${dark ? 'ws-dark' : ''}`}><div className="ws-ambient" aria-hidden="true" /><header className="ws-topbar"><a className="ws-brand" href="#top"><span className="ws-brand-symbol">K<span>·</span></span><span>KING<span className="ws-brand-light"> / 工作基地</span></span></a><nav aria-label="页面导航"><a className="ws-nav-active" href="#navigation"><LayoutGrid size={14} /> 导航</a><a href="#discover">发现</a><a href={owner ? '#my-capture' : '#notes'}>随手记</a></nav><div className="ws-top-actions"><span className="ws-top-status"><span className="ws-dot" /> MY PERSONAL SPACE</span><button className="ws-icon-button" aria-label={dark ? '切换浅色外观' : '切换深色外观'} onClick={() => { setDark(!dark); try { localStorage.setItem('king:appearance', dark ? 'light' : 'dark'); } catch {} }}>{dark ? <Sun size={18} /> : <Moon size={18} />}</button><OwnerLogin owner={owner} onChange={() => { setOwner(false); setOwnerRefresh(v => v + 1); }} /></div></header>
    <main className="ws-main" id="top"><section className="ws-welcome"><div><div className="ws-eyebrow">A LITTLE SPACE. A LOT OF POSSIBILITIES.</div><h1>在这里，开启你的每一天<span>。</span></h1><p>常用网站、值得关注的新鲜事，还有下一刻的灵感。</p></div><a href={owner ? '#my-capture' : '#notes'} className="ws-welcome-link"><Plus size={15} /> 记录一个想法</a></section>
      <div className={`ws-overview ${owner ? '' : 'ws-overview-public'}`}><DateCard /><WeatherCard defaultCity={defaultCity} />{owner && <MarketsCard initialStocks={initialStocks} owner={owner} syncRefresh={refresh} />}</div>
      {owner && <OwnerCapture aiReady={aiReady} onSaved={() => { router.refresh(); setRefresh(v => v + 1); }} />}
      {owner && <TasksCard refresh={refresh} />}
      <MarketingCalendar refresh={refresh} />
      <section className={`ws-card ws-navigation ${expanded ? 'is-expanded' : ''}`} id="navigation"><div className="ws-section-heading"><div><span className="ws-eyebrow">YOUR DAILY SHORTCUTS</span><h2><Compass size={21} /> 网站导航 <span className="ws-count">{links.length}</span></h2></div><div className="ws-search"><Search size={17} /><input ref={searchRef} value={query} onChange={e => setQuery(e.target.value)} placeholder="搜索网站、工具或灵感…" aria-label="搜索网站" />{query ? <button aria-label="清空搜索" onClick={() => setQuery('')}><X size={14} /></button> : <kbd><Command size={11} /> K</kbd>}</div></div>
        <div className="ws-bookmarks-body"><aside className="ws-categories" aria-label="网站分类">{['全部', ...categoryNames].map((name, index) => <button key={name} aria-pressed={category === name} className={category === name ? 'active' : ''} onClick={() => { setCategory(name); setSub('全部'); }}><span>{index === 0 ? <LayoutGrid size={16} /> : index % 3 === 0 ? <Globe2 size={16} /> : index % 3 === 1 ? <Sparkles size={16} /> : <Bookmark size={16} />}{name === '全部' ? '全部网站' : name}</span><small>{name === '全部' ? links.length : links.filter(link => link.category1 === name).length}</small></button>)}<div className="ws-sidebar-note"><span className="ws-dot" /> 来自你的 Notion 收藏</div></aside>
          <div className="ws-links-area"><div className="ws-subcategories"><button className={onlyFeatured ? 'active' : ''} aria-pressed={onlyFeatured} onClick={() => setOnlyFeatured(v => !v)}>★ 精选</button><button className={sub === '全部' ? 'active' : ''} onClick={() => setSub('全部')} aria-pressed={sub === '全部'}>全部</button>{subs.map(name => <button key={name} className={sub === name ? 'active' : ''} aria-pressed={sub === name} onClick={() => setSub(name)}>{name}</button>)}</div><div className="ws-result-label"><span>{query ? `“${query}” 的搜索结果` : category === '全部' ? '好工具，让工作轻一点。' : category}</span><span>{filtered.length} 个网站</span></div>{featuredError && <p className="ws-muted" role="status">{featuredError}</p>}<div className="ws-link-grid">{filtered.map(link => { const url = safeUrl(link.url); if (!url) return null; return <div className="ws-link-wrap" key={link.id}><a className="ws-link" href={url} target="_blank" rel="noreferrer"><LinkIcon link={link} /><div><h3>{link.name}</h3><p>{link.desc || link.category2 || new URL(url).hostname}</p><span>{link.category2 || link.category1}</span></div><ArrowUpRight className="ws-link-arrow" size={14} /></a>{owner ? <button className={`ws-feature-button ${(featured[link.id] ?? link.featured) ? 'is-featured' : ''}`} aria-label={`${(featured[link.id] ?? link.featured) ? '取消精选' : '设为精选'}：${link.name}`} aria-pressed={featured[link.id] ?? link.featured ?? false} disabled={!!featuredBusy} onClick={() => toggleFeatured(link)}>★</button> : (featured[link.id] ?? link.featured) ? <span className="ws-feature-button is-featured" title="精选网站">★</span> : null}</div>; })}</div>{!filtered.length && <div className="ws-empty"><Search size={28} /><h3>{links.length ? '没有找到匹配的网站' : '这里等待你的第一份收藏'}</h3><p>{links.length ? '试试其他关键词，或换个分类看看。' : '在 Notion 导航链接中添加网站后，它们会出现在这里。'}</p><button className="ws-text-button" onClick={() => { setQuery(''); setCategory('全部'); setSub('全部'); setOnlyFeatured(false); }}>查看全部</button></div>}</div></div>
        <div className="ws-expand-bar"><button aria-expanded={expanded} onClick={() => { if (expanded) document.getElementById('navigation')?.scrollIntoView({ behavior: 'smooth' }); setExpanded(!expanded); }}>{expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}{expanded ? '收起导航' : '展开全部网站'}</button><span>{expanded ? '所有收藏，一览无余' : '为重要的事情，留一点空间'}</span></div>
      </section>
      <section className="ws-discover" id="discover"><div className="ws-section-heading"><div><span className="ws-eyebrow">A WINDOW TO THE WORLD</span><h2>正在发生，值得发现<span className="ws-heading-dot">·</span></h2></div><button className="ws-text-button" onClick={() => setRefresh(v => v + 1)}><RefreshCw size={14} /> 刷新榜单</button></div><div className="ws-news-tabs" aria-label="资讯分类">{[['all','全部发现'],['social','全网热榜'],['industry','工业观察'],['brand','品牌传播'],['tools','开发与工具']].map(([value, name]) => <button key={value} onClick={() => setGroup(value)} className={group === value ? 'active' : ''} aria-pressed={group === value}>{name}</button>)}</div><div className="ws-news-grid">{selectedSources.map(source => <NewsCard key={source.id} source={source} refresh={refresh} />)}</div></section>
      <div className="ws-capture-row"><Notes enabled={notesEnabled} /><aside className="ws-manifesto"><div className="ws-orbit-art" aria-hidden="true"><span /><span /><span /><Sparkles size={31} /></div><span className="ws-eyebrow">MAKE ROOM FOR WHAT MATTERS.</span><h2>收藏世界。<br />专注当下。</h2><p>一个属于你的数字角落。<br />把信息理顺，让灵感自然发生。</p><a href="#top">回到工作台 <ArrowUpRight size={14} /></a></aside></div>
      <footer className="ws-footer"><span>© {new Date().getFullYear()} {title} <span className="ws-footer-sep">/</span> 为专注而设计</span><a href="https://github.com/moyuguy/notion_bookmarks" target="_blank" rel="noreferrer">基于 Notion Bookmarks <ExternalLink size={11} /></a><span>每 5 分钟自动同步</span></footer>
    </main><a href="#navigation" className="ws-floating" aria-label="返回网站导航"><ArrowDown size={17} /></a></div>;
}
