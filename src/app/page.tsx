import Workspace from '@/components/workspace/Workspace';
import { getLinks, getCategories, getWebsiteConfig } from '@/lib/notion';
import type { StockIdentity } from '@/types/stock';
import { getNoteSettings } from '@/lib/workspace-notes';

export const dynamic = 'force-dynamic';
export const revalidate = 300;

export default async function HomePage() {
  const [categories, links, config, noteSettings] = await Promise.all([getCategories(), getLinks(), getWebsiteConfig(), getNoteSettings().catch(() => ({ databaseId: '', key: '' }))]);
  const enabled = new Set(categories.map(category => category.name));
  const visibleLinks = links.filter(link => enabled.has(link.category1));
  const initialStocks: StockIdentity[] = [
    { secid: '1.603019', code: '603019', name: '中科曙光', market: '沪A', category: 'stock' },
    { secid: '1.000001', code: '000001', name: '上证指数', market: '指数', category: 'index' },
  ];
  return <Workspace links={visibleLinks} categories={categories} title={config.SITE_TITLE || 'KING 工作基地'} defaultCity={config.WEATHER_CITY || '上海'} initialStocks={initialStocks} notesEnabled={Boolean(noteSettings.key && noteSettings.databaseId)} />;
}
