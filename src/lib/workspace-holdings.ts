import type { StockIdentity, StockQuote } from '@/types/stock';
import { shanghaiDay } from './workspace-task-dates';

// Do not combine currencies or label an older trading session as today's return.
export function dailyReturns(stocks: StockIdentity[], quotes: StockQuote[], today = shanghaiDay()) {
  const groups = new Map<string, { currency: string; amount: number; missing: number; count: number }>();
  for (const stock of stocks) {
    if (!stock.shares || !Number.isFinite(stock.shares) || stock.shares <= 0) continue;
    const currency = stock.secid.startsWith('116.') ? 'HKD' : 'CNY';
    const group = groups.get(currency) || { currency, amount: 0, missing: 0, count: 0 };
    group.count++;
    const quote = quotes.find(q => q.secid === stock.secid);
    if (!quote || quote.isStale || quote.price == null || quote.previousClose == null || !Number.isFinite(quote.price) || !Number.isFinite(quote.previousClose) || quote.price <= 0 || quote.previousClose <= 0 || !quote.updatedAt || !Number.isFinite(Date.parse(quote.updatedAt)) || shanghaiDay(new Date(quote.updatedAt)) !== today) group.missing++;
    else group.amount += (quote.price - quote.previousClose) * stock.shares;
    groups.set(currency, group);
  }
  return [...groups.values()].map(group => ({ ...group, amount: Math.round(group.amount * 100) / 100 }));
}
