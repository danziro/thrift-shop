import { fetchSheetProducts, type ProductItem } from '@/lib/sheets';

export const dynamic = 'force-dynamic';

function monthKey(iso?: string) {
  if (!iso) return 'Unknown';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return 'Unknown';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

export default async function AnalitikPage() {
  const items: ProductItem[] = await fetchSheetProducts();

  // per bulan (createdAt)
  const byMonth: Record<string, { count: number; value: number }> = {};
  for (const p of items) {
    const k = monthKey(p.createdAt);
    if (!byMonth[k]) byMonth[k] = { count: 0, value: 0 };
    byMonth[k].count += 1;
    byMonth[k].value += Number(p.price || 0) || 0;
  }
  const months = Object.keys(byMonth).filter(k=>k!=='Unknown').sort();
  const lastMonths = months.slice(-6);
  const seriesAdd = lastMonths.map(k => ({ label: k, count: byMonth[k].count }));
  const seriesValue = lastMonths.map(k => ({ label: k, value: byMonth[k].value }));

  // terlaris (Sold)
  const sold = items.filter(p => (p.status||'').toLowerCase() === 'sold');
  const brandCount: Record<string, number> = {};
  const sizeCount: Record<string, number> = {};
  for (const p of sold) {
    const b = (p.brand || 'Unknown').trim() || 'Unknown';
    const s = (p.size || 'Unknown').trim() || 'Unknown';
    brandCount[b] = (brandCount[b] || 0) + 1;
    sizeCount[s] = (sizeCount[s] || 0) + 1;
  }
  const topBrand = Object.entries(brandCount).sort((a,b)=>b[1]-a[1]).slice(0,8).map(([label, count])=>({ label, count }));
  const topSize = Object.entries(sizeCount).sort((a,b)=>b[1]-a[1]).slice(0,8).map(([label, count])=>({ label, count }));

  return (
    <main className="min-h-screen">
      <section className="mx-auto max-w-6xl px-6 py-8">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900">Analitik</h1>
        <p className="text-gray-600 mt-1">Ringkasan kinerja inventaris dan penjualan.</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
          <div className="card p-4">
            <p className="text-xs text-slate-500 mb-2">Penambahan Barang / Bulan (6 bln)</p>
            <div className="space-y-1">
              {seriesAdd.length === 0 ? (
                <div className="text-sm text-slate-600">Belum ada data.</div>
              ) : seriesAdd.map(({label, count}) => {
                const w = Math.max(4, Math.min(100, count * 12));
                return (
                  <div key={`add-${label}`} className="flex items-center gap-2">
                    <span className="w-16 text-[11px] text-slate-500">{label}</span>
                    <div className="h-3 bg-blue-100 rounded w-full">
                      <div className="h-3 bg-blue-600 rounded" style={{ width: `${w}%` }} />
                    </div>
                    <span className="w-8 text-[11px] text-slate-600 text-right">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="card p-4">
            <p className="text-xs text-slate-500 mb-2">Nilai Inventory / Bulan (6 bln)</p>
            <div className="space-y-1">
              {seriesValue.length === 0 ? (
                <div className="text-sm text-slate-600">Belum ada data.</div>
              ) : (()=>{
                const maxv = Math.max(1, Math.max(...seriesValue.map(x=>x.value)));
                return seriesValue.map(({label, value}) => {
                  const w = Math.max(4, Math.min(100, Math.round((value / maxv) * 100)));
                  return (
                    <div key={`val-${label}`} className="flex items-center gap-2">
                      <span className="w-16 text-[11px] text-slate-500">{label}</span>
                      <div className="h-3 bg-amber-100 rounded w-full">
                        <div className="h-3 bg-amber-500 rounded" style={{ width: `${w}%` }} />
                      </div>
                      <span className="w-20 text-[11px] text-slate-600 text-right">Rp {value.toLocaleString('id-ID')}</span>
                    </div>
                  );
                });
              })()}
            </div>
          </div>

          <div className="card p-4">
            <p className="text-xs text-slate-500 mb-2">Brand Terlaris (Sold)</p>
            <div className="space-y-1">
              {topBrand.length === 0 ? (
                <div className="text-sm text-slate-600">Belum ada data.</div>
              ) : topBrand.map(({label, count}) => {
                const w = Math.max(4, Math.min(100, count * 20));
                return (
                  <div key={`br-${label}`} className="flex items-center gap-2">
                    <span className="w-28 text-[11px] text-slate-500 truncate">{label}</span>
                    <div className="h-3 bg-emerald-100 rounded w-full">
                      <div className="h-3 bg-emerald-500 rounded" style={{ width: `${w}%` }} />
                    </div>
                    <span className="w-8 text-[11px] text-slate-600 text-right">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="card p-4">
            <p className="text-xs text-slate-500 mb-2">Ukuran Terlaris (Sold)</p>
            <div className="space-y-1">
              {topSize.length === 0 ? (
                <div className="text-sm text-slate-600">Belum ada data.</div>
              ) : topSize.map(({label, count}) => {
                const w = Math.max(4, Math.min(100, count * 20));
                return (
                  <div key={`sz-${label}`} className="flex items-center gap-2">
                    <span className="w-20 text-[11px] text-slate-500 truncate">{label}</span>
                    <div className="h-3 bg-purple-100 rounded w-full">
                      <div className="h-3 bg-purple-500 rounded" style={{ width: `${w}%` }} />
                    </div>
                    <span className="w-8 text-[11px] text-slate-600 text-right">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
