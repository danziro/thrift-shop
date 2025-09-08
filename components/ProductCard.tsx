"use client";

import Image from 'next/image';
import { useMemo } from 'react';
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
        <div className="mt-2 text-[11px] sm:text-[12px] text-slate-500 leading-snug min-h-[18px]">
          {product.size ? (<div>Ukuran {product.size}</div>) : null}
        </div>
        <div className="mt-auto pt-3 flex items-center justify-end">
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


