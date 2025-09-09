import ProductCard from '@/components/ProductCard';
import ProductCardSkeleton from '@/components/ProductCardSkeleton';
import { fetchSheetProducts, type ProductItem } from '@/lib/sheets';
import { siteConfig } from '@/config/site';

type Props = {
  limit?: number;
};

export default async function ProductGrid({ limit }: Props) {
  try {
    const products: ProductItem[] = await fetchSheetProducts();
    const visible = products.filter(p => (p.status || '').toLowerCase() !== 'draft' && (p.status || '').toLowerCase() !== 'sold');
    const items = typeof limit === 'number' ? visible.slice(0, limit) : visible;

    if (!items.length) {
      return (
        <div className="text-center text-gray-500">Produk belum tersedia. Cek lagi nanti ya 👟</div>
      );
    }

    const itemListLd = {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      itemListElement: items.map((p, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        item: {
          '@type': 'Product',
          name: p.name,
          description: p.description,
          image: p.imageUrl,
          brand: p.brand ? { '@type': 'Brand', name: p.brand } : undefined,
          offers: {
            '@type': 'Offer',
            priceCurrency: 'IDR',
            price: Number(p.price || 0),
            availability: 'https://schema.org/InStock',
            url: p.buyUrl || siteConfig.url,
          },
        },
      })),
    };

    return (
      <>
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
          {items.map((p, idx) => (
            <ProductCard key={idx} product={p} />
          ))}
        </div>
        <script
          id="product-list-json-ld"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListLd) }}
        />
      </>
    );
  } catch {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
        {Array.from({ length: limit ?? 8 }).map((_, i) => (
          <ProductCardSkeleton key={i} />
        ))}
      </div>
    );
  }
}


