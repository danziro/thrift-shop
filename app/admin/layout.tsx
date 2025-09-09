"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { Metadata } from "next";
import Head from "next/head";
import { Menu, Home, MessageSquare, LogOut, Bell, PlusCircle, BarChart3 } from "lucide-react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const [notifCount, setNotifCount] = useState(0);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifLogs, setNotifLogs] = useState<Array<{ time: string; id: string; name: string; size?: string; price?: number; userAgent?: string }>>([]);

  // Set judul tab untuk admin
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const prev = document.title;
    if (pathname?.startsWith('/admin')) {
      document.title = 'Admin ThriftTu';
    }
    return () => { document.title = prev; };
  }, [pathname]);

  useEffect(() => {
    let timer: any;
    const load = async () => {
      try {
        const res = await fetch('/api/admin/analytics/cart-add', { cache: 'no-store' });
        const data = await res.json();
        const logs: Array<{ time: string }> = Array.isArray(data.logs) ? data.logs : [];
        let lastRead = 0;
        try { const v = localStorage.getItem('notif:lastReadAt'); if (v) lastRead = Date.parse(v); } catch {}
        const unread = logs.reduce((acc, l) => {
          const t = Date.parse(l.time || '');
          return acc + (isNaN(t) ? 0 : (t > lastRead ? 1 : 0));
        }, 0);
        setNotifCount(unread);
      } catch {}
    };
    load();
    timer = setInterval(load, 20000);
    return () => timer && clearInterval(timer);
  }, []);
  async function openNotif() {
    try {
      const res = await fetch('/api/admin/analytics/cart-add?limit=10', { cache: 'no-store' });
      const data = await res.json();
      const logs = Array.isArray(data.logs) ? data.logs.slice(0, 10) : [];
      setNotifLogs(logs);
      // Mark as read: set lastReadAt to newest log time
      const newest = logs[0]?.time || new Date().toISOString();
      try { localStorage.setItem('notif:lastReadAt', newest); } catch {}
      setNotifCount(0);
    } catch {}
    setNotifOpen(true);
  }

  function closeNotif() { setNotifOpen(false); }

  return (
    <div className="min-h-screen bg-gray-50 text-slate-800 flex">
      <Head>
        <title>ThriftTu Admin</title>
      </Head>
      {/* Sidebar */}
      <aside
        className={`${collapsed ? 'w-[64px]' : 'w-[220px]'} transition-all duration-200 border-r border-gray-200 bg-white sticky top-0 h-screen hidden md:flex flex-col`}
        aria-label="Admin sidebar"
      >
        <div className="h-14 flex items-center justify-between px-3 border-b border-gray-100">
          <button
            onClick={() => setCollapsed(v=>!v)}
            className="p-2 rounded-lg hover:bg-gray-100 focus-visible:ring-2 focus-visible:ring-blue-300"
            aria-label={collapsed ? 'Buka sidebar' : 'Tutup sidebar'}
            title="Toggle sidebar"
          >
            <Menu className="w-5 h-5" />
          </button>
          {/* Hapus label brand agar lebih clean */}
          {!collapsed && (<span aria-hidden className="sr-only">brand</span>)}

      {/** FAB dipindah ke luar aside agar benar-benar mengambang secara global */}
        </div>
        <nav className="p-2 mt-1 space-y-1">
          <a href="/admin" className={`flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 ${pathname==="/admin" ? 'bg-blue-50 text-blue-700' : 'text-slate-700'}`}>
            <Home className="w-4 h-4" />
            {!collapsed && <span>Inventaris</span>}
          </a>
          {/** Hapus item 'Tambah barang' dari sidebar */}
          <a href="/admin/analitik" className={`flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 ${pathname==="/admin/analitik" ? 'bg-blue-50 text-blue-700' : 'text-slate-700'}`}>
            <BarChart3 className="w-4 h-4" />
            {!collapsed && <span>Analitik</span>}
          </a>
          <a href="/admin/pertanyaan" className={`flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 ${pathname==="/admin/pertanyaan" ? 'bg-blue-50 text-blue-700' : 'text-slate-700'}`}>
            <MessageSquare className="w-4 h-4" />
            {!collapsed && <span>Pertanyaan</span>}
          </a>
        </nav>
        <div className="mt-auto p-2 border-t border-gray-100">
          <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 text-slate-700" title="Logout">
            <LogOut className="w-4 h-4" />
            {!collapsed && <span>Keluar</span>}
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Topbar (sticky) */}
        <div className="sticky top-0 z-20 bg-white border-b border-gray-200">
          <div className="h-14 flex items-center justify-between px-3 sm:px-4">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setMobileOpen(true)}
                className="md:hidden p-2 rounded-lg hover:bg-gray-100 focus-visible:ring-2 focus-visible:ring-blue-300"
                aria-label="Toggle sidebar"
              >
                <Menu className="w-5 h-5" />
              </button>
              <span className="font-semibold text-slate-900">Halaman Admin</span>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={openNotif} className="relative p-2 rounded-lg hover:bg-gray-100 focus-visible:ring-2 focus-visible:ring-blue-300" aria-label="Notifikasi">
                <Bell className="w-5 h-5 text-slate-600" />
                {notifCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-rose-600 text-white text-[10px] leading-none px-1.5 py-1 rounded-full">{notifCount}</span>
                )}
              </button>
              <div className="w-8 h-8 rounded-full bg-blue-600 text-white grid place-items-center text-xs font-semibold">AD</div>
            </div>
          </div>
        </div>

        <div className="p-3 sm:p-4 lg:p-6">
          {children}
        </div>
      </div>

      {/* Mobile Drawer Sidebar */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50" role="dialog" aria-modal>
          <div className="absolute inset-0 bg-black/40" onClick={()=>setMobileOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-[260px] bg-white border-r border-gray-200 shadow-xl p-3 flex flex-col">
            <div className="flex items-center justify-between h-12">
              <span className="font-semibold">Menu</span>
              <button className="p-2 rounded-lg hover:bg-gray-100" onClick={()=>setMobileOpen(false)} aria-label="Tutup menu">
                ✕
              </button>
            </div>
            <nav className="mt-2 space-y-1">
              <a href="/admin" onClick={()=>setMobileOpen(false)} className={`flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 ${pathname==="/admin" ? 'bg-blue-50 text-blue-700' : 'text-slate-700'}`}><Home className="w-4 h-4" /><span>Inventaris</span></a>
              {/** Hapus item 'Tambah barang' dari drawer mobile */}
              <a href="/admin/analitik" onClick={()=>setMobileOpen(false)} className={`flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 ${pathname==="/admin/analitik" ? 'bg-blue-50 text-blue-700' : 'text-slate-700'}`}><BarChart3 className="w-4 h-4" /><span>Analitik</span></a>
              <a href="/admin/pertanyaan" onClick={()=>setMobileOpen(false)} className={`flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 ${pathname==="/admin/pertanyaan" ? 'bg-blue-50 text-blue-700' : 'text-slate-700'}`}><MessageSquare className="w-4 h-4" /><span>Pertanyaan</span></a>
            </nav>
            <div className="mt-auto pt-2 border-t border-gray-100">
              <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 text-slate-700"><LogOut className="w-4 h-4" /><span>Keluar</span></button>
            </div>
          </div>
        </div>
      )}

      {/* Notif Drawer */}
      {notifOpen && (
        <div className="fixed inset-0 z-40" role="dialog" aria-modal>
          <div className="absolute inset-0 bg-black/40" onClick={closeNotif} />
          <aside className="absolute top-0 right-0 h-full w-[90vw] max-w-sm bg-white border-l border-gray-200 shadow-xl flex flex-col">
            <div className="h-14 px-4 flex items-center justify-between border-b">
              <h3 className="font-semibold text-slate-900">Aktivitas Keranjang</h3>
              <button onClick={closeNotif} className="p-2 rounded-lg hover:bg-gray-100" aria-label="Tutup">✕</button>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {notifLogs.length === 0 ? (
                <div className="text-sm text-slate-500">Belum ada aktivitas.</div>
              ) : (
                notifLogs.map((l, idx) => (
                  <div key={`${l.time}-${idx}`} className="border rounded-lg p-2">
                    <div className="text-xs text-slate-500">{new Date(l.time).toLocaleString('id-ID')}</div>
                    <div className="text-sm font-medium text-slate-900 mt-0.5">{l.name} {l.size ? `(Uk. ${l.size})` : ''}</div>
                    <div className="text-xs text-slate-600">ID: {l.id}</div>
                    {typeof l.price === 'number' ? <div className="text-xs text-blue-700">Rp {Number(l.price||0).toLocaleString('id-ID')}</div> : null}
                  </div>
                ))
              )}
            </div>
          </aside>
        </div>
      )}

      {/* FAB Tambah Produk (global), hanya muncul di halaman Inventaris */}
      {pathname === '/admin' && (
        <div className="fixed bottom-5 right-5 md:bottom-6 md:right-6 z-[9999] pointer-events-none">
          <button
            onClick={() => {
              try {
                const w: any = window as any;
                if (typeof w.openAdminAdd === 'function') w.openAdminAdd();
                window.dispatchEvent(new CustomEvent('admin:add:open'));
              } catch {}
            }}
            type="button"
            className="pointer-events-auto w-12 h-12 rounded-full bg-slate-800 text-white shadow-lg hover:bg-slate-900 active:bg-black focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-300"
            aria-label="Tambah produk"
            title="Tambah produk"
          >
            <PlusCircle className="w-6 h-6 mx-auto" />
          </button>
        </div>
      )}
    </div>
  );
}
