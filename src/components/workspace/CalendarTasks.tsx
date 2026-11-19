'use client';
import { useEffect, useState } from 'react';
import type { TodayTask } from '@/lib/workspace-task-dates';
import { workspaceJson } from './OwnerTools';
export default function CalendarTasks({ date, refresh }: { date: string; refresh: number }) {
  const [tasks, setTasks] = useState<TodayTask[]>([]), [error, setError] = useState(''), [loading, setLoading] = useState(true), [retry, setRetry] = useState(0);
  useEffect(() => { const changed = () => setRetry(v => v + 1); window.addEventListener('king:tasks-changed', changed); return () => window.removeEventListener('king:tasks-changed', changed); }, []);
  useEffect(() => {
    const controller = new AbortController(); setLoading(true); setError(''); setTasks([]);
    workspaceJson<{ tasks: TodayTask[] }>(`/api/workspace/tasks?date=${date}`, { signal: controller.signal, cache: 'no-store' })
      .then(data => { if (!controller.signal.aborted) setTasks(data.tasks); })
      .catch(e => { if (!controller.signal.aborted) setError(e.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [date, refresh, retry]);
  return <section className="ws-calendar-tasks"><h4>当天任务 <span className="ws-count">{tasks.length}</span></h4><p className="ws-muted">Notion · KING / 任务</p>
    {loading ? <p role="status">正在同步…</p> : error ? <p role="alert">{error} <button className="ws-text-button" onClick={() => setRetry(v => v + 1)}>重试</button></p> : tasks.length ? <ul>{tasks.map(task => <li key={task.id} className={task.status === '已完成' ? 'is-done' : ''}><a href={task.url} target="_blank" rel="noreferrer">{task.title}</a><small>{task.status}{task.priority ? ` · ${task.priority}` : ''}</small></li>)}</ul> : <p className="ws-muted">当天暂无任务。</p>}
  </section>;
}
