"use client";

import { useEffect, useMemo, useState } from "react";

type CartItem = {
  id?: string;
  name: string;
  price: number;
  imageUrl?: string;
  size?: string;
};

export default function CartPage() {
  const [items, setItems] = useState<CartItem[]>([]);
  const [soldMap, setSoldMap] = useState<Record<string, boolean>>({});

  useEffect(() => {
    try {
      const raw = localStorage.getItem('cart');
      const list = raw ? JSON.parse(raw) as CartItem[] : [];
      setItems(list);
    } catch {
      setItems([]);
    }
    // sinkron status Sold
    (async () => {
      try {
        const res = await fetch('/api/sheet', { cache: 'no-store' });
        const data = await res.json();
        const map: Record<string, boolean> = {};
        (data.products || []).forEach((p: any) => {
          if (p?.id) map[p.id] = String(p.status||'').toLowerCase() === 'sold';
        });
        setSoldMap(map);
      } catch {}
    })();
  }, []);

  function save(list: CartItem[]) {
    setItems(list);
    try { localStorage.setItem('cart', JSON.stringify(list)); } catch {}
    if (typeof window !== 'undefined') window.dispatchEvent(new Event('cart:updated'));
  }

  function removeAt(idx: number) {
    const next = items.filter((_, i) => i !== idx);
    save(next);
  }

  function clearAll() {
    save([]);
  }

  const total = useMemo(() => items.reduce((acc, it) => acc + (Number(it.price)||0), 0), [items]);

  return (
    <main className="min-h-screen">
      <section className="mx-auto max-w-4xl px-6 py-10">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-gray-900">Keranjang</h1>
        <p className="text-gray-600 mt-2">Simpan barang incaranmu di sini sebelum checkout.</p>

        {items.length === 0 ? (
          <div className="mt-8 card p-4 text-slate-600">Keranjang kosong.</div>
        ) : (
          <div className="mt-6 grid grid-cols-1 gap-3">
            {items.map((it, i) => {
              const isSold = it.id ? !!soldMap[it.id] : false;
              return (
              <div key={`${it.id || it.name}-${i}`} className="card p-3 flex items-center gap-3">
                {it.imageUrl ? (
                  <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={it.imageUrl} alt={it.name} className="w-full h-full object-cover" />
                  </div>
                ) : null}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-900 truncate">{it.name}</p>
                  <p className="text-sm text-slate-600">{it.size ? `Ukuran ${it.size}` : ''}</p>
                  {isSold && (
                    <p className="text-xs text-rose-600 mt-1">Produk ini sudah SOLD. Silakan hapus dari keranjang.</p>
                  )}
                </div>
                <div className="text-right">
                  <p className="font-semibold">Rp {Number(it.price||0).toLocaleString('id-ID')}</p>
                  <button onClick={()=>removeAt(i)} className="text-xs text-rose-600 hover:text-rose-700 mt-1">Hapus</button>
                </div>
              </div>
              );
            })}
          </div>
        )}

        <div className="mt-6 flex items-center justify-between">
          <button onClick={clearAll} className="text-sm text-slate-700 hover:text-slate-900">Kosongkan</button>
          <div className="text-right">
            <p className="text-sm text-slate-500">Total</p>
            <p className="text-2xl font-bold">Rp {total.toLocaleString('id-ID')}</p>
            <a href="/katalog" className="inline-block mt-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 text-sm">Belanja Lagi</a>
          </div>
        </div>
      </section>
    </main>
  );
}
