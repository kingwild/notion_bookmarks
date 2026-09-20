import type { StockIdentity } from '@/types/stock';
export function validateStocks(value: unknown): StockIdentity[] | null {
  if (!Array.isArray(value) || value.length < 1 || value.length > 10) return null;
  const seen = new Set<string>(); const result: StockIdentity[] = [];
  for (const stock of value) {
    if (!stock || typeof stock !== 'object' || typeof stock.secid !== 'string' || !/^(?:[01]\.\d{6}|116\.\d{5})$/.test(stock.secid) || seen.has(stock.secid) || stock.code !== stock.secid.split('.')[1] || typeof stock.name !== 'string' || !stock.name.trim() || stock.name.length > 60) return null;
    seen.add(stock.secid); result.push({ secid: stock.secid, code: stock.code, name: stock.name.trim(), market: stock.secid.split('.')[0] });
  }
  return result;
}
export type CaptureItem = { id: string; kind: 'task' | 'expense' | 'income' | 'idea'; title: string; date: string; amount: string; savedUrl?: string };
export function validDate(value: unknown): value is string {
  return typeof value === 'string' && /^20\d{2}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(`${value}T00:00:00Z`)) && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;
}
export function validateCapture(value: unknown): CaptureItem | null {
  if (!value || typeof value !== 'object') return null;
  const item = value as CaptureItem;
  if (typeof item.id !== 'string' || !/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i.test(item.id) || !['task', 'expense', 'income', 'idea'].includes(item.kind) || typeof item.title !== 'string' || !item.title.trim() || item.title.length > 200 || !validDate(item.date)) return null;
  if (['expense', 'income'].includes(item.kind) && (typeof item.amount !== 'string' || !/^\d{1,9}(\.\d{1,2})?$/.test(item.amount) || Number(item.amount) <= 0)) return null;
  return { id: item.id, kind: item.kind, title: item.title.trim(), date: item.date, amount: ['expense', 'income'].includes(item.kind) ? item.amount : '' };
}
