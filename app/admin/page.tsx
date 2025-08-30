"use client";

import { useEffect, useMemo, useRef, useState } from 'react';
import { z } from 'zod';
import { AdminProductForm, type AdminProductFormValues } from '@/components/admin/AdminProductForm';

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
  status: z.enum(['Published','Draft']).default('Published'),
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

export default function AdminPage() {
  const [items, setItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<Product>({ name: '', price: 0, imageUrl: '', category: 'sepatu', status: 'Published' } as Product);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [modalSaving, setModalSaving] = useState(false);
  const [query, setQuery] = useState('');
  const [sortBy, setSortBy] = useState<keyof Product>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const prevFocusRef = useRef<HTMLElement | null>(null);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return items.filter((p) => `${p.name} ${p.brand ?? ''} ${p.description ?? ''}`.toLowerCase().includes(q));
  }, [items, query]);

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

  async function refresh() {
    setLoading(true);
    const res = await fetch('/api/admin/products');
    const data = await res.json();
    setItems(data.products || []);
    setLoading(false);
  }

  useEffect(() => {
    refresh();
  }, []);

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
    <main className="mx-auto max-w-6xl px-6 py-8">
      <h1 className="text-2xl font-bold">Admin Produk</h1>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        <section className="lg:col-span-1 card p-4">
          <h2 className="font-semibold">{form.id ? 'Edit Produk' : 'Tambah Produk'}</h2>
          <div className="mt-3">
            <AdminProductForm
              value={form as unknown as AdminProductFormValues}
              onChange={(v)=> setForm(v as unknown as Product)}
              onSubmit={submitForm}
              saving={saving}
            />
          </div>
        </section>

        <section className="lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <input value={query} onChange={(e)=>setQuery(e.target.value)} placeholder="Cari produk..." className="input w-64" />
            <button
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 active:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300"
              onClick={refresh}
              title="Muat ulang daftar"
            >
              <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 12a8 8 0 1 1-2.343-5.657"/>
                <path d="M20 4v6h-6"/>
              </svg>
              <span>Refresh</span>
            </button>
          </div>
          <div className="overflow-x-auto card">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left">ID</th>
                  <th className="px-3 py-2 text-left">Gambar</th>
                  <th className="px-3 py-2 text-left cursor-pointer" onClick={() => toggleSort('name')}>Nama {sortBy==='name' ? (sortDir==='asc'?'↑':'↓') : ''}</th>
                  <th className="px-3 py-2 text-left cursor-pointer" onClick={() => toggleSort('brand')}>Brand {sortBy==='brand' ? (sortDir==='asc'?'↑':'↓') : ''}</th>
                  <th className="px-3 py-2 text-left cursor-pointer" onClick={() => toggleSort('size')}>Ukuran {sortBy==='size' ? (sortDir==='asc'?'↑':'↓') : ''}</th>
                  <th className="px-3 py-2 text-left cursor-pointer" onClick={() => toggleSort('price')}>Harga {sortBy==='price' ? (sortDir==='asc'?'↑':'↓') : ''}</th>
                  <th className="px-3 py-2 text-left cursor-pointer" onClick={() => toggleSort('status')}>Status {sortBy==='status' ? (sortDir==='asc'?'↑':'↓') : ''}</th>
                  <th className="px-3 py-2 text-left">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td className="px-3 py-4" colSpan={8}>Memuat...</td></tr>
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
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${((p.status || 'Published') === 'Published') ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                          {p.status || 'Published'}
                        </span>
                      </td>
                      <td className="px-3 py-2 space-x-2">
                        <button
                          className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 active:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300"
                          title="Edit produk"
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

      {editing ? (
<<<<<<< HEAD
        <div ref={overlayRef} onClick={(e)=>{ if (e.target === overlayRef.current) setEditing(null); }} className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fadeIn">
          <div ref={contentRef} role="dialog" aria-modal="true" aria-labelledby="edit-title" className="relative bg-white w-full max-w-2xl mx-4 rounded-2xl shadow-xl border border-gray-200 overflow-visible animate-scaleIn max-h-[90vh] flex flex-col">
            <div className="px-4 py-3 border-b font-semibold flex items-center justify-between shrink-0">
=======
        <div 
          ref={overlayRef} 
          onClick={(e) => { 
            if (e.target === overlayRef.current && !modalSaving) {
              setEditing(null); 
            }
          }} 
          className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fadeIn"
        >
          <div 
            ref={contentRef} 
            role="dialog" 
            aria-modal="true" 
            aria-labelledby="edit-title" 
            className="relative bg-white w-full max-w-2xl mx-4 rounded-2xl shadow-xl border border-gray-200 max-h-[90vh] overflow-y-auto animate-scaleIn"
          >
            <div className="px-4 py-3 border-b font-semibold flex items-center justify-between">
>>>>>>> 463868eaafd9583ba79b40f1ae08b8f6c09419bd
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
            <div className="p-4 flex-1 overflow-y-auto">
              <AdminProductForm
                value={editing as unknown as AdminProductFormValues}
<<<<<<< HEAD
=======
                onChange={(v) => !modalSaving && setEditing(v as unknown as Product)}
>>>>>>> 463868eaafd9583ba79b40f1ae08b8f6c09419bd
                onSubmit={submitEdit}
                saving={modalSaving}
              />
              <div className="mt-3 flex justify-end gap-2">
                <button 
                  type="button" 
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50" 
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
        .btn-danger-solid { @apply bg-rose-600 text-white border-rose-600 hover:bg-rose-700 hover:border-rose-700 active:bg-rose-800; }
        button:disabled, .btn[disabled] { @apply opacity-50 cursor-not-allowed pointer-events-none; }
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes scaleIn { from { opacity: 0; transform: translateY(8px) scale(0.98) } to { opacity: 1; transform: translateY(0) scale(1) } }
        .animate-fadeIn { animation: fadeIn .15s ease-out; }
        .animate-scaleIn { animation: scaleIn .18s ease-out; }
      `}</style>
    </main>
  );
}


