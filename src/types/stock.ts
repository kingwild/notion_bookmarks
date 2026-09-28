export interface StockIdentity {
  secid: string;
  code: string;
  name: string;
  market: string;
  category?: StockCategory;
  shares?: number;
}

export interface StockQuote extends StockIdentity {
  price: number | null;
  change: number | null;
  changePercent: number | null;
  previousClose: number | null;
  volume: number | null;
  amount: number | null;
  turnoverRate: number | null;
  updatedAt: string | null;
  isStale: boolean;
}

export type StockSearchResult = StockIdentity;

export type StockWatchlistLayout = 'list' | 'grid';

export type StockCategory = 'stock' | 'etf' | 'index' | 'hk';
