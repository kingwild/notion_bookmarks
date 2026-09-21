'use client';
import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, ArrowUpRight } from 'lucide-react';
import { marketingMonth } from '@/lib/workspace-calendar';
import { MARKETING_THEMES, monthlyCampaigns, type MarketingEvent } from '@/lib/workspace-marketing-data';
import { shanghaiDay } from '@/lib/workspace-task-dates';

function Source({ event }: { event: MarketingEvent }) {
  return event.source ? <a className="ws-calendar-source" href={event.source.url} target="_blank" rel="noreferrer">资料来源 · {event.source.label}<ArrowUpRight size={11} /></a> : null;
}
function preparation(date: string, days: number) {
  const value = new Date(`${date}T00:00:00Z`); value.setUTCDate(value.getUTCDate() - days);
  return value.toISOString().slice(5, 10).replace('-', ' / ');
}
export default function MarketingCalendar({ refresh }: { refresh: number }) {
  const [today, setToday] = useState(''), [offset, setOffset] = useState(0), [selected, setSelected] = useState('');
  const [theme, setTheme] = useState<typeof MARKETING_THEMES[number]>('全部');
  useEffect(() => { setToday(shanghaiDay()); }, [refresh]);
  const date = new Date(`${today || '2026-01-01'}T00:00:00Z`); date.setUTCDate(1); date.setUTCMonth(date.getUTCMonth() + offset);
  const year = date.getUTCFullYear(), month = date.getUTCMonth() + 1;
  const days = useMemo(() => marketingMonth(year, month).map(day => ({ ...day, events: day.events.filter(e => theme === '全部' || e.theme === theme) })), [year, month, theme]);
  const campaigns = monthlyCampaigns(year, month).filter(e => theme === '全部' || e.theme === theme);
  const focus = days.find(day => day.date === selected) || days.find(day => day.date >= today && day.events.length) || days.find(day => day.events.length) || days[0];
  return <section className="ws-card ws-calendar" id="calendar">
    <div className="ws-section-heading"><div><span className="ws-eyebrow">PLAN YOUR NEXT MOMENT</span><h2><CalendarDays size={20} /> 当月营销日历</h2></div>
      <div className="ws-calendar-controls"><button aria-label="上个月" onClick={() => { setOffset(v => Math.max(v - 1, -12)); setSelected(''); }}><ChevronLeft size={16} /></button><strong>{today ? `${year} 年 ${month} 月` : '正在加载'}</strong><button aria-label="下个月" onClick={() => { setOffset(v => Math.min(v + 1, 12)); setSelected(''); }}><ChevronRight size={16} /></button><button onClick={() => { setOffset(0); setSelected(''); }}>本月</button></div>
    </div>
    <div className="ws-calendar-themes" aria-label="营销主题">{MARKETING_THEMES.map(value => <button key={value} aria-pressed={value === theme} onClick={() => { setTheme(value); setSelected(''); }}>{value}</button>)}</div>
    <div className="ws-calendar-campaigns">{campaigns.map(event => <article className="ws-calendar-campaign" key={event.name}><span className="ws-eyebrow">{event.kind} · {event.theme}</span><h3>{event.name}</h3><p>{event.idea}</p><Source event={event} /></article>)}</div>
    <div className="ws-calendar-layout"><div className="ws-calendar-grid">
      {['一','二','三','四','五','六','日'].map(d => <span className="ws-weekday" key={d}>{d}</span>)}
      {Array.from({ length: (date.getUTCDay() + 6) % 7 }, (_, i) => <span key={`blank${i}`} />)}
      {days.map(day => <button key={day.date} className={`${day.date === today ? 'is-today' : ''} ${day.date === focus?.date ? 'is-selected' : ''}`} aria-label={`${day.date} ${day.events.map(e => e.name).join('、')}`} aria-pressed={focus?.date === day.date} onClick={() => setSelected(day.date)}><b>{day.day}</b><small>{day.events[0]?.name || ''}</small>{day.events.length > 1 && <i />}</button>)}
    </div><aside className="ws-calendar-detail" aria-live="polite"><span className="ws-eyebrow">选题与传播建议</span><h3>{focus?.date.slice(5).replace('-', ' / ')}</h3>
      {focus?.events.length ? focus.events.map(event => <article className="ws-calendar-event" key={event.name}><span className="ws-eyebrow">{event.kind} · {event.theme}</span><h4>{event.name}</h4><p>{event.idea}</p><small className="ws-muted">建议 {preparation(focus.date, event.leadDays)} 前启动准备 · 提前 {event.leadDays} 天</small><Source event={event} /></article>) : <p className="ws-muted">这一天暂无该主题节点，可参考上方整月策划建议。</p>}
    </aside></div>
    <div className="ws-calendar-agenda"><span className="ws-eyebrow">本月选题 · {days.reduce((n, d) => n + d.events.length, 0)} 个节点</span><div>{days.flatMap(day => day.events.map(event => <button key={`${day.date}-${event.name}`} aria-pressed={focus?.date === day.date} onClick={() => setSelected(day.date)}><span>{month}/{day.day}</span>{event.name}</button>))}</div></div>
    <p className="ws-calendar-footnote">纪念日附原始资料，传播建议由本站整理；节气与农历节日自动换算。营销节点不代表放假安排，具体活动以当年主办方公告为准。</p>
  </section>;
}
