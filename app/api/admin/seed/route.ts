import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';
import { createProduct, type ProductItem } from '@/lib/sheets';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function loadMockProducts(): Promise<ProductItem[]> {
  const filePath = path.join(process.cwd(), 'mock', 'products.json');
  const raw = await fs.readFile(filePath, 'utf-8');
  const arr = JSON.parse(raw) as any[];
  // Normalize to ProductItem partials
  return arr.map((p) => ({
    name: String(p.name || '').trim(),
    price: Number(p.price || 0),
    description: String(p.description || '').trim(),
    category: String(p.category || 'sepatu').trim(),
    imageUrl: String(p.imageUrl || '').trim(),
    images: Array.isArray(p.images) ? p.images : undefined,
    buyUrl: p.buyUrl ? String(p.buyUrl) : undefined,
    brand: p.brand ? String(p.brand) : undefined,
    size: p.size ? String(p.size) : undefined,
    color: p.color ? String(p.color) : undefined,
    status: p.status ? String(p.status) : 'Published',
  })) as ProductItem[];
}

async function doSeed(limit?: number) {
  const items = await loadMockProducts();
  const slice = typeof limit === 'number' ? items.slice(0, Math.max(0, limit)) : items;
  const created: ProductItem[] = [];
  for (const data of slice) {
    const c = await createProduct(data);
    created.push(c);
  }
  return created;
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const limit = typeof body?.limit === 'number' ? body.limit : undefined;
    const created = await doSeed(limit);
    return NextResponse.json({ message: `Seed OK`, count: created.length, products: created });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Seed error' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const created = await doSeed();
    return NextResponse.json({ message: `Seed OK`, count: created.length, products: created });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Seed error' }, { status: 500 });
  }
}
