'use client';
import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { marketingMonth } from '@/lib/workspace-calendar';
import { shanghaiDay } from '@/lib/workspace-task-dates';

export default function MarketingCalendar({ refresh }: { refresh: number }) {
  const [today, setToday] = useState('');
  const [offset, setOffset] = useState(0);
  const [selected, setSelected] = useState('');
  useEffect(() => { setToday(shanghaiDay()); }, [refresh]);
  const date = new Date(`${today || '2026-01-01'}T00:00:00Z`); date.setUTCDate(1); date.setUTCMonth(date.getUTCMonth() + offset);
  const year = date.getUTCFullYear(), month = date.getUTCMonth() + 1;
  const days = useMemo(() => marketingMonth(year, month), [year, month]);
  const focus = days.find(day => day.date === selected) || days.find(day => day.date >= today && day.events.length) || days.find(day => day.events.length) || days[0];
  return <section className="ws-card ws-calendar" id="calendar"><div className="ws-section-heading"><div><span className="ws-eyebrow">PLAN YOUR NEXT MOMENT</span><h2><CalendarDays size={20} /> 当月营销日历</h2></div><div className="ws-calendar-controls"><button aria-label="上个月" onClick={() => { setOffset(v => Math.max(v - 1, -12)); setSelected(''); }}><ChevronLeft size={16} /></button><strong>{today ? `${year} 年 ${month} 月` : '正在加载'}</strong><button aria-label="下个月" onClick={() => { setOffset(v => Math.min(v + 1, 12)); setSelected(''); }}><ChevronRight size={16} /></button><button onClick={() => { setOffset(0); setSelected(''); }}>本月</button></div></div><div className="ws-calendar-layout"><div className="ws-calendar-grid">{['一','二','三','四','五','六','日'].map(d => <span className="ws-weekday" key={d}>{d}</span>)}{Array.from({ length: (date.getUTCDay() + 6) % 7 }, (_, i) => <span key={`blank${i}`} />)}{days.map(day => <button key={day.date} className={`${day.date === today ? 'is-today' : ''} ${day.date === focus?.date ? 'is-selected' : ''}`} aria-label={`${day.date} ${day.events.map(e => e.name).join('、')}`} aria-pressed={focus?.date === day.date} onClick={() => setSelected(day.date)}><b>{day.day}</b><small>{day.events[0]?.name || ''}</small>{day.events.length > 1 && <i />}</button>)}</div><aside className="ws-calendar-detail"><span className="ws-eyebrow">内容灵感</span><h3>{focus?.date.slice(5).replace('-', ' / ')}</h3>{focus?.events.length ? focus.events.map(event => <p key={event.name}><span className="ws-soft-label">{event.kind}</span> {event.name}</p>) : <p>这一天暂无预设节点。</p>}<p className="ws-muted">提前准备品牌故事、产品案例与客户关怀内容，让传播更从容。</p><small className="ws-muted">节气与农历节日自动换算；营销节点供策划参考，不代表放假安排。</small></aside></div></section>;
}
