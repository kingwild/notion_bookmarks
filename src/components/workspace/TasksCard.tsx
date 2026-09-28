'use client';
import { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, Check, Loader2, RefreshCw } from 'lucide-react';
import type { TodayTask } from '@/lib/workspace-task-dates';
import { workspaceJson } from './OwnerTools';

export default function TasksCard({ refresh }: { refresh: number }) {
  const [tasks, setTasks] = useState<TodayTask[]>([]);
  const [days, setDays] = useState<1 | 7>(1);
  const [loading, setLoading] = useState(true), [error, setError] = useState('');
  const [retry, setRetry] = useState(0), [updatedAt, setUpdatedAt] = useState('');
  const [busy, setBusy] = useState('');
  const lock = useRef(false), version = useRef(0);
  useEffect(() => {
    const controller = new AbortController(); const current = ++version.current;
    setLoading(true); setError('');
    workspaceJson<{ tasks: TodayTask[]; updatedAt: string }>(`/api/workspace/tasks?days=${days}`, { signal: controller.signal })
      .then(data => { if (current === version.current && !controller.signal.aborted) { setTasks(data.tasks); setUpdatedAt(data.updatedAt); } })
      .catch(e => { if (!controller.signal.aborted) setError(e.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [refresh, retry, days]);
  async function complete(task: TodayTask) {
    if (lock.current || task.status === '已完成') return;
    lock.current = true; version.current++; setBusy(task.id); setError('');
    try {
      const result = await workspaceJson<{ status: string }>('/api/workspace/tasks', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: task.id, completed: true }) });
      version.current++;
      setTasks(previous => previous.map(item => item.id === task.id ? { ...item, status: result.status } : item));
      setUpdatedAt(new Date().toISOString());
    } catch (e) { setError(e instanceof Error ? e.message : '同步失败'); }
    finally { lock.current = false; setBusy(''); setLoading(false); }
  }
  return <section className="ws-card ws-tasks" id="tasks"><div className="ws-section-heading"><div><span className="ws-eyebrow">MAKE TIME FOR WHAT MATTERS</span><h2><Check size={20} /> {days === 1 ? '当天任务' : '未来 7 天任务'} <span className="ws-count">{tasks.length}</span></h2></div><div className="ws-task-controls"><button aria-pressed={days === 1} disabled={!!busy} onClick={() => { if (days !== 1) { setTasks([]); setDays(1); } }}>当天</button><button aria-pressed={days === 7} disabled={!!busy} onClick={() => { if (days !== 7) { setTasks([]); setDays(7); } }}>未来 7 天</button><button aria-label="刷新任务" disabled={loading || !!busy} onClick={() => setRetry(v => v + 1)}><RefreshCw size={14} /></button></div></div>
    {loading && <p className="ws-muted">正在同步任务…</p>}{error && <p className="ws-muted" role="status">{error}</p>}{!loading && !error && !tasks.length && <p className="ws-muted">{days === 1 ? '今天' : '未来 7 天'}暂无安排，给新的灵感留一点空间。</p>}
    {!!tasks.length && <div className="ws-task-list">{tasks.map(task => <div key={task.id} className={`ws-task ${task.status === '已完成' ? 'is-done' : ''}`}><button className="ws-task-state" aria-label={`${task.status === '已完成' ? '已完成' : '完成任务'}：${task.title}`} disabled={loading || !!busy || task.status === '已完成'} onClick={() => complete(task)}>{busy === task.id ? <Loader2 size={12} className="ws-spin" /> : task.status === '已完成' ? <Check size={12} /> : null}</button><div><strong>{task.title}</strong><small>{task.status}{task.priority ? ` · ${task.priority}` : ''}{days === 7 ? ` · ${task.due.slice(0, 10)}` : ''}</small></div><a href={task.url} target="_blank" rel="noreferrer" aria-label={`在 Notion 查看：${task.title}`}><ArrowUpRight size={14} /></a></div>)}</div>}
    <p className="ws-muted">按上海日期 · {days === 7 ? '包含今天及之后 6 天 · ' : ''}每 5 分钟同步{updatedAt ? ` · 上次成功 ${new Date(updatedAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Shanghai' })}` : ''}</p>
  </section>;
}
