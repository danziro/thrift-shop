import ProductGrid from '@/components/ProductGrid';
import Reveal from '@/components/Reveal';
import HeroCTAs from '@/components/HeroCTAs';

export default function Home() {
  return (
    <main className="min-h-screen">
      <section className="relative overflow-hidden hero-surface">
        {/* Decorative blobs */}
        <div className="blob blue -top-10 -left-10 absolute" />
        <div className="blob amber top-6 right-0 absolute" />
        <div className="relative mx-auto max-w-6xl px-6 py-16 sm:py-20">
          <Reveal className="text-center">
            <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-slate-900 sheen-text">
              Sneaker Thrift — Sepatu Bekas, Cerita Baru
            </h1>
            <p className="mt-4 text-lg text-slate-700 sheen-subtle">
              Sepatu ori pre-loved, harga masuk akal, kualitas masih ngacir. Cukup chat, biar AI yang nyariin.
            </p>
          </Reveal>
          <HeroCTAs />
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-12">
        <h2 className="section-title">Kenapa Pilih Kami?</h2>
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Reveal className="card p-6">
            <p className="text-lg font-semibold text-slate-900">Ori, Aman, Nyaman</p>
            <p className="text-slate-600 mt-2">Kurasi sepatu ori pre-loved. Detail kondisi jujur, tanpa drama.</p>
          </Reveal>
          <Reveal className="card p-6">
            <p className="text-lg font-semibold text-slate-900">Harga Masuk Akal</p>
            <p className="text-slate-600 mt-2">Biar kantong aman, rasa tetap jalan. Kualitas dulu, harga menyusul.</p>
          </Reveal>
          <Reveal className="card p-6">
            <p className="text-lg font-semibold text-slate-900">Cari Sekali, Ketemu Pasti</p>
            <p className="text-slate-600 mt-2">Chat AI kami. Sebutin brand, ukuran, budget—langsung terkurasi.</p>
          </Reveal>
        </div>
      </section>

      {/* Katalog penuh di landing */}
      <section id="katalog" className="mx-auto max-w-6xl px-6 pb-16">
        <div className="flex items-end justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Katalog Sepatu</h2>
        </div>
        <div className="mt-6">
          <ProductGrid />
        </div>
      </section>

      <div id="chat" />
    </main>
  );
}
