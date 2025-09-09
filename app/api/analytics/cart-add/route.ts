import { NextResponse } from 'next/server';
import { appendCartAddLog } from '@/lib/sheets';

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { id, name, size, price } = body || {};
    const ua = (req.headers.get('user-agent') || '').slice(0, 200);
    await appendCartAddLog({ id, name, size, price: Number(price||0), userAgent: ua });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'log error' }, { status: 500 });
  }
}
