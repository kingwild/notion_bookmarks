'use client';
import { useEffect, useRef, useState } from 'react';
import { X, ShieldCheck, Sparkles, Plus, Send } from 'lucide-react';
import { shanghaiDay } from '@/lib/workspace-task-dates';
import { CaptureItem, validateCapture } from '@/lib/workspace-validation';

export async function workspaceJson<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...options, signal: options?.signal || AbortSignal.timeout(90000) });
  const data = await response.json(); if (!response.ok) throw new Error(data.error || '请求失败，请重试'); return data;
}
export function OwnerLogin({ owner, onChange }: { owner: boolean; onChange: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [password, setPassword] = useState(''), [error, setError] = useState(''), [busy, setBusy] = useState(false);
  async function login() {
    setBusy(true); setError('');
    try { await workspaceJson('/api/workspace/owner', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password }) }); setPassword(''); dialog.current?.close(); onChange(); }
    catch (e) { setError(e instanceof Error ? e.message : '登录失败'); } finally { setBusy(false); }
  }
  return <><button className="ws-text-button ws-owner-button" onClick={async () => { if (!owner) { dialog.current?.showModal(); return; } try { await workspaceJson('/api/workspace/owner', { method: 'DELETE' }); onChange(); } catch { setError('退出失败，请重试'); dialog.current?.showModal(); } }}><ShieldCheck size={15} />{owner ? '退出管理' : '站主管理'}</button><dialog ref={dialog} className="ws-dialog" aria-labelledby="owner-dialog-title" onClose={() => { setPassword(''); setError(''); }}><button className="ws-dialog-close" aria-label="关闭登录" onClick={() => dialog.current?.close()}><X size={18} /></button><span className="ws-eyebrow">YOUR PRIVATE WORKSPACE</span><h2 id="owner-dialog-title">站主管理</h2><p className="ws-muted">登录后可同步自选、调整精选，并整理个人随手记。</p><form onSubmit={e => { e.preventDefault(); void login(); }}><label htmlFor="owner-password">管理口令</label><input id="owner-password" type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} maxLength={200} required /><button className="ws-primary" disabled={busy}>{busy ? '正在登录…' : '登录'}</button></form><p role="status">{error}</p></dialog></>;
}

