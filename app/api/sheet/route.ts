import { NextResponse } from 'next/server';
import { fetchSheetProducts } from '@/lib/sheets';

export async function GET() {
  try {
    const products = await fetchSheetProducts();
    return NextResponse.json({ products });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Sheet error' }, { status: 500 });
  }
}


