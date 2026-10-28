import { NextRequest, NextResponse } from 'next/server';
import { mapEastmoneySearchPayload, mapTencentQuotePayload } from '@/lib/stock/api';
import { MAX_STOCKS } from '@/lib/workspace-validation';

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get('q');
  try {
    if (query !== null) {
      if (!query.trim() || query.length > 40) return NextResponse.json({ error: '请输入名称或代码' }, { status: 400 });
      const response = await fetch(`https://searchapi.eastmoney.com/api/suggest/get?input=${encodeURIComponent(query)}&type=14&count=8`, { signal: AbortSignal.timeout(8000), next: { revalidate: 3600 } });
      if (!response.ok) throw new Error('search');
      return NextResponse.json({ results: mapEastmoneySearchPayload(await response.json()) });
    }
    const ids = (request.nextUrl.searchParams.get('ids') || '1.603019,1.000001').split(',');
    if (ids.length > MAX_STOCKS || new Set(ids).size !== ids.length || ids.some(id => !/^(?:[01]\.\d{6}|116\.\d{5})$/.test(id))) return NextResponse.json({ error: '不支持的股票代码' }, { status: 400 });
    const symbols = ids.map(id => { const [market, code] = id.split('.'); return `${market === '1' ? 'sh' : market === '0' ? 'sz' : 'hk'}${code}`; });
    const batches: string[][] = [];
    for (let i = 0; i < symbols.length; i += 20) batches.push(symbols.slice(i, i + 20));
    const responses = await Promise.allSettled(batches.map(async batch => {
      const response = await fetch(`https://qt.gtimg.cn/q=${batch.join(',')}`, { signal: AbortSignal.timeout(8000), cache: 'no-store' });
      if (!response.ok) throw new Error('quote');
      return new TextDecoder('gbk').decode(await response.arrayBuffer());
    }));
    const text = responses.flatMap(result => result.status === 'fulfilled' ? [result.value] : []).join('\n');
    const payload: Record<string, string> = {};
    for (const match of text.matchAll(/v_((?:sh|sz|hk)\d+)="([^"\r\n]*)"/g)) payload[match[1]] = match[2];
    const quotes = mapTencentQuotePayload(payload, ids);
    if (!quotes.length) throw new Error('empty');
    return NextResponse.json({ quotes, partial: quotes.length < ids.length, source: '腾讯行情', fetchedAt: new Date().toISOString() });
  } catch { return NextResponse.json({ error: '行情服务暂时不可用' }, { status: 502 }); }
}
