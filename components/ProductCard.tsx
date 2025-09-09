"use client";

import Image from 'next/image';
import { useMemo } from 'react';
import { ShoppingCart } from 'lucide-react';
import type { ProductItem } from '@/lib/sheets';
import { trackEvent } from '@/lib/analytics';
import { siteConfig } from '@/config/site';
import { InteractiveHoverButton } from '@/components/ui/interactive-hover-button';
import { WhatsappIcon } from './icons/WhatsappIcon';

type Props = {
  product: ProductItem;
  hideCta?: boolean;
  onClick?: () => void;
};

export default function ProductCard({ product, hideCta, onClick }: Props) {
  const phone = process.env.NEXT_PUBLIC_WHATSAPP_PHONE;
  const waUrl = useMemo(() => {
    if (!phone) return undefined;
    const text = `Halo, saya ingin memesan sepatu ini. Bagaimana?%0A%0A` +
      `ID: ${encodeURIComponent(String(product.id ?? ''))}%0A` +
      `Nama: ${encodeURIComponent(product.name)}%0A` +
      `Harga: Rp ${product.price.toLocaleString('id-ID')}`;
    return `https://wa.me/${phone}?text=${text}`;
  }, [phone, product]);

  const productLd = useMemo(() => ({
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description,
    image: product.imageUrl ? [product.imageUrl] : undefined,
    brand: product.brand ? { '@type': 'Brand', name: product.brand } : undefined,
    category: product.category,
    sku: product.id,
    offers: {
      '@type': 'Offer',
      priceCurrency: 'IDR',
      price: Number(product.price || 0),
      availability: 'https://schema.org/InStock',
      url: product.buyUrl || siteConfig.url,
    },
  }), [product]);
  return (
    <div
      className={
        "group card overflow-hidden hover:shadow-lg hover:ring-1 hover:ring-blue-200 transition duration-300 will-change-transform hover:-translate-y-[2px] h-full flex flex-col " +
        (onClick ? "cursor-pointer focus-visible:ring-2 focus-visible:ring-blue-300 outline-none" : "")
      }
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={(e) => { if (onClick && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); onClick(); } }}
    >
      <div className="relative w-full h-48 bg-gray-50 sm:h-48 h-40">
        {product.imageUrl ? (
          <Image
            src={product.imageUrl}
            alt={product.name}
            fill
            className="object-cover group-hover:scale-[1.03] transition-transform duration-300"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">No Image</div>
        )}
      </div>
      <div className="p-3 sm:p-4 flex-1 flex flex-col">
        <div className="flex items-start gap-2">
          <h3 className="font-medium text-slate-900 text-[12px] sm:text-sm leading-snug line-clamp-2 min-h-[34px]">
            {product.name}
          </h3>
        </div>
        <p className="mt-1 text-blue-700 font-semibold text-[13px] sm:text-base">Rp {product.price.toLocaleString('id-ID')}</p>
        <div className="mt-2 text-slate-600 text-[11px] sm:text-xs leading-relaxed line-clamp-2 min-h-[32px]">
          {product.description}
        </div>
        <div className="mt-2 text-[11px] sm:text-[12px] text-slate-500 leading-snug min-h-[18px] flex items-center justify-between">
          {product.size ? (<div>Ukuran {product.size}</div>) : <span />}
          {typeof product.stock === 'number' ? (
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full ${product.stock>0 ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'}`}>
              {product.stock>0 ? `Stok ${product.stock}` : 'Stok habis'}
            </span>
          ) : null}
        </div>
        <div className="mt-auto pt-3 flex items-center justify-between gap-2">
          {/* Tambah ke Cart (ikon) */}
          {!hideCta && (
            <button
              onClick={(e) => {
                try {
                  const raw = localStorage.getItem('cart');
                  const cart = raw ? JSON.parse(raw) as any[] : [];
                  const item = { id: product.id, name: product.name, price: product.price, imageUrl: product.imageUrl, size: product.size };
                  const sameCount = cart.filter(x => x.id === product.id).length;
                  const max = typeof product.stock === 'number' ? product.stock : Infinity;
                  if (sameCount >= max) {
                    const el = document.createElement('div');
                    el.className = 'fixed bottom-6 left-1/2 -translate-x-1/2 bg-rose-600 text-white px-3 py-2 rounded-xl shadow z-[9999]';
                    el.textContent = 'Jumlah melebihi stok tersedia';
                    document.body.appendChild(el);
                    setTimeout(()=>el.remove(), 1800);
                    return;
                  }
                  cart.push(item);
                  localStorage.setItem('cart', JSON.stringify(cart));
                  window.dispatchEvent(new Event('cart:updated'));
                  trackEvent('cart_add', { id: product.id, name: product.name, price: product.price });
                  // Log ke backend untuk notifikasi admin
                  try {
                    fetch('/api/analytics/cart-add', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ id: product.id, name: product.name, size: product.size, price: product.price })
                    });
                  } catch {}
                } catch {}
                // simple fly-to-cart animation
                try {
                  const cartEl = document.getElementById('cart-icon');
                  const imgEl = e.currentTarget.closest('.card')?.querySelector('img') as HTMLImageElement | null;
                  if (cartEl && imgEl) {
                    const rectStart = imgEl.getBoundingClientRect();
                    const rectEnd = cartEl.getBoundingClientRect();
                    const clone = imgEl.cloneNode(true) as HTMLImageElement;
                    clone.style.position = 'fixed';
                    clone.style.left = `${rectStart.left}px`;
                    clone.style.top = `${rectStart.top}px`;
                    clone.style.width = `${rectStart.width}px`;
                    clone.style.height = `${rectStart.height}px`;
                    clone.style.borderRadius = '8px';
                    clone.style.zIndex = '9999';
                    clone.style.transition = 'all .6s cubic-bezier(.22,.61,.36,1)';
                    document.body.appendChild(clone);
                    requestAnimationFrame(() => {
                      clone.style.left = `${rectEnd.left}px`;
                      clone.style.top = `${rectEnd.top}px`;
                      clone.style.width = `16px`;
                      clone.style.height = `16px`;
                      clone.style.opacity = '0.7';
                      clone.style.borderRadius = '9999px';
                    });
                    setTimeout(() => clone.remove(), 700);
                  }
                } catch {}
              }}
              className="rounded-xl border border-gray-300 p-2 text-slate-700 hover:bg-gray-50"
              aria-label="Tambah ke Cart"
              title="Tambah ke Cart"
            >
              <ShoppingCart className="w-4 h-4" />
            </button>
          )}
          {!hideCta && waUrl ? (
            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => { trackEvent('cta_buy_whatsapp', { id: product.id, name: product.name, price: product.price }); }}
              className="shrink-0"
            >
              <InteractiveHoverButton text="Beli" variant="ai" icon="whatsapp" size="sm" />
            </a>
          ) : (!hideCta && product.buyUrl) ? (
            <a
              href={product.buyUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackEvent('cta_buy_link', { id: product.id, name: product.name, price: product.price })}
              className="shrink-0"
            >
              <InteractiveHoverButton text="Beli" variant="ai" icon="right" size="sm" />
            </a>
          ) : null}
        </div>
        <script
          id={`product-json-ld-${product.id ?? product.name}`}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(productLd) }}
        />
      </div>
    </div>
  );
}


