import { NextResponse } from 'next/server';
import { createProduct, deleteProduct, fetchSheetProducts, updateProduct } from '@/lib/sheets';

export async function GET() {
  try {
    const products = await fetchSheetProducts();
    return NextResponse.json({ products });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const data = await req.json();
    const created = await createProduct(data);
    return NextResponse.json({ product: created });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Error' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const data = await req.json();
    const id = data?.id as string;
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
    await updateProduct({ ...data, id });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Error' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id') || '';
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
    await deleteProduct(id);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Error' }, { status: 500 });
  }
}