const kindLabels = { task: '待办事项', expense: '记账 · 支出', income: '记账 · 收入', idea: '想法' };
export function OwnerCapture({ aiReady, onSaved }: { aiReady: boolean; onSaved: () => void }) {
  const [text, setText] = useState(''), [items, setItems] = useState<CaptureItem[]>([]), [original, setOriginal] = useState('');
  const [ready, setReady] = useState(false), [busy, setBusy] = useState(false), [status, setStatus] = useState('');
  useEffect(() => { try { const draft = JSON.parse(localStorage.getItem('king:capture-draft') || 'null'); if (draft && typeof draft.text === 'string') { setText(draft.text); setOriginal(typeof draft.original === 'string' ? draft.original : draft.text); if (Array.isArray(draft.items)) setItems(draft.items.filter((item: CaptureItem) => item && typeof item.id === 'string' && typeof item.title === 'string' && Object.keys(kindLabels).includes(item.kind)).slice(0,10)); } } catch {} setReady(true); }, []);
  useEffect(() => { if (ready) try { localStorage.setItem('king:capture-draft', JSON.stringify({ text, original, items })); } catch {} }, [text, original, items, ready]);
  async function preview() {
    setBusy(true); setStatus('');
    try { const data = await workspaceJson<{ items: CaptureItem[] }>('/api/workspace/capture/preview', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text }) }); setItems(data.items); setOriginal(text); setStatus('已生成预览，请核对分类、日期和金额后确认保存。'); }
    catch(e) { setStatus(e instanceof Error ? e.message : '整理失败'); } finally { setBusy(false); }
  }
  function addManual() { if (!items.length) setOriginal(text); setItems(previous => [...previous, { id: crypto.randomUUID(), kind: 'task', title: items.length ? '' : text.slice(0,200), date: shanghaiDay(), amount: '' }]); }
  function edit(id: string, patch: Partial<CaptureItem>) { setItems(previous => previous.map(item => item.id === id ? { ...item, ...patch } : item)); }
  async function save() {
    if (items.some(item => !item.savedUrl && !validateCapture(item))) { setStatus('请检查每条标题、日期和金额；收支金额必须大于 0，最多两位小数。'); return; }
    setBusy(true); setStatus(''); let saved = 0, failed = 0;
    for (const item of items.filter(item => !item.savedUrl)) {
      try { const result = await workspaceJson<{ url: string }>('/api/workspace/capture', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ item, original: original || text }) }); edit(item.id, { savedUrl: result.url }); saved++; }
      catch(e) { failed++; setStatus(e instanceof Error ? e.message : '保存失败'); break; }
    }
    if (!failed) setStatus(`已保存 ${saved} 条到 Notion。`);
    setBusy(false); onSaved();
  }
  const complete = items.length > 0 && items.every(item => item.savedUrl);
  return <section className="ws-card ws-notes ws-owner-capture"><div className="ws-section-heading"><div><span className="ws-eyebrow">TURN THOUGHTS INTO ACTION</span><h2><Sparkles size={20} /> 我的随手记</h2></div><span className="ws-note-badge">仅站主可见</span></div><p className="ws-muted">先整理、再确认。任务、收支与想法各归其位。</p><textarea aria-label="个人随手记" placeholder="例如：今天联系客户；午餐花了 35 元；想到一个品牌短片创意…" value={text} disabled={busy || items.length > 0} maxLength={5000} onChange={e => setText(e.target.value)} /><div className="ws-capture-actions">{!items.length && <><button className="ws-primary" disabled={!text.trim() || busy || !aiReady} onClick={preview}><Sparkles size={15} />{busy ? '正在整理…' : 'AI 整理并预览'}</button><button className="ws-text-button" disabled={!text.trim() || busy} onClick={addManual}>手动整理</button></>}{items.length > 0 && !complete && <button className="ws-text-button" disabled={busy || items.length >= 10} onClick={addManual}><Plus size={14} />补充一条</button>}{complete && <button className="ws-primary" onClick={() => { setText(''); setOriginal(''); setItems([]); setStatus(''); }}>记录下一笔</button>}</div>{!aiReady && <p className="ws-muted">AI 服务待接入；当前可手动分类、预览并保存。</p>}{items.length > 0 && <div className="ws-capture-preview">{items.map((item, index) => <div className="ws-capture-item" key={item.id}><label>第 {index + 1} 条<select value={item.kind} disabled={busy || !!item.savedUrl} onChange={e => edit(item.id, { kind: e.target.value as CaptureItem['kind'] })}>{Object.entries(kindLabels).map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></label><label>内容<input maxLength={200} value={item.title} disabled={busy || !!item.savedUrl} onChange={e => edit(item.id, { title: e.target.value })} /></label><div className="ws-capture-fields"><label>日期<input type="date" value={item.date} disabled={busy || !!item.savedUrl} onChange={e => edit(item.id, { date: e.target.value })} /></label>{['expense','income'].includes(item.kind) && <label>人民币金额<input type="text" inputMode="decimal" placeholder="请核对金额" value={item.amount} disabled={busy || !!item.savedUrl} onChange={e => edit(item.id, { amount: e.target.value })} /></label>}</div>{item.savedUrl ? <a href={item.savedUrl} target="_blank" rel="noreferrer">已保存 · 在 Notion 查看 ↗</a> : <button className="ws-text-button" disabled={busy} onClick={() => setItems(previous => previous.filter(i => i.id !== item.id))}>移除此条</button>}</div>)}<p className="ws-muted">记账写入现有收入 / 支出库；账户、类别、月份关联请在 Notion 中补充。</p>{!complete && <button className="ws-primary" disabled={busy || !items.length} onClick={save}><Send size={14} />{busy ? '正在保存…' : '确认并保存未保存的条目'}</button>}</div>}<p role="status" className="ws-note-status">{status}</p></section>;
}
