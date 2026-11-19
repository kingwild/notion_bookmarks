import type { StockIdentity } from '@/types/stock';
import { validateStocks } from './workspace-validation';
export type StockDraft = StockIdentity & { sharesText: string };
export function stockDraft(stocks: StockIdentity[]): StockDraft[] { return stocks.map(stock => ({ ...stock, sharesText: String(stock.shares ?? '') })); }
export function moveStock<T>(items: T[], index: number, step: number): T[] {
  const target = index + step;
  if (index < 0 || index >= items.length || target < 0 || target >= items.length) return items;
  const next = [...items]; [next[index], next[target]] = [next[target], next[index]]; return next;
}
export function parseStockDraft(items: StockDraft[]): StockIdentity[] {
  const values = items.map(({ sharesText, ...stock }) => {
    if (sharesText === '') { delete stock.shares; return stock; }
    if (!/^\d{1,10}(\.\d{1,4})?$/.test(sharesText) || Number(sharesText) > 1e9) throw new Error(`${stock.name}：请输入 0 至 10 亿份，最多 4 位小数`);
    return { ...stock, shares: Number(sharesText) };
  });
  const valid = validateStocks(values); if (!valid) throw new Error('股票列表无效，请检查数量和重复项'); return valid;
}
