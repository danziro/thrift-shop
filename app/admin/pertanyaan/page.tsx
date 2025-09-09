"use client";

import { useEffect, useMemo, useState } from "react";

type QueryLogItem = { time: string; text: string; userAgent?: string; referer?: string };

export default function AdminPertanyaanPage() {
  const [items, setItems] = useState<QueryLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [q, setQ] = useState('');
  const [range, setRange] = useState<'all' | 'today' | '7d' | '30d'>('all');
  const [from, setFrom] = useState<string>(''); // yyyy-mm-dd
  const [to, setTo] = useState<string>('');   // yyyy-mm-dd
  const [openIdx, setOpenIdx] = useState<Record<string, boolean>>({});

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/queries', { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Gagal memuat log');
      setItems(Array.isArray(data.logs) ? data.logs : []);
    } catch (e: any) {
      setError(e?.message || 'Gagal memuat');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    let list = items;
    // Quick date filters
    if (range !== 'all') {
      const now = new Date();
      let start = new Date(0);
      if (range === 'today') {
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      } else if (range === '7d') {
        start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      } else if (range === '30d') {
        start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      }
      list = list.filter(it => {
        const d = new Date(it.time);
        return !isNaN(d.getTime()) && d >= start && d <= now;
      });
    }
    // Manual date range
    if (from || to) {
      const start = from ? new Date(from + 'T00:00:00') : new Date(0);
      const end = to ? new Date(to + 'T23:59:59') : new Date();
      list = list.filter(it => {
        const d = new Date(it.time);
        return !isNaN(d.getTime()) && d >= start && d <= end;
      });
    }
    // Text filter
    const t = q.trim().toLowerCase();
    if (t) {
      list = list.filter(it =>
        (it.text || '').toLowerCase().includes(t) ||
        (it.userAgent || '').toLowerCase().includes(t) ||
        (it.referer || '').toLowerCase().includes(t)
      );
    }
    return list;
  }, [items, q, range, from, to]);

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paginated = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, currentPage, pageSize]);

  return (
    <main className="px-0 py-0">
      <div className="grid grid-cols-1 gap-4 sm:gap-6 mt-4 sm:mt-6">
        <section className="col-span-1">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-lg font-semibold text-slate-900">Pertanyaan Pelanggan</h1>
            <button
              onClick={load}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-blue-300"
            >
              <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 12a8 8 0 1 1-2.343-5.657"/>
                <path d="M20 4v6h-6"/>
              </svg>
              <span>Refresh</span>
            </button>
          </div>

          <div className="mb-3 flex items-center gap-2 flex-wrap">
            <input value={q} onChange={(e)=>{ setQ(e.target.value); setPage(1); }} placeholder="Cari teks/UA/referer..." className="rounded-xl border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 w-full sm:w-80" />
            <div className="flex items-center gap-1 text-xs">
              <span className="text-slate-500 mr-1">Rentang cepat:</span>
              {(['all','today','7d','30d'] as const).map(r => (
                <button key={r} onClick={()=>{ setRange(r); setPage(1); }} className={`px-2.5 py-1 rounded-full border ${range===r ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 text-slate-700 hover:bg-gray-50'}`}>{r==='all'?'Semua':r==='today'?'Hari ini':r==='7d'?'7 hari':'30 hari'}</button>
              ))}
            </div>
            <div className="flex items-center gap-1 text-xs">
              <span className="text-slate-500 mr-1">Dari</span>
              <input type="date" value={from} onChange={(e)=>{ setFrom(e.target.value); setPage(1); }} className="rounded border border-gray-300 px-2 py-1" />
              <span className="text-slate-500 mx-1">s.d.</span>
              <input type="date" value={to} onChange={(e)=>{ setTo(e.target.value); setPage(1); }} className="rounded border border-gray-300 px-2 py-1" />
            </div>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-2">
            {loading ? (
              <div className="card p-3 text-slate-500">Memuat…</div>
            ) : error ? (
              <div className="card p-3 text-rose-600">{error}</div>
            ) : paginated.length === 0 ? (
              <div className="card p-3 text-slate-500">Tidak ada data.</div>
            ) : (
              paginated.map((it, idx) => {
                const key = `${it.time}-${idx}`;
                const open = !!openIdx[key];
                return (
                  <div key={key} className="card p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs text-slate-500">{new Date(it.time).toLocaleString('id-ID')}</p>
                        <p className="mt-1 text-sm text-slate-900 whitespace-pre-wrap break-words">{it.text}</p>
                      </div>
                      <button
                        type="button"
                        className="shrink-0 px-2 py-1 rounded-lg border text-xs text-slate-700 hover:bg-gray-50"
                        onClick={() => setOpenIdx((m) => ({ ...m, [key]: !open }))}
                        aria-expanded={open}
                        aria-controls={`detail-${idx}`}
                      >
                        {open ? 'Tutup' : 'Detail'}
                      </button>
                    </div>
                    {open && (
                      <div id={`detail-${idx}`} className="mt-2 rounded-lg bg-slate-50 p-2 text-xs">
                        <div className="text-slate-600"><span className="font-medium">User Agent:</span> {it.userAgent || '-'}</div>
                        <div className="mt-1">
                          <span className="font-medium text-slate-600">Referer:</span> {it.referer ? (
                            <a href={it.referer} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline break-words">{it.referer}</a>
                          ) : (
                            <span className="text-slate-500">-</span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto card">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left">Waktu</th>
                  <th className="px-3 py-2 text-left">Teks</th>
                  <th className="px-3 py-2 text-left">User Agent</th>
                  <th className="px-3 py-2 text-left">Referer</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td className="px-3 py-3 text-slate-500" colSpan={4}>Memuat…</td></tr>
                ) : error ? (
                  <tr><td className="px-3 py-3 text-rose-600" colSpan={4}>{error}</td></tr>
                ) : paginated.length === 0 ? (
                  <tr><td className="px-3 py-3 text-slate-500" colSpan={4}>Tidak ada data.</td></tr>
                ) : (
                  paginated.map((it, idx) => (
                    <tr key={`${it.time}-${idx}`} className="border-t align-top">
                      <td className="px-3 py-2 whitespace-nowrap text-slate-600">{new Date(it.time).toLocaleString('id-ID')}</td>
                      <td className="px-3 py-2">
                        <div className="max-w-[560px] whitespace-pre-wrap break-words">{it.text}</div>
                      </td>
                      <td className="px-3 py-2 text-xs text-slate-600">
                        <div className="max-w-[360px] whitespace-pre-wrap break-words">{it.userAgent || '-'}</div>
                      </td>
                      <td className="px-3 py-2 text-xs">
                        {it.referer ? <a href={it.referer} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline break-words max-w-[360px] inline-block">{it.referer}</a> : <span className="text-slate-500">-</span>}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-3 flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <button disabled={currentPage<=1} onClick={()=>setPage(p=>Math.max(1,p-1))} className="px-3 py-1 rounded border disabled:opacity-50">Prev</button>
              <span>Hal {currentPage} dari {totalPages}</span>
              <button disabled={currentPage>=totalPages} onClick={()=>setPage(p=>Math.min(totalPages,p+1))} className="px-3 py-1 rounded border disabled:opacity-50">Next</button>
            </div>
            <div className="flex items-center gap-2">
              <span>Tampil</span>
              <select value={pageSize} onChange={(e)=>{ setPageSize(Number(e.target.value)); setPage(1); }} className="rounded border px-2 py-1">
                {[10,20,50].map(n => <option key={n} value={n}>{n}</option>)}
              </select>
              <span>dari {total} pertanyaan</span>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
