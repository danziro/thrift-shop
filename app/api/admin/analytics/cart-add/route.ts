import { NextResponse } from 'next/server';
import { listCartAddLogs } from '@/lib/sheets';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const logs = await listCartAddLogs(50);
    return NextResponse.json({ logs });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'list error' }, { status: 500 });
  }
}
