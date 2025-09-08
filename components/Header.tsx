"use client";

import { ShoppingBag, Menu } from "lucide-react";
import { trackEvent } from "@/lib/analytics";
import { useEffect, useState } from "react";
import PurchaseGuideModal from "./PurchaseGuideModal";

export default function Header() {
  const [openGuide, setOpenGuide] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [pastHero, setPastHero] = useState(false);
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
      // When katalog starts to intersect the viewport, stop sticky
      setPastHero(entry.isIntersecting);
    }, { root: null, threshold: 0.01 });
    io.observe(katalog);
    return () => io.disconnect();
  }, []);
  return (
    <header className={pastHero ? "relative z-40" : "sticky top-0 z-40"}>
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-2 sm:py-3">
        <div className="flex items-center justify-between rounded-2xl border border-gray-200 bg-white shadow-sm">
          <a href="/" className="px-3 sm:px-4 py-2 text-slate-900 font-extrabold tracking-tight flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-blue-600" />
            Sneaker Thrift
          </a>
          <nav className="hidden sm:flex items-center gap-1 pr-2">
            <a href="/" className="nav-link" data-nav data-label="home">Home</a>
            <a
              href="#cara-beli"
              className="nav-link"
              data-nav
              data-label="cara_beli"
              onClick={(e) => { e.preventDefault(); setOpenGuide(true); }}
            >
              Cara Beli
            </a>
          </nav>
          <button className="sm:hidden pr-3 text-slate-700" aria-label="menu" onClick={() => setMobileOpen(v=>!v)}>
            <Menu className="w-6 h-6" />
          </button>
        </div>
        {mobileOpen && (
          <div className="sm:hidden mt-2 rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <a href="/" className="block px-4 py-3 text-sm text-slate-700 hover:bg-gray-50" onClick={()=>setMobileOpen(false)}>Home</a>
            <button
              className="w-full text-left px-4 py-3 text-sm text-slate-700 hover:bg-gray-50"
              onClick={() => { setMobileOpen(false); setOpenGuide(true); }}
            >
              Cara Beli
            </button>
          </div>
        )}
      </div>
      <PurchaseGuideModal open={openGuide} onClose={() => setOpenGuide(false)} />
    </header>
  );
}


