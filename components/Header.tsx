"use client";

import { Menu, ShoppingCart, UserCircle2, Trash2 } from "lucide-react";
import { trackEvent } from "@/lib/analytics";
import { useEffect, useState } from "react";
import PurchaseGuideModal from "./PurchaseGuideModal";
import SearchBar from "@/components/SearchBar";

export default function Header() {
  const [openGuide, setOpenGuide] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [pastHero, setPastHero] = useState(false);
  const [cartCount, setCartCount] = useState<number>(0);
  const [cartPreviewOpen, setCartPreviewOpen] = useState(false);
  const [cartPreview, setCartPreview] = useState<Array<{ id: string; name: string; imageUrl?: string; price?: number }>>([]);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const removeFromCart = (id: string) => {
    try {
      const raw = localStorage.getItem('cart');
      const list = raw ? JSON.parse(raw) as any[] : [];
      const next = list.filter((it) => String(it.id) !== String(id));
      localStorage.setItem('cart', JSON.stringify(next));
      window.dispatchEvent(new Event('cart:updated'));
    } catch {}
  };
  useEffect(() => {
    const links = document.querySelectorAll<HTMLAnchorElement>('a[data-nav]');
    const handler = (e: Event) => {
      const el = e.currentTarget as HTMLAnchorElement;
      const label = el.getAttribute('data-label') || '';
      trackEvent('nav_click', { label });
    };
    links.forEach((a) => a.addEventListener('click', handler));
    return () => links.forEach((a) => a.removeEventListener('click', handler));
  }, []);

  // Toggle sticky only on hero; stop following after "Kenapa Pilih Kami?" (or when #katalog comes into view)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const katalog = document.getElementById('katalog');
    if (!katalog) return;
    const io = new IntersectionObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      setPastHero(entry.isIntersecting);
    }, { root: null, threshold: 0.01 });
    io.observe(katalog);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const read = () => {
      try {
        const raw = localStorage.getItem('cart');
        const list = raw ? JSON.parse(raw) as any[] : [];
        setCartCount(list.length);
        setCartPreview(list.slice(0,3));
      } catch { setCartCount(0); }
    };
    read();
    const onStorage = (e: StorageEvent) => { if (e.key === 'cart') read(); };
    const onCustom = () => read();
    window.addEventListener('storage', onStorage);
    window.addEventListener('cart:updated', onCustom as EventListener);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('cart:updated', onCustom as EventListener);
    };
  }, []);

  return (
    <header className={`sticky top-0 z-30 bg-white/85 backdrop-blur border-b border-gray-200`}>
      <div className="mx-auto max-w-6xl px-3 sm:px-6">
        <div className="h-14 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2 text-slate-900 font-semibold">
            {/* Logo brand */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="ThriftTu" className="w-6 h-6 rounded-full" />
            <span>ThriftTu</span>
          </a>
          <div className="hidden md:block flex-1 max-w-lg mx-4">
            <SearchBar />
          </div>
          <nav className="hidden sm:flex items-center gap-1 pr-2 relative">
            <a href="/" className="nav-link" data-nav data-label="home">Home</a>
            <button
              className="nav-link"
              data-nav
              data-label="chat_ai"
              onClick={() => { try { window.dispatchEvent(new Event('chat:open')); } catch {}; }}
            >
              Chat AI
            </button>
            <a
              href="#cara-beli"
              className="nav-link"
              data-nav
              data-label="cara_beli"
              onClick={(e) => { e.preventDefault(); setOpenGuide(true); }}
            >
              Cara Beli
            </a>
            <div
              className="relative px-1 py-1"
              onMouseEnter={() => { setCartPreviewOpen(true); }}
              onMouseLeave={() => { setCartPreviewOpen(false); }}
            >
              <a id="cart-icon" href="/cart" className="nav-link relative flex items-center gap-2" data-nav data-label="cart" title="Keranjang">
                <ShoppingCart className="w-4 h-4" />
                <span>Cart</span>
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-2 bg-rose-600 text-white text-[10px] leading-none px-1.5 py-1 rounded-full">
                    {cartCount}
                  </span>
                )}
              </a>
              {/* Dropdown preview (desktop) */}
              {cartPreviewOpen && cartPreview.length > 0 && (
                <div className="absolute right-0 mt-2 w-80 bg-white border border-gray-200 shadow-xl rounded-xl p-2 z-50" onMouseEnter={()=>setCartPreviewOpen(true)} onMouseLeave={()=>setCartPreviewOpen(false)}>
                  <p className="px-2 py-1 text-xs text-slate-500">Terakhir ditambahkan</p>
                  <ul className="max-h-64 overflow-auto">
                    {cartPreview.map((it, idx) => (
                      <li key={`${it.id}-${idx}`} className="flex items-center gap-2 px-2 py-2 hover:bg-gray-50 rounded-lg">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        {it.imageUrl ? <img src={it.imageUrl} alt={it.name} className="w-10 h-10 rounded object-cover bg-gray-100"/> : <div className="w-10 h-10 rounded bg-gray-100"/>}
                        <div className="min-w-0 flex-1">
                          <p className="text-sm text-slate-900 truncate">{it.name}</p>
                          {typeof it.price === 'number' ? <p className="text-xs text-blue-700">Rp {Number(it.price||0).toLocaleString('id-ID')}</p> : null}
                        </div>
                        <button
                          type="button"
                          className="p-1.5 rounded-md text-rose-600 hover:bg-rose-50"
                          title="Hapus dari keranjang"
                          onClick={(e)=>{
                            e.preventDefault();
                            e.stopPropagation();
                            const ok = window.confirm('Hapus item ini dari keranjang?');
                            if (ok) removeFromCart(it.id);
                          }}
                        >
                          <Trash2 className="w-4 h-4"/>
                        </button>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-1 px-2">
                    <a href="/cart" className="w-full inline-flex justify-center items-center gap-2 rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50">Lihat keranjang</a>
                  </div>
                </div>
              )}
            </div>
            <a href="/akun" className="nav-link flex items-center gap-2" data-nav data-label="akun" title="Akun">
              <UserCircle2 className="w-4 h-4" />
            </a>
          </nav>
          <div className="sm:hidden flex items-center gap-2 pr-2">
            {/* Mobile Search toggle */}
            <button
              className="p-2 rounded-lg hover:bg-gray-100 text-slate-700"
              aria-label="Cari"
              onClick={() => setMobileSearchOpen(v=>!v)}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
            </button>
            {/* Mobile Cart icon with badge */}
            <a href="/cart" className="relative p-2 rounded-lg hover:bg-gray-100 text-slate-700" aria-label="Keranjang">
              <ShoppingCart className="w-5 h-5" />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-rose-600 text-white text-[10px] leading-none px-1.5 py-1 rounded-full">
                  {cartCount}
                </span>
              )}
            </a>
            <button className="p-2 rounded-lg hover:bg-gray-100 text-slate-700" aria-label="menu" onClick={() => setMobileOpen(v=>!v)}>
              <Menu className="w-6 h-6" />
            </button>
          </div>
        </div>
        {/* Mobile Search panel (slide-down) */}
        {mobileSearchOpen && (
          <div className="sm:hidden mt-2 rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <div className="px-4 py-3">
              <SearchBar />
            </div>
          </div>
        )}
        {mobileOpen && (
          <div className="sm:hidden mt-2 rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <button
              className="w-full text-left px-4 py-3 text-sm text-slate-700 hover:bg-gray-50"
              onClick={() => { setMobileOpen(false); try { window.dispatchEvent(new Event('chat:open')); } catch {}; }}
            >
              Chat AI
            </button>
            <a href="/" className="block px-4 py-3 text-sm text-slate-700 hover:bg-gray-50" onClick={()=>setMobileOpen(false)}>Home</a>
            <button
              className="w-full text-left px-4 py-3 text-sm text-slate-700 hover:bg-gray-50"
              onClick={() => { setMobileOpen(false); setOpenGuide(true); }}
            >
              Cara Beli
            </button>
            <a href="/akun" className="block px-4 py-3 text-sm text-slate-700 hover:bg-gray-50" onClick={()=>setMobileOpen(false)}>Akun</a>
          </div>
        )}
      </div>
      <PurchaseGuideModal open={openGuide} onClose={() => setOpenGuide(false)} />
    </header>
  );
}


