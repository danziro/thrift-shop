"use client";

import Image from 'next/image';
import { useMemo } from 'react';
import type { ProductItem } from '@/lib/sheets';
import { trackEvent } from '@/lib/analytics';
import { siteConfig } from '@/config/site';
import { InteractiveHoverButton } from '@/components/ui/interactive-hover-button';

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
        "group card overflow-hidden hover:shadow-lg hover:ring-1 hover:ring-blue-200 transition duration-300 will-change-transform hover:-translate-y-[2px] " +
        (onClick ? "cursor-pointer focus-visible:ring-2 focus-visible:ring-blue-300 outline-none" : "")
      }
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={(e) => { if (onClick && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); onClick(); } }}
    >
      <div className="relative w-full h-48 bg-gray-50">
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
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-slate-900 line-clamp-1">{product.name}</h3>
          <span className="shrink-0 text-[10px] uppercase tracking-wide bg-gray-100 text-gray-700 px-2 py-1 rounded-full">{product.category}</span>
        </div>
        <p className="mt-1 text-blue-700 font-extrabold">Rp {product.price.toLocaleString('id-ID')}</p>
        <p className="text-slate-600 text-sm mt-2 line-clamp-2">{product.description}</p>
        <div className="mt-3 flex items-center justify-between">
          <div className="text-[11px] text-slate-500">
            {product.brand || ''}
            {product.size ? (
              <>
                {product.brand ? ' • ' : ''}
                Ukuran {product.size}
              </>
            ) : null}
          </div>
          {!hideCta && waUrl ? (
            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => { trackEvent('cta_buy_whatsapp', { id: product.id, name: product.name, price: product.price }); }}
              className="shrink-0"
            >
              <InteractiveHoverButton text="Beli via WhatsApp" variant="ai" icon="right" size="sm" />
            </a>
          ) : (!hideCta && product.buyUrl) ? (
            <a
              href={product.buyUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackEvent('cta_buy_link', { id: product.id, name: product.name, price: product.price })}
              className="shrink-0"
            >
              <InteractiveHoverButton text="Beli Sekarang" variant="ai" icon="right" size="sm" />
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


