import { NextResponse } from 'next/server';
import { appendQueryLog } from '@/lib/sheets';

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { text, referer } = body || {};
    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'text required' }, { status: 400 });
    }
    const ua = (req.headers.get('user-agent') || '').slice(0, 200);
    await appendQueryLog({ text, referer: typeof referer === 'string' ? referer : '', userAgent: ua });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'query log error' }, { status: 500 });
  }
}
