'use client';
import { useEffect, useState } from 'react';
import type { StockIdentity } from '@/types/stock';

export default function HoldingEditor({ stock, disabled, save }: { stock: StockIdentity; disabled: boolean; save: (shares: number) => Promise<boolean> }) {
  const [value, setValue] = useState(String(stock.shares ?? ''));
  const [error, setError] = useState('');
  useEffect(() => { setValue(String(stock.shares ?? '')); }, [stock.shares]);
  return <form className="ws-holding-editor" onSubmit={async e => { e.preventDefault(); if (!/^\d{1,10}(\.\d{1,4})?$/.test(value) || Number(value) > 1e9) { setError('请输入 0 至 10 亿份，最多 4 位小数'); return; } setError(''); if (await save(Number(value))) setError('份额已同步'); }}><label>{stock.name}<input aria-label={`${stock.name}持有份额`} inputMode="decimal" value={value} onChange={e => setValue(e.target.value)} placeholder="持有份额（股 / 份）" disabled={disabled} /></label><button className="ws-text-button" disabled={disabled}>保存</button>{error && <small role="status">{error}</small>}</form>;
}
