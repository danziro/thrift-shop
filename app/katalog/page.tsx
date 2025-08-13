import ProductGrid from '@/components/ProductGrid';
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

export default function KatalogPage() {
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
          {/* Untuk MVP, filter lanjutan ditunda; fokus grid cepat */}
          {/* Nanti bisa tambah filter kategori/harga/ukuran */}
          {/* <KatalogFilter /> */}
          {/* Produk Grid */}
          <ProductGrid />
        </div>
      </section>
    </main>
  );
}


