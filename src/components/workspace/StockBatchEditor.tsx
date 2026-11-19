'use client';
import { useState } from 'react';
import { ArrowUp, ArrowDown, Plus, X } from 'lucide-react';
import type { StockIdentity } from '@/types/stock';
import { MAX_STOCKS } from '@/lib/workspace-validation';
import { stockDraft, moveStock, parseStockDraft } from '@/lib/workspace-stock-draft';
export default function StockBatchEditor({ stocks, saving, query, setQuery, results, searching, searchError, save, close }: {
  stocks: StockIdentity[]; saving: boolean; query: string; setQuery: (value: string) => void; results: StockIdentity[]; searching: boolean; searchError: string;
  save: (stocks: StockIdentity[]) => Promise<boolean>; close: () => void;
}) {
  const [draft, setDraft] = useState(() => stockDraft(stocks)), [error, setError] = useState('');
  async function commit() { setError(''); try { const value = parseStockDraft(draft); if (await save(value)) close(); } catch (e) { setError(e instanceof Error ? e.message : '请检查输入'); } }
  return <div className="ws-stock-editor"><p className="ws-muted">调整顺序与份额后，一键保存到 Notion。</p>
    <input aria-label="搜索股票" placeholder="搜索股票名称或代码" value={query} disabled={saving} onChange={e => setQuery(e.target.value)} maxLength={40} />
    <div className="ws-stock-draft-list">{draft.map((stock, index) => <div className="ws-stock-draft-row" key={stock.secid}>
      <div><strong>{stock.name}</strong><small>{stock.code}</small></div>
      <input aria-label={`${stock.name}持有份额`} inputMode="decimal" placeholder="持有份额" value={stock.sharesText} disabled={saving} onChange={e => setDraft(items => items.map(item => item.secid === stock.secid ? { ...item, sharesText: e.target.value } : item))} />
      <div className="ws-stock-order"><button className="ws-icon-button" aria-label={`上移${stock.name}`} disabled={saving || index === 0} onClick={() => setDraft(items => moveStock(items, index, -1))}><ArrowUp size={13} /></button><button className="ws-icon-button" aria-label={`下移${stock.name}`} disabled={saving || index === draft.length - 1} onClick={() => setDraft(items => moveStock(items, index, 1))}><ArrowDown size={13} /></button><button className="ws-icon-button" aria-label={`移除${stock.name}`} disabled={saving || draft.length === 1} onClick={() => setDraft(items => items.filter(item => item.secid !== stock.secid))}><X size={13} /></button></div>
    </div>)}</div>
    <div className="ws-stock-results" aria-live="polite">{searching ? '正在搜索…' : searchError || (query && !results.length ? '没有找到匹配的股票' : '')}{results.map(stock => <button key={stock.secid} disabled={saving || draft.length >= MAX_STOCKS || draft.some(item => item.secid === stock.secid)} onClick={() => { setDraft(items => [...items, ...stockDraft([stock])]); setQuery(''); }}><span>{stock.name} <small>{stock.code}</small></span><Plus size={14} /></button>)}</div>
    {error && <p role="alert" className="ws-muted">{error}</p>}<div className="ws-stock-save-bar"><button className="ws-primary" disabled={saving} onClick={commit}>{saving ? '正在同步…' : '一键保存全部'}</button><button className="ws-text-button" disabled={saving} onClick={close}>取消修改</button><small>{draft.length} / {MAX_STOCKS}</small></div>
  </div>;
}
