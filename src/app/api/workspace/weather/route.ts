import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const city = (request.nextUrl.searchParams.get('city') || '上海').trim();
  if (!city || city.length > 60) return NextResponse.json({ error: '请输入有效城市名称' }, { status: 400 });
  try {
    const geo = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=zh&format=json`, { signal: AbortSignal.timeout(8000), next: { revalidate: 86400 } });
    if (!geo.ok) throw new Error('geo');
    const location = (await geo.json()).results?.[0];
    if (!location) return NextResponse.json({ error: '未找到城市，请尝试中文或拼音' }, { status: 404 });
    const url = new URL('https://api.open-meteo.com/v1/forecast');
    url.search = new URLSearchParams({ latitude: String(location.latitude), longitude: String(location.longitude), current: 'temperature_2m,weather_code,relative_humidity_2m', daily: 'temperature_2m_max,temperature_2m_min', timezone: 'auto', forecast_days: '1' }).toString();
    const result = await fetch(url, { signal: AbortSignal.timeout(8000), cache: 'no-store' });
    if (!result.ok) throw new Error('weather');
    const data = await result.json();
    if (!Number.isFinite(data.current?.temperature_2m)) throw new Error('invalid weather');
    return NextResponse.json({ city: location.name, country: location.country, temperature: data.current.temperature_2m, code: data.current.weather_code, humidity: data.current.relative_humidity_2m, high: data.daily?.temperature_2m_max?.[0], low: data.daily?.temperature_2m_min?.[0], updatedAt: data.current.time, timezone: data.timezone });
  } catch { return NextResponse.json({ error: '天气暂时不可用，请稍后重试' }, { status: 502 }); }
}
