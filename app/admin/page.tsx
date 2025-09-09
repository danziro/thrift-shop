"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { z } from 'zod';
import { AdminProductForm, type AdminProductFormValues } from '@/components/admin/AdminProductForm';
import SkeletonTableRow from '@/components/ui/SkeletonTableRow';

export default function AdminPage() {
const productSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2),
  brand: z.string().optional(),
  size: z.string().optional(),
  color: z.string().optional(),
  price: z.coerce.number().nonnegative(),
  description: z.string().optional(),
  category: z.string().default('sepatu'),
  imageUrl: z.string().url().or(z.literal('')),
  images: z.array(z.string().url()).optional(),
  buyUrl: z.string().url().optional(),
  status: z.enum(['Published','Draft','Sold']).default('Published'),
  stock: z.coerce.number().int().nonnegative().optional(),
});

type Product = z.infer<typeof productSchema>;

function CurrencyInput({ value, onChange }: { value?: number; onChange: (v: number) => void }) {
  const display = (value ?? 0).toLocaleString('id-ID');
  return (
    <input
      inputMode="numeric"
      value={display}
      onChange={(e) => {
        const raw = e.target.value.replace(/[^0-9]/g, '');
        onChange(Number(raw || '0'));
      }}
      placeholder="Harga (Rp)"
      className="input"
    />
  );
}
  // State utama halaman admin
  const [items, setItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [query, setQuery] = useState<string>('');
  const [saving, setSaving] = useState<boolean>(false);
  const [adding, setAdding] = useState<boolean>(false);
  const [addingSaving, setAddingSaving] = useState<boolean>(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [modalSaving, setModalSaving] = useState<boolean>(false);
  const [form, setForm] = useState<Product>({ name: '', price: 0, imageUrl: '', category: 'sepatu', status: 'Published' } as Product);
  const [formAdd, setFormAdd] = useState<Product>({ name: '', price: 0, imageUrl: '', category: 'sepatu', status: 'Published', stock: 1 } as Product);
  const [sortBy, setSortBy] = useState<keyof Product>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const prevFocusRef = useRef<HTMLElement | null>(null);
  const formSectionRef = useRef<HTMLElement | null>(null);

  // Mobile quick filters
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const [fltStatus, setFltStatus] = useState<'' | 'Published' | 'Draft'>('');
  const [fltSize, setFltSize] = useState('');
  const [fltMin, setFltMin] = useState<number | ''>('');
  const [fltMax, setFltMax] = useState<number | ''>('');

  // Buka modal Tambah (dipanggil oleh FAB/layout/event)
  const openAddModal = useCallback(() => {
    setAdding(true);
    try {
      (window as any).__adminAddOpened = true;
      window.dispatchEvent(new CustomEvent('admin:add:opened'));
    } catch {}
  }, []);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return items.filter((p) => {
      const textOk = `${p.name} ${p.brand ?? ''} ${p.description ?? ''}`.toLowerCase().includes(q);
      if (!textOk) return false;
      if (fltStatus && (p.status || 'Published') !== fltStatus) return false;
      if (fltSize && String(p.size || '').toLowerCase() !== fltSize.toLowerCase()) return false;
      if (fltMin !== '' || fltMax !== '') {
        const min = typeof fltMin === 'number' ? fltMin : 0;
        const max = typeof fltMax === 'number' ? fltMax : Number.POSITIVE_INFINITY;
        const price = Number(p.price || 0);
        if (!Number.isFinite(price)) return false;
        if (price < min || price > max) return false;
      }
      return true;
    });
  }, [items, query, fltStatus, fltSize, fltMin, fltMax]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1;
      if (sortBy === 'price') {
        return ((Number(a.price) || 0) - (Number(b.price) || 0)) * dir;
      }
      const av = String(a[sortBy] ?? '').toLowerCase();
      const bv = String(b[sortBy] ?? '').toLowerCase();
      if (av < bv) return -1 * dir;
      if (av > bv) return 1 * dir;
      return 0;
    });
    return arr;
  }, [filtered, sortBy, sortDir]);

  const total = sorted.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paginated = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sorted.slice(start, start + pageSize);
  }, [sorted, currentPage, pageSize]);

  // KPI ringkas
  const kpi = useMemo(() => {
    const published = items.filter(p => (p.status || 'Published') === 'Published').length;
    const draft = items.filter(p => (p.status || 'Published') === 'Draft').length;
    const count = items.length;
    const totalValue = items.reduce((acc, p) => acc + (Number(p.price || 0) || 0), 0);
    return { published, draft, count, totalValue };
  }, [items]);

  // Analitik ringkas
  const analytics = useMemo(() => {
    // Helper: key bulan YYYY-MM
    const monthKey = (iso?: string) => {
      if (!iso) return 'Unknown';
      const d = new Date(iso);
      if (isNaN(d.getTime())) return 'Unknown';
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      return `${y}-${m}`;
    };
    // Tren penambahan barang per bulan (berdasar createdAt)
    const byMonth: Record<string, { count: number; value: number } > = {};
    for (const p of items) {
      const k = monthKey((p as any).createdAt);
      if (!byMonth[k]) byMonth[k] = { count: 0, value: 0 };
      byMonth[k].count += 1;
      byMonth[k].value += Number(p.price || 0) || 0;
    }
    const months = Object.keys(byMonth).filter(k=>k!=='Unknown').sort();
    const lastMonths = months.slice(-6); // tampilkan 6 bulan terakhir
    const seriesAdd = lastMonths.map(k => ({ label: k, count: byMonth[k].count }));
    const seriesValue = lastMonths.map(k => ({ label: k, value: byMonth[k].value }));

    // Terlaris: dari data status Sold
    const sold = items.filter(p => (p.status||'').toLowerCase() === 'sold');
    const brandCount: Record<string, number> = {};
    const sizeCount: Record<string, number> = {};
    for (const p of sold) {
      const b = (p.brand || 'Unknown').trim() || 'Unknown';
      const s = (p.size || 'Unknown').trim() || 'Unknown';
      brandCount[b] = (brandCount[b] || 0) + 1;
      sizeCount[s] = (sizeCount[s] || 0) + 1;
    }
    const topBrand = Object.entries(brandCount).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([label, count])=>({ label, count }));
    const topSize = Object.entries(sizeCount).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([label, count])=>({ label, count }));

    return { seriesAdd, seriesValue, topBrand, topSize };
  }, [items]);

  async function refresh() {
    setLoading(true);
    const res = await fetch('/api/admin/products');
    const data = await res.json();
    setItems(data.products || []);
    setLoading(false);
  }

  useEffect(() => {
    refresh();
  }, [openAddModal]);

  // Auto-open Add modal jika ada flag dari sidebar (navigasi dari halaman lain)
  useEffect(() => {
    try {
      const v = typeof window !== 'undefined' ? localStorage.getItem('admin:add:open') : null;
      if (v === '1') {
        localStorage.removeItem('admin:add:open');
        openAddModal();
      }
    } catch {}
  }, [openAddModal]);

  // Nonaktifkan auto-open dari hash agar modal tidak terbuka tanpa klik
  // (Dibiarkan kosong secara sengaja)
  useEffect(() => {}, []);

  // Nonaktifkan auto-open dari query agar modal tidak terbuka tanpa klik
  useEffect(() => {}, []);

  // Kunci scroll body saat modal Tambah terbuka dan rapikan scrollbar modal
  useEffect(() => {
    if (!adding) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [adding]);

  // Buka modal Tambah via event dari sidebar
  useEffect(() => {
    const onOpenAdd = () => openAddModal();
    if (typeof window !== 'undefined') window.addEventListener('admin:add:open', onOpenAdd);
    return () => { if (typeof window !== 'undefined') window.removeEventListener('admin:add:open', onOpenAdd); };
  }, [openAddModal]);

  // Ekspos fungsi global agar FAB bisa memanggil langsung tanpa event/hash
  useEffect(() => {
    if (typeof window === 'undefined') return;
    (window as any).openAdminAdd = () => openAddModal();
    return () => { try { delete (window as any).openAdminAdd; } catch {} };
  }, [openAddModal]);

  // Auto refresh ketika Chatbox admin menambahkan produk
  useEffect(() => {
    function onAdminRefresh() {
      refresh();
    }
    if (typeof window !== 'undefined') {
      window.addEventListener('admin:products:refresh', onAdminRefresh as EventListener);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('admin:products:refresh', onAdminRefresh as EventListener);
      }
    };
  }, []);

  // Modal: ESC to close, click outside handled on overlay; lock scroll; focus trap; restore focus
  useEffect(() => {
    if (!editing) return;
    prevFocusRef.current = (document.activeElement as HTMLElement) || null;
    document.body.classList.add('overflow-hidden');

    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        const submitBtn = contentRef.current?.querySelector<HTMLButtonElement>('button[type="submit"]');
        submitBtn?.click();
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setEditing(null);
        return;
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.classList.remove('overflow-hidden');
      prevFocusRef.current?.focus?.();
    };
  }, [editing]);

  async function submitForm(values: AdminProductFormValues) {
    const parsed = productSchema.safeParse(values);
    if (!parsed.success) { toast(parsed.error.issues[0].message, 'error'); return; }
    setSaving(true);
    const method = values.id ? 'PUT' : 'POST';
    const res = await fetch('/api/admin/products', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(values) });
    if (!res.ok) {
      setSaving(false);
      return toast('Gagal menyimpan', 'error');
    }
    setForm({ name: '', price: 0, imageUrl: '', category: 'sepatu', status: 'Published' } as Product);
    await refresh();
    setSaving(false);
    toast('Tersimpan', 'success');
  }

  async function edit(p: Product) {
    setEditing(p);
  }

  async function submitAdd(values: AdminProductFormValues) {
    const parsed = productSchema.safeParse(values);
    if (!parsed.success) { toast(parsed.error.issues[0].message, 'error'); return; }
    setAddingSaving(true);
    const res = await fetch('/api/admin/products', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(values) });
    if (!res.ok) {
      setAddingSaving(false);
      return toast('Gagal menambah produk', 'error');
    }
    setAddingSaving(false);
    setAdding(false);
    setFormAdd({ name: '', price: 0, imageUrl: '', category: 'sepatu', status: 'Published', stock: 1 } as any);
    await refresh();
    toast('Produk ditambahkan', 'success');
  }

  async function submitEdit(values: AdminProductFormValues) {
    const parsed = productSchema.safeParse(values);
    if (!parsed.success) { toast(parsed.error.issues[0].message, 'error'); return; }
    setModalSaving(true);
    const res = await fetch('/api/admin/products', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(values) });
    if (!res.ok) {
      setModalSaving(false);
      return toast('Gagal menyimpan', 'error');
    }
    setModalSaving(false);
    setEditing(null);
    await refresh();
    toast('Perubahan tersimpan', 'success');
  }

  async function remove(id?: string) {
    if (!id) return;
    const ok = await openConfirm(`Hapus produk ${id}?`);
    if (!ok) return;
    const res = await fetch(`/api/admin/products?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
    if (!res.ok) return toast('Gagal menghapus', 'error');
    await refresh();
    toast('Produk dihapus', 'success');
  }

  // removed inline update helper; edit flows via modal form

  function toggleSort(key: keyof Product) {
    if (sortBy === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortBy(key); setSortDir('asc'); }
  }

  function toast(message: string, type: 'success'|'error'|'info' = 'info') {
    const color = type === 'success' ? 'bg-green-500' : type === 'error' ? 'bg-rose-500' : 'bg-slate-700';
    const el = document.createElement('div');
    el.className = `fixed bottom-6 left-1/2 -translate-x-1/2 ${color} text-white px-4 py-2 rounded-xl shadow z-[9999]`;
    el.textContent = message;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 2200);
  }

  function openConfirm(message: string): Promise<boolean> {
    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.className = 'fixed inset-0 bg-black/30 flex items-center justify-center z-[9998]';
      const modal = document.createElement('div');
      modal.className = 'bg-white rounded-2xl shadow-xl border border-gray-200 p-4 w-[360px]';
      modal.innerHTML = `
        <p class="text-slate-800">${message}</p>
        <div class="mt-4 flex justify-end gap-2">
          <button id="btn-cancel" class="rounded-xl border border-gray-300 px-3 py-1.5">Batal</button>
          <button id="btn-ok" class="rounded-xl bg-rose-500 text-white px-3 py-1.5">Hapus</button>
        </div>
      `;
      overlay.appendChild(modal);
      document.body.appendChild(overlay);
      function cleanup(v: boolean) {
        overlay.remove();
        resolve(v);
      }
      (modal.querySelector('#btn-cancel') as HTMLButtonElement).onclick = () => cleanup(false);
      (modal.querySelector('#btn-ok') as HTMLButtonElement).onclick = () => cleanup(true);
    });
  }

  return (
    <main className="px-0 py-0">
      <div className="grid grid-cols-1 gap-4 sm:gap-6 mt-4 sm:mt-6">
        <section className="col-span-1">
          {/* KPI Ringkas */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
            <div className="card p-3">
              <p className="text-xs text-slate-500">Published</p>
              <p className="text-xl font-semibold text-slate-900">{kpi.published}</p>
            </div>
            <div className="card p-3">
              <p className="text-xs text-slate-500">Draft</p>
              <p className="text-xl font-semibold text-slate-900">{kpi.draft}</p>
            </div>
            <div className="card p-3">
              <p className="text-xs text-slate-500">Total Produk</p>
              <p className="text-xl font-semibold text-slate-900">{kpi.count}</p>
            </div>
            <div className="card p-3">
              <p className="text-xs text-slate-500">Total Nilai</p>
              <p className="text-xl font-semibold text-slate-900">Rp {kpi.totalValue.toLocaleString('id-ID')}</p>
            </div>
          </div>
          <div className="flex items-center justify-between mb-3">
            <input value={query} onChange={(e)=>setQuery(e.target.value)} placeholder="Cari produk..." className="input w-full sm:w-64" />
          </div>
          {/* Quick Filters Desktop */}
          <div className="hidden md:flex items-center flex-wrap gap-2 mb-4">
            <div className="flex items-center gap-1">
              <span className="text-xs text-slate-500 mr-1">Status:</span>
              {['','Published','Draft','Sold'].map(s => (
                <button
                  key={`st-${s||'all'}`}
                  onClick={()=>{ setFltStatus(s as any); setPage(1); }}
                  className={`px-3 py-1.5 rounded-full text-xs border ${fltStatus===s ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 text-slate-700 hover:bg-gray-50'}`}
                >{s || 'Semua'}</button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">Ukuran:</span>
              <input value={fltSize} onChange={(e)=>{ setFltSize(e.target.value); setPage(1); }} placeholder="mis. 42" className="rounded-full border border-gray-300 px-3 py-1.5 text-xs" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">Harga:</span>
              <input value={fltMin} onChange={(e)=>{ setFltMin(e.target.value ? Number(e.target.value.replace(/[^0-9]/g,'')||'0') : ''); setPage(1); }} placeholder="min" inputMode="numeric" className="w-20 rounded-full border border-gray-300 px-3 py-1.5 text-xs" />
              <span className="text-xs">-</span>
              <input value={fltMax} onChange={(e)=>{ setFltMax(e.target.value ? Number(e.target.value.replace(/[^0-9]/g,'')||'0') : ''); setPage(1); }} placeholder="max" inputMode="numeric" className="w-24 rounded-full border border-gray-300 px-3 py-1.5 text-xs" />
            </div>
            <button
              className="ml-auto inline-flex items-center gap-2 rounded-full border border-slate-300 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 active:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300"
              onClick={refresh}
              title="Muat ulang daftar"
            >
              <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 12a8 8 0 1 1-2.343-5.657"/>
                <path d="M20 4v6h-6"/>
              </svg>
              <span>Refresh</span>
            </button>
          </div>

          
          {/* Mobile list (cards) */}
          <div className="md:hidden space-y-3">
            {loading ? (
              <div className="card p-3 animate-pulse">
                <div className="h-5 w-40 bg-gray-200 rounded" />
                <div className="mt-2 h-3 w-24 bg-gray-200 rounded" />
                <div className="mt-2 h-3 w-32 bg-gray-200 rounded" />
              </div>
            ) : paginated.length === 0 ? (
              <div className="card p-4 text-sm text-slate-600">Tidak ada produk.</div>
            ) : (
              paginated.map((p) => (
                <div key={p.id} className="card p-3 flex gap-3">
                  {p.imageUrl ? (
                    <div className="relative w-20 h-20 rounded-lg overflow-hidden bg-gray-100 shrink-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" />
                    </div>
                  ) : null}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold text-slate-900 truncate">{p.name}</p>
                      <span className={`shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${((p.status || 'Published') === 'Published') ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>{p.status || 'Published'}</span>
                    </div>
                    <p className="text-xs text-slate-600 mt-0.5 truncate">{p.brand || '-'}</p>
                    <div className="mt-2 flex items-center justify-between text-sm">
                      <span className="text-slate-700">Uk: {p.size || '-'}</span>
                      <span className="font-semibold">{`Rp ${Number(p.price || 0).toLocaleString('id-ID')}`}</span>
                    </div>
                    {typeof p.stock === 'number' ? (
                      <div className="mt-1 text-xs">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full ${p.stock>0 ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'}`}>
                          {p.stock>0 ? `Stok ${p.stock}` : 'Habis'}
                        </span>
                      </div>
                    ) : null}
                    <div className="mt-3 flex items-center gap-2">
                      <button
                        className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 active:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300"
                        onClick={()=>edit(p)}
                        aria-label={`Edit produk ${p.id}`}
                      >
                        Edit
                      </button>
                      <button
                        className="inline-flex items-center gap-2 rounded-lg border border-rose-600 px-3 py-1.5 text-sm bg-rose-600 text-white hover:bg-rose-700 active:bg-rose-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-300"
                        onClick={()=>remove(p.id)}
                        aria-label={`Hapus produk ${p.id}`}
                      >
                        Hapus
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto card">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left">ID</th>
                  <th className="px-3 py-2 text-left">Gambar</th>
                  <th className="px-3 py-2 text-left cursor-pointer" onClick={() => toggleSort('name')}>Nama {sortBy==='name' ? (sortDir==='asc'?'↑':'↓') : ''}</th>
                  <th className="px-3 py-2 text-left cursor-pointer" onClick={() => toggleSort('brand')}>Brand {sortBy==='brand' ? (sortDir==='asc'?'↑':'↓') : ''}</th>
                  <th className="px-3 py-2 text-left cursor-pointer" onClick={() => toggleSort('size')}>Ukuran {sortBy==='size' ? (sortDir==='asc'?'↑':'↓') : ''}</th>
                  <th className="px-3 py-2 text-left cursor-pointer" onClick={() => toggleSort('price')}>Harga {sortBy==='price' ? (sortDir==='asc'?'↑':'↓') : ''}</th>
                  <th className="px-3 py-2 text-left">Stok</th>
                  <th className="px-3 py-2 text-left cursor-pointer" onClick={() => toggleSort('status')}>Status {sortBy==='status' ? (sortDir==='asc'?'↑':'↓') : ''}</th>
                  <th className="px-3 py-2 text-left">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <>
                    {Array.from({ length: 6 }).map((_, i) => (
                      <SkeletonTableRow
                        key={`sk-${i}`}
                        columns={["text","image","text","text","text","text","badge","actions"]}
                      />
                    ))}
                  </>
                ) : (
                  paginated.map((p) => (
                    <tr key={p.id} className="border-t">
                      <td className="px-3 py-2">{p.id}</td>
                      <td className="px-3 py-2">
                        {p.imageUrl ? (
                          <div className="relative w-12 h-12 rounded-md overflow-hidden bg-gray-100">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" />
                          </div>
                        ) : null}
                      </td>
                      <td className="px-3 py-2">{p.name}</td>
                      <td className="px-3 py-2">{p.brand}</td>
                      <td className="px-3 py-2">{p.size || '-'}</td>
                      <td className="px-3 py-2">{`Rp ${Number(p.price || 0).toLocaleString('id-ID')}`}</td>
                      <td className="px-3 py-2">
                        {typeof p.stock === 'number' ? (
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs ${p.stock>0 ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'}`}>
                            {p.stock>0 ? `Stok ${p.stock}` : 'Habis'}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-500">-</span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${((p.status || 'Published') === 'Published') ? 'bg-green-100 text-green-700' : (p.status==='Sold' ? 'bg-rose-100 text-rose-700' : 'bg-gray-100 text-gray-700')}`}>
                          {p.status || 'Published'}
                        </span>
                      </td>
                      <td className="px-3 py-2 space-x-2">
                        <button
                          className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 active:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300"
                          title="Edit produk"
                          aria-label={`Edit produk ${p.id}`}
                          onClick={()=>edit(p)}
                        >
                          <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 20h9"/>
                            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/>
                          </svg>
                          <span>Edit</span>
                        </button>
                        <button
                          className="inline-flex items-center gap-2 rounded-lg border border-rose-600 px-3 py-1.5 text-sm bg-rose-600 text-white hover:bg-rose-700 active:bg-rose-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-300"
                          onClick={()=>remove(p.id)}
                          title="Hapus produk"
                          aria-label={`Hapus produk ${p.id}`}
                        >
                          <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M3 6h18"/>
                            <path d="M8 6V4h8v2"/>
                            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                            <path d="M10 11v6M14 11v6"/>
                          </svg>
                          <span>Hapus</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-3 flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <button disabled={currentPage<=1} onClick={()=>setPage((p)=>Math.max(1,p-1))} className="px-3 py-1 rounded border disabled:opacity-50">Prev</button>
              <span>Hal {currentPage} dari {totalPages}</span>
              <button disabled={currentPage>=totalPages} onClick={()=>setPage((p)=>Math.min(totalPages,p+1))} className="px-3 py-1 rounded border disabled:opacity-50">Next</button>
            </div>
            <div className="flex items-center gap-2">
              <span>Tampil</span>
              <select value={pageSize} onChange={(e)=>{setPageSize(Number(e.target.value)); setPage(1);}} className="rounded border px-2 py-1">
                {[10,20,50].map(n=> <option key={n} value={n}>{n}</option>)}
              </select>
              <span>dari {total} produk</span>
            </div>
          </div>
        </section>
      </div>

      {adding ? (
        <div 
          ref={overlayRef}
          onClick={(e) => {
            if (e.target === overlayRef.current && !addingSaving) {
              setAdding(false);
            }
          }}
          className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fadeIn p-3"
        >
          <div
            ref={contentRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-title"
            className="relative bg-white w-full max-w-2xl mx-0 sm:mx-4 rounded-2xl shadow-xl border border-gray-200 max-h-[85vh] sm:max-h-[90vh] overflow-hidden animate-scaleIn"
          >
            <div className="px-4 py-3 border-b font-semibold flex items-center justify-between">
              <h2 id="add-title">Tambah Produk</h2>
              <button
                type="button"
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                onClick={() => !addingSaving && setAdding(false)}
                aria-label="Tutup modal"
                disabled={addingSaving}
              >
                ✕
              </button>
            </div>
            <div className="p-3 sm:p-4 pb-20 flex-1 overflow-y-auto modal-scroll">
              <AdminProductForm
                value={formAdd as unknown as AdminProductFormValues}
                onChange={(v)=> setFormAdd(v as unknown as Product)}
                onSubmit={submitAdd}
                saving={addingSaving}
              />
            </div>
          </div>
        </div>
      ) : null}

      {editing ? (
        <div 
          ref={overlayRef} 
          onClick={(e) => { 
            if (e.target === overlayRef.current && !modalSaving) {
              setEditing(null); 
            }
          }} 
          className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fadeIn p-3"
        >
          <div 
            ref={contentRef} 
            role="dialog" 
            aria-modal="true" 
            aria-labelledby="edit-title" 
            className="relative bg-white w-full max-w-2xl mx-0 sm:mx-4 rounded-2xl shadow-xl border border-gray-200 max-h-[85vh] sm:max-h-[90vh] overflow-hidden animate-scaleIn"
          >
            <div className="px-4 py-3 border-b font-semibold flex items-center justify-between">
              <h2 id="edit-title">Edit Produk</h2>
              <button 
                type="button" 
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors" 
                onClick={() => !modalSaving && setEditing(null)} 
                aria-label="Tutup modal" 
                disabled={modalSaving}
              >
                ✕
              </button>
            </div>
            <div className="p-3 sm:p-4 pb-20 flex-1 overflow-y-auto modal-scroll">
              <AdminProductForm
                value={editing as unknown as AdminProductFormValues}
                onSubmit={submitEdit}
                saving={modalSaving}
              />
              <div className="mt-3 flex justify-end gap-2">
                <button 
                  type="button" 
                  className="px-3 py-2 sm:px-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50" 
                  onClick={() => !modalSaving && setEditing(null)} 
                  disabled={modalSaving}
                >
                  Batal
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <style jsx global>{`
        .input { @apply rounded-xl border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300; }
        .btn { @apply inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300; }
        .btn-primary { @apply bg-blue-600 text-white border-blue-600 hover:bg-blue-700 hover:border-blue-700 active:bg-blue-800; }
        .btn-ghost { @apply border-slate-300 text-slate-700 hover:bg-slate-50 active:bg-slate-100; }
        .btn-danger { @apply border-rose-500 text-rose-600 hover:bg-rose-50 active:bg-rose-100; }
        .btn-danger-solid { @apply bg-rose-600 text-white border-rose-600 hover:bg-rose-700 hover:border-blue-700 active:bg-rose-800; }
        button:disabled, .btn[disabled] { @apply opacity-50 cursor-not-allowed pointer-events-none; }
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes scaleIn { from { opacity: 0; transform: translateY(8px) scale(0.98) } to { opacity: 1; transform: translateY(0) scale(1) } }
        .animate-fadeIn { animation: fadeIn .15s ease-out; }
        .animate-scaleIn { animation: scaleIn .18s ease-out; }
        /* Scrollbar halus untuk area modal */
        .modal-scroll::-webkit-scrollbar { width: 8px; }
        .modal-scroll::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 8px; }
        .modal-scroll::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
      `}</style>
    </main>
  );
}