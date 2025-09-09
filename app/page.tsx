import ProductGrid from '@/components/ProductGrid';
import NewProductsGrid from '@/components/NewProductsGrid';
import Reveal from '@/components/Reveal';
import HeroCTAs from '@/components/HeroCTAs';
import { fetchSheetProducts, type ProductItem } from '@/lib/sheets';

function isNewProduct(p: ProductItem) {
  const t = p.createdAt ? new Date(p.createdAt).getTime() : 0;
  if (!t) return false;
  const diffDays = (Date.now() - t) / (1000 * 60 * 60 * 24);
  return diffDays <= 3;
}

export default async function Home() {
  // Cek apakah ada produk baru utk menampilkan section
  let hasNew = false;
  try {
    const items = await fetchSheetProducts();
    hasNew = items.some(isNewProduct);
  } catch {}

  return (
    <main className="min-h-screen">
      <section className="surface-muted border-b divider-subtle">
        <div className="relative mx-auto max-w-6xl px-6 py-16 sm:py-20">
          <Reveal className="text-center">
            <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-slate-900 sheen-text">
              ThriftTu — Bikin Gayamu Bicara
            </h1>
            <p className="mt-4 text-lg text-slate-700 sheen-subtle">
              Kualitas dijamin, di tongkrongan diliatin. Cukup chat, AI yang nyariin 24 jam buat kamu.
            </p>
          </Reveal>
          <HeroCTAs />
        </div>
      </section>

      <section className="relative mx-auto max-w-6xl px-6 py-12">
        <h2 className="section-title">Kenapa Pilih Kami?</h2>
        <div className="mt-6">
          <Reveal className="card p-4 sm:p-6">
            <p className="text-slate-700 text-sm sm:text-base leading-relaxed">
              Sepatu ori pre-loved, terkurasi rapi, harga masuk akal — cukup chat, sisanya kami bantu.
            </p>
          </Reveal>
        </div>
      </section>

      {/* Produk Terbaru (hanya saat ada) */}
      {hasNew ? (
        <section className="relative mx-auto max-w-6xl px-6 py-12">
          <h2 className="section-title">Produk Terbaru</h2>
          <div className="mt-6">
            <NewProductsGrid limit={8} />
          </div>
        </section>
      ) : null}

      {/* Katalog penuh di landing */}
      <section id="katalog" className="relative mx-auto max-w-6xl px-6 pb-16">
      <h2 className="section-title">Katalog Sepatu</h2>
        <div className="mt-6">
          <ProductGrid />
        </div>
      </section>

      <div id="chat" />
    </main>
  );
}
