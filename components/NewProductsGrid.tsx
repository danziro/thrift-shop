import ProductCard from '@/components/ProductCard';
import ProductCardSkeleton from '@/components/ProductCardSkeleton';
import { fetchSheetProducts, type ProductItem } from '@/lib/sheets';

function parseIdTimestamp(id?: string): number {
  // Expecting format P-<timestampMillis>
  if (!id) return 0;
  const m = id.match(/\b(\d{10,})\b/);
  if (!m) return 0;
  const n = Number(m[1]);
  return Number.isFinite(n) ? n : 0;
}

export default async function NewProductsGrid({ limit = 8 }: { limit?: number }) {
  try {
    const items: ProductItem[] = await fetchSheetProducts();
    const now = Date.now();
    const isNew = (p: ProductItem) => {
      const created = p.createdAt ? new Date(p.createdAt).getTime() : parseIdTimestamp(p.id);
      if (!created) return false;
      const diffDays = (now - created) / (1000 * 60 * 60 * 24);
      return diffDays <= 3;
    };
    const filtered = items.filter(isNew);
    if (!filtered.length) return null;
    const sorted = filtered.sort((a, b) => (new Date(b.createdAt || 0).getTime() || parseIdTimestamp(b.id)) - (new Date(a.createdAt || 0).getTime() || parseIdTimestamp(a.id)));
    const latest = typeof limit === 'number' ? sorted.slice(0, limit) : sorted;
    return (
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
        {latest.map((p, idx) => (
          <div key={idx} className="relative">
            <div className="absolute left-2 top-2 z-[1]">
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-600 text-white shadow">NEW</span>
            </div>
            <ProductCard product={p} />
          </div>
        ))}
      </div>
    );
  } catch {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
        {Array.from({ length: limit }).map((_, i) => (<ProductCardSkeleton key={i} />))}
      </div>
    );
  }
}
