import { NextRequest, NextResponse } from 'next/server';
import { checkPassword, issueSession } from '@/lib/workspace-owner-crypto';
import { isOwner, OWNER_COOKIE, ownerSettings, readBody, sameOrigin } from '@/lib/workspace-owner';

export const dynamic = 'force-dynamic';
const attempts = new Map<string, { count: number; until: number }>();
export async function GET() {
  try { return NextResponse.json({ owner: await isOwner(), aiReady: Boolean(process.env.AI_API_KEY && process.env.AI_BASE_URL && process.env.AI_MODEL) }, { headers: { 'Cache-Control': 'private, no-store' } }); }
  catch { return NextResponse.json({ owner: false, aiReady: false }); }
}
export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return NextResponse.json({ error: '请从本网站登录' }, { status: 403 });
  try {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown';
    const now = Date.now();
    for (const [key, value] of attempts) if (value.until < now) attempts.delete(key);
    if (attempts.size >= 1000 || (attempts.get(ip)?.count || 0) >= 8) return NextResponse.json({ error: '尝试过于频繁，请 15 分钟后重试' }, { status: 429 });
    const attempt = attempts.get(ip) || { count: 0, until: now + 900000 }; attempt.count++; attempts.set(ip, attempt);
    const body = await readBody(request, 1000);
    const { key, hash } = await ownerSettings();
    if (!key || !hash) return NextResponse.json({ error: '站主登录尚未配置' }, { status: 503 });
    if (typeof body.password !== 'string' || !checkPassword(body.password, hash)) return NextResponse.json({ error: '管理口令不正确' }, { status: 401 });
    attempts.delete(ip);
    const response = NextResponse.json({ owner: true });
    response.cookies.set(OWNER_COOKIE, issueSession(key, hash), { httpOnly: true, secure: request.nextUrl.protocol === 'https:', sameSite: 'strict', path: '/', maxAge: 43200 });
    return response;
  } catch { return NextResponse.json({ error: '登录暂时不可用，请重试' }, { status: 503 }); }
}
export async function DELETE(request: NextRequest) {
  if (!sameOrigin(request)) return NextResponse.json({ error: '请从本网站退出' }, { status: 403 });
  const response = NextResponse.json({ owner: false }); response.cookies.delete(OWNER_COOKIE); return response;
}
