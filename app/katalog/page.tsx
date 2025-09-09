import ProductCard from '@/components/ProductCard';
import ProductCardSkeleton from '@/components/ProductCardSkeleton';
import { fetchSheetProducts, filterProducts, type ProductItem } from '@/lib/sheets';
import type { Metadata } from 'next';
import { siteConfig } from '@/config/site';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: `Katalog | ${siteConfig.name}`,
  description: 'Jelajahi katalog sepatu thrift pilihan: brand, ukuran, warna, dan harga yang pas di kantong.',
  alternates: {
    canonical: `${siteConfig.url}/katalog`,
  },
  openGraph: {
    title: `Katalog | ${siteConfig.name}`,
    description: 'Jelajahi katalog sepatu thrift pilihan: brand, ukuran, warna, dan harga yang pas di kantong.',
    url: `${siteConfig.url}/katalog`,
    siteName: siteConfig.name,
  },
  twitter: {
    card: 'summary_large_image',
    title: `Katalog | ${siteConfig.name}`,
    description: 'Jelajahi katalog sepatu thrift pilihan: brand, ukuran, warna, dan harga yang pas di kantong.',
  },
};

export default async function KatalogPage({ searchParams }: { searchParams?: Record<string, string | string[] | undefined> }) {
  try {
    const all: ProductItem[] = await fetchSheetProducts();
    const params = {
      keyword: typeof searchParams?.keyword === 'string' ? searchParams?.keyword : undefined,
      brand: typeof searchParams?.brand === 'string' ? searchParams?.brand : undefined,
      size: typeof searchParams?.size === 'string' ? searchParams?.size : undefined,
      color: typeof searchParams?.color === 'string' ? searchParams?.color : undefined,
      min_price: searchParams?.min_price ? Number(searchParams.min_price) : undefined,
      max_price: searchParams?.max_price ? Number(searchParams.max_price) : undefined,
      kategori: typeof searchParams?.kategori === 'string' ? searchParams?.kategori : undefined,
    } as any;
    const items = filterProducts(all, params);
    return (
      <main className="min-h-screen">
        <section className="mx-auto max-w-6xl px-6 py-10">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-gray-900">Katalog</h1>
              <p className="text-gray-600 mt-2">Pilih yang klik di hati. Semua barang kami kurasi dengan cinta.</p>
            </div>
          </div>
          <div className="mt-8">
            {items.length === 0 ? (
              <div className="text-center text-gray-500">Tidak ada produk sesuai pencarian.</div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                {items.map((p, idx) => (
                  <ProductCard key={idx} product={p} />
                ))}
              </div>
            )}
          </div>
        </section>
      </main>
    );
  } catch {
    return (
      <main className="min-h-screen">
        <section className="mx-auto max-w-6xl px-6 py-10">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            {Array.from({ length: 8 }).map((_, i) => (<ProductCardSkeleton key={i} />))}
          </div>
        </section>
      </main>
    );
  }
}


