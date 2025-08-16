"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Bot, X, Mic, Image as ImageIcon, User } from 'lucide-react';
import ProductCard from './ProductCard';
import type { ProductItem } from '@/lib/sheets';
import { trackEvent } from '@/lib/analytics';

type Message = { role: 'user' | 'assistant'; content: string };

export default function Chatbox() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<ProductItem[] | null>(null);
  const [quickView, setQuickView] = useState<ProductItem | null>(null);
  const [isOpen, setIsOpen] = useState(true);
  const endRef = useRef<HTMLDivElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const fabRef = useRef<HTMLButtonElement | null>(null);
  const [adminMode, setAdminMode] = useState(false);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [recording, setRecording] = useState(false);
  const recognitionRef = useRef<any>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const hasPlayedOpenBeep = useRef(false);
  // Simple conversational context (brand/size/budget) for follow-ups
  const [chatCtx, setChatCtx] = useState<{ brand?: string; size?: string; color?: string; budgetMax?: number; budgetMin?: number; lastQuery?: string; lastProducts?: ProductItem[] }>({});
  const [clarify, setClarify] = useState<{ question: string; options: string[] } | null>(null);

  // Phrase helpers for more natural responses
  const pick = useCallback((arr: string[]) => arr[Math.floor(Math.random() * arr.length)], []);
  const say = useMemo(() => {
    const greet = ['Siap!','Oke!','Noted!','Bisa!','Sip!'];
    const foundLead = ['Aku nemuin','Ketemu','Ada','Aku punya','Sepertinya pas nih, ada'];
    const tail = ['Cek daftar di bawah ya—klik kartunya buat lihat detail.','Silakan cek kartunya di bawah.','Lihat yang di bawah ya, bisa klik untuk detail.','Coba cek kartunya ya.'];
    const askMore = ['Kalau masih kurang pas, kasih tau preferensi lain 🙌','Butuh penyesuaian lagi? Tinggal bilang ya.','Mau diubah brand/ukuran/budget? Kasih tau aku ya.'];
    const none = ['Belum ketemu yang pas.','Sepertinya belum ada yang cocok.','Belum ada yang pas nih.'];
    const askSize = ['Ukuran berapa yang kamu cari?','Boleh sebut ukurannya?','Mau coba ukurannya berapa?'];
    return {
      greet: () => pick(greet),
      found: (n: number) => `${pick(foundLead)} ${n} produk yang cocok. ${pick(tail)} ${pick(askMore)}`,
      none: () => `${pick(none)} Boleh kasih detail lain? Misal brand, warna, ukuran, atau budget.`,
      notedSize: (s: string) => `${pick(greet)} Coba aku carikan ukuran ${s} ya…`,
      altSizeFound: (s: string) => `Aku temuin alternatif ukuran ${s}. ${pick(tail)} ${pick(askMore)}`,
      altSizeNone: (s: string) => `Sepertinya ukuran ${s} belum ada stoknya. Mau coba ukuran terdekat atau brand lain?`,
      askSize: () => `${pick(none)} ${pick(askSize)} Aku bisa cariin lagi 😊`,
    };
  }, [pick]);

  const canSend = useMemo(() => input.trim().length > 0 && !loading, [input, loading]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, products]);

  // Detect admin mode based on current path
  useEffect(() => {
    if (typeof window === 'undefined') return;
    setAdminMode(window.location.pathname.startsWith('/admin'));
  }, []);

  // Buka otomatis ketika hash adalah #chat
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const openIfHash = () => {
      if (window.location.hash === '#chat') {
        setIsOpen(true);
        trackEvent('chat_open', { source: 'hash' });
      }
    };
    openIfHash();
    window.addEventListener('hashchange', openIfHash);
    return () => window.removeEventListener('hashchange', openIfHash);
  }, []);

  const SHOW_SUGGESTIONS = useMemo(() => String(process.env.NEXT_PUBLIC_CHAT_SHOW_SUGGESTIONS || 'false') === 'true', []);
  const showSuggestions = !adminMode && SHOW_SUGGESTIONS;
  const suggestions = useMemo(() => (
    [
      'Daftar Sepatu Uk. 42',
      'Nike di bawah 500k',
      'Adidas warna putih'
    ]
  ), []);

  // --- Heuristics: parse filters & detect follow-ups ---
  const parseFilters = useCallback((text: string) => {
    const t = text.toLowerCase();
    const brandList = ['nike','adidas','converse','vans','new balance','puma','reebok','asics'];
    const brand = brandList.find(b => t.includes(b)) as string | undefined;
    const sizeMatch = t.match(/\b(3[5-9]|4[0-6])\b/); // EU 35-46
    const size = sizeMatch?.[0];
    // budget: e.g., 500k, 1jt, 1 juta, di bawah 1 juta
    let budgetMax: number | undefined;
    const kMatch = t.match(/(\d+[\.,]?\d*)\s*(k|rb)/); // 500k => 500000
    const jtMatch = t.match(/(\d+[\.,]?\d*)\s*(jt|juta)/);
    if (kMatch) budgetMax = Math.round(parseFloat(kMatch[1].replace(',', '.')) * 1000);
    if (jtMatch) budgetMax = Math.round(parseFloat(jtMatch[1].replace(',', '.')) * 1000000);
    if (/di\s*bawah|under|<=|<|maks|budget/i.test(text)) {
      // treat as max budget
    } else {
      // if says '1 jutaan', keep as max approximation
    }
    const colorTokens = ['hitam','putih','merah','biru','hijau','abu','coklat','cream','krem','kuning'];
    const color = colorTokens.find(c => t.includes(c));
    return { brand, size, color, budgetMax } as Partial<typeof chatCtx>;
  }, [chatCtx]);

  const detectFollowup = useCallback((text: string) => {
    const t = text.toLowerCase();
    if (/kurang pas|nggak pas|ga pas|tidak pas|kegede(?:an)?|kekecilan|ukurannya? (nggak|tidak) cocok|size (nggak|tidak) cocok/.test(t)) {
      return 'SIZE_NOT_FIT' as const;
    }
    return undefined;
  }, []);

  const uniqueSizesFromProducts = useCallback((items: ProductItem[]) => {
    const set = new Set<string>();
    items.forEach(p => { if (p.size) set.add(String(p.size)); });
    return Array.from(set).slice(0, 6);
  }, []);

  // Simple beep using Web Audio API (no external assets)
  function playBeep(freq = 850, duration = 0.055, volume = 0.064): boolean {
    if (typeof window === 'undefined') return false;
    const AudioCtx = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return false;
    if (!audioCtxRef.current) {
      try { audioCtxRef.current = new AudioCtx(); } catch { return false; }
    }
    const ctx = audioCtxRef.current!;
    // Some browsers need resume after user gesture; ignore if it throws
    try { void ctx.resume(); } catch {}
    const canPlayNow = ctx.state === 'running';
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.value = volume;
      osc.connect(gain);
      gain.connect(ctx.destination);
      const now = ctx.currentTime;
      osc.start(now);
      // quick decay for clicky bubble
      gain.gain.setValueAtTime(volume, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
      osc.stop(now + duration + 0.01);
    } catch {}
    return canPlayNow;
  }

  async function uploadImage(file: File) {
    if (!adminMode) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/admin/upload', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Upload gagal');
      setUploadedImageUrl(data.url);
      trackEvent('admin_chat_image_uploaded', { hasUrl: Boolean(data.url) });
    } catch (e: any) {
      setMessages((m) => [...m, { role: 'assistant', content: e?.message || 'Upload gambar gagal.' }]);
    } finally {
      setUploading(false);
    }
  }

  function startVoice() {
    if (!adminMode) return;
    const w = window as any;
    const Rec = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Rec) {
      setMessages((m) => [...m, { role: 'assistant', content: 'Voice tidak didukung di browser ini.' }]);
      return;
    }
    const recog = new Rec();
    recognitionRef.current = recog;
    recog.lang = 'id-ID';
    recog.interimResults = false;
    recog.maxAlternatives = 1;
    recog.onresult = (ev: any) => {
      const text: string = ev.results?.[0]?.[0]?.transcript || '';
      if (text) setInput((prev) => (prev ? prev + ' ' : '') + text);
    };
    recog.onend = () => setRecording(false);
    recog.onerror = () => setRecording(false);
    setRecording(true);
    try { recog.start(); } catch { setRecording(false); }
  }

  function stopVoice() {
    const r = recognitionRef.current;
    if (r) { try { r.stop(); } catch {} }
    setRecording(false);
  }

  // Close by outside click
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (!isOpen) return;
      const target = e.target as Node;
      if (panelRef.current && panelRef.current.contains(target)) return;
      if (fabRef.current && fabRef.current.contains(target)) return;
      setIsOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [isOpen]);

  // Close with ESC
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setIsOpen(false);
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const toggleOpen = useCallback(() => {
    setIsOpen((v) => {
      const next = !v;
      if (next) {
        trackEvent('chat_open', { source: 'fab' });
        // Play open beep when toggled open by user (slightly quieter)
        const ok = playBeep(980, 0.06, 0.072);
        if (ok) hasPlayedOpenBeep.current = true;
      }
      return next;
    });
  }, []);

  // Play a short beep on initial open state as well
  useEffect(() => {
    if (!isOpen) return;
    // attempt a very quiet beep; may be blocked until first interaction
    if (!hasPlayedOpenBeep.current) {
      const ok = playBeep(980, 0.05, 0.056);
      if (ok) hasPlayedOpenBeep.current = true;
    }
    // Fallback: play on first user gesture if blocked
    const onPointer = () => {
      if (!hasPlayedOpenBeep.current) {
        const ok = playBeep(980, 0.05, 0.056);
        if (ok) hasPlayedOpenBeep.current = true;
      }
      window.removeEventListener('pointerdown', onPointer);
    };
    window.addEventListener('pointerdown', onPointer, { once: true });
    return () => window.removeEventListener('pointerdown', onPointer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  async function sendMessage(textOverride?: string) {
    const text = (textOverride ?? input).trim();
    if (!text || loading) return;
    setInput('');
    setMessages((m) => [...m, { role: 'user', content: text }]);
    setLoading(true);
    try {
      // Conversational follow-up handling (client-side) for shopper mode
      if (!adminMode && products && Array.isArray(products) && products.length > 0) {
        const follow = detectFollowup(text);
        if (follow === 'SIZE_NOT_FIT') {
          const f = parseFilters(text);
          if (f.size) {
            // User provided a new size: re-search using prior context
            const ctx = { ...chatCtx, ...f };
            const parts: string[] = [];
            if (ctx.brand) parts.push(ctx.brand);
            if (ctx.color) parts.push(ctx.color);
            if (ctx.size) parts.push(`ukuran ${ctx.size}`);
            if (ctx.budgetMax) parts.push(`di bawah ${ctx.budgetMax.toLocaleString('id-ID')}`);
            const newQuery = parts.join(' ').trim() || `ukuran ${f.size}`;
            setMessages((m) => [...m, { role: 'assistant', content: say.notedSize(String(ctx.size)) }]);
            // proceed to API search with newQuery
            const endpoint = '/api/chat';
            const controller = new AbortController();
            let timeoutId: NodeJS.Timeout | null = setTimeout(() => controller.abort(), 30000);
            const res = await fetch(endpoint, {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ message: newQuery }), signal: controller.signal,
            });
            const data = await res.json();
            if (timeoutId !== null) {
              clearTimeout(timeoutId);
              timeoutId = null;
            }
            if (!res.ok) throw new Error(data?.error || 'Gagal memproses');
            const items = Array.isArray(data.products) ? data.products : [];
            if (items.length > 0) setProducts(items);
            setChatCtx((prev) => ({ ...prev, ...f, lastQuery: newQuery, lastProducts: items }));
            const serverMsg: string | undefined = typeof data?.message === 'string' ? data.message : undefined;
            const summary = serverMsg && serverMsg.trim().length
              ? serverMsg
              : (items.length ? say.altSizeFound(String(ctx.size)) : say.altSizeNone(String(ctx.size)));
            setMessages((m) => [...m, { role: 'assistant', content: summary }]);
            playBeep(560, 0.045, 0.064);
            setClarify(null);
            setLoading(false);
            trackEvent('chat_followup_size_search', { size: ctx.size, results: Number(items.length) });
            return;
          } else {
            // Ask for size preference with quick replies derived from current results
            const sizes = uniqueSizesFromProducts(products);
            const options = sizes.length ? sizes.map(s => `Ukuran ${s}`) : ['Ukuran 41','Ukuran 42','Ukuran 43'];
            const question = 'Ukuran berapa yang kamu cari?';
            setMessages((m) => [...m, { role: 'assistant', content: say.askSize() }]);
            setClarify({ question, options });
            playBeep(560, 0.045, 0.064);
            setLoading(false);
            trackEvent('chat_followup_size_clarify', { hasSizes: sizes.length > 0 });
            return;
          }
        }
      }

      const endpoint = adminMode ? '/api/admin/chat' : '/api/chat';
      const controller = new AbortController();
      let timeoutId: NodeJS.Timeout | null = setTimeout(() => controller.abort(), 30000);
      const body: any = { message: text };
      if (adminMode && uploadedImageUrl) body.imageUrl = uploadedImageUrl;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      const data = await res.json();
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      if (!res.ok) throw new Error(data?.error || 'Gagal memproses');

      if (adminMode) {
        const p = data.product as ProductItem | undefined;
        const assistantMsg: string | undefined = typeof data.message === 'string' ? data.message : undefined;
        const msg = assistantMsg ?? (p
          ? `Produk ditambahkan: ${p.id ?? ''} — ${p.name}`
          : 'Perintah diproses.');
        setMessages((m) => [...m, { role: 'assistant', content: msg }]);
        playBeep(560, 0.045, 0.064); // bubble reply sound (quieter)
        trackEvent('admin_chat_create_success', { hasProduct: Boolean(p) });
        try {
          // Beritahu halaman admin untuk refresh daftar produk
          window.dispatchEvent(new CustomEvent('admin:products:refresh', { detail: { id: p?.id } }));
        } catch {}
      } else {
        const items = Array.isArray(data.products) ? data.products : [];
        if (items.length > 0) setProducts(items); // persist previous cards if empty
        // Update conversational context from current text
        const f = parseFilters(text);
        setChatCtx((prev) => ({ ...prev, ...f, lastQuery: text, lastProducts: items }));
        const serverMsg: string | undefined = typeof data?.message === 'string' ? data.message : undefined;
        const summary = serverMsg && serverMsg.trim().length ? serverMsg : (items.length ? say.found(items.length) : say.none());
        setMessages((m) => [...m, { role: 'assistant', content: summary }]);
        playBeep(560, 0.045, 0.064); // bubble reply sound (quieter)
        trackEvent('chat_send', { textLength: text.length, results: Number(data.products?.length || 0) });
      }
    } catch (e: any) {
      // Ensure timeout/abort stops loading state
      const aborted = e?.name === 'AbortError';
      const msg = aborted ? 'Permintaan timeout, silakan coba lagi.' : (e?.message || 'Terjadi kesalahan.');
      setMessages((m) => [...m, { role: 'assistant', content: msg }]);
      playBeep(420, 0.05, 0.056); // error bubble sound (quieter)
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* FAB */}
      {!isOpen && (
        <button
          ref={fabRef}
          onClick={toggleOpen}
          aria-label="Buka Chat AI"
          className="rounded-full w-14 h-14 grid place-items-center bg-blue-500 hover:bg-blue-600 text-white shadow-xl"
        >
          <Bot className="w-6 h-6" />
        </button>
      )}

      {/* Panel */}
      {isOpen && (
        <div
          ref={panelRef}
          className="w-80 sm:w-96 md:w-[28rem] bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden chat-panel-enter flex flex-col max-h-[min(80vh,700px)]"
        >
          <div className="p-3 bg-white/70 backdrop-blur-md border-b border-white/40 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-blue-700">{adminMode ? 'Asisten Admin Thrift Shop' : 'Asisten Thrift Shop'}</p>
              <p className="text-xs text-blue-700/70">{adminMode ? 'Ketik perintah: tambah/edit produk via natural language. Bisa upload gambar & voice.' : 'Tanya produk: brand, ukuran, warna, budget.'}</p>
            </div>
            <button aria-label="Tutup" onClick={() => setIsOpen(false)} className="p-1 text-blue-700 hover:text-blue-900">
              <X className="w-4 h-4" />
            </button>
          </div>
          {(clarify || showSuggestions) && (
            <div className="px-3 py-2 border-b border-gray-200 flex gap-2 overflow-x-auto no-scrollbar">
              {clarify ? (
                <>
                  <span className="text-xs text-slate-600 shrink-0">{clarify.question}</span>
                  {clarify.options.map((q) => (
                    <button
                      key={q}
                      onClick={() => { setClarify(null); trackEvent('chat_clarify_click', { q }); sendMessage(q); }}
                      className="text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 px-2.5 py-1 rounded-full whitespace-nowrap"
                    >
                      {q}
                    </button>
                  ))}
                </>
              ) : (
                showSuggestions ? (
                  suggestions.map((q) => (
                    <button
                      key={q}
                      onClick={() => { trackEvent('chat_suggestion_click', { q }); sendMessage(q); }}
                      className="text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 px-2.5 py-1 rounded-full whitespace-nowrap"
                    >
                      {q}
                    </button>
                  ))
                ) : null
              )}
            </div>
          )}
          <div className="flex-1 overflow-y-auto overflow-x-hidden p-3 space-y-3">
            {messages.map((m, idx) => (
              <div key={idx} className={`message-row flex items-end gap-2 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {m.role === 'assistant' ? (
                  <div className="w-7 h-7 rounded-full bg-blue-600 text-white grid place-items-center shrink-0">
                    <Bot className="w-4 h-4" />
                  </div>
                ) : null}
                <div className={
                  'px-3 py-2 rounded-2xl transition whitespace-pre-wrap break-words max-w-[85%] shadow-sm ' +
                  (m.role === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-100/90 text-gray-800 backdrop-blur-sm')
                }>
                  <span>{m.content}</span>
                </div>
                {m.role === 'user' ? (
                  <div className="w-7 h-7 rounded-full bg-slate-700 text-white grid place-items-center shrink-0">
                    <User className="w-4 h-4" />
                  </div>
                ) : null}
              </div>
            ))}
            {loading ? (
              <div className="text-blue-600 text-sm animate-pulse">{adminMode ? 'Memproses perintah...' : 'Mencari produk...'}</div>
            ) : null}
            {/* Quick actions removed to simplify UI */}
            {products ? (
              <>
                <div className="flex items-center justify-between mt-1 mb-1">
                  <p className="text-xs text-slate-600">Rekomendasi untukmu{Array.isArray(products) && products.length ? ` · ${products.length} produk` : ''}</p>
                  <div className="flex items-center gap-2">
                    <a href="/katalog" className="text-xs text-blue-600 hover:text-blue-800 underline underline-offset-2">Lihat katalog</a>
                    <button
                      onClick={() => { setProducts(null); trackEvent('chat_results_clear', {}); }}
                      className="text-xs text-slate-600 hover:text-slate-900"
                      aria-label="Kosongkan hasil"
                    >
                      Kosongkan
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {products.length === 0 ? (
                    <div className="text-gray-500 text-sm">Tidak ada produk.</div>
                  ) : (
                    products.map((p, i) => (
                      <ProductCard
                        key={i}
                        product={p}
                        hideCta
                        onClick={() => setQuickView(p)}
                      />
                    ))
                  )}
                </div>
              </>
            ) : null}
            <div ref={endRef} />
          </div>
          <div className="p-3 bg-white/70 backdrop-blur-md border-t border-white/40 flex items-center gap-2">
            {adminMode && (
              <>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadImage(f); }}
                  className="hidden"
                  id="admin-chat-upload"
                />
                <button
                  onClick={() => document.getElementById('admin-chat-upload')?.click()}
                  disabled={uploading}
                  aria-label={uploadedImageUrl ? 'Ganti gambar' : 'Upload gambar'}
                  title={uploadedImageUrl ? 'Ganti gambar' : 'Upload gambar'}
                  className={`rounded-full w-9 h-9 grid place-items-center text-white ${uploading ? 'bg-slate-400' : 'bg-slate-700 hover:bg-slate-800'} disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-blue-300 transition`}
                >
                  <ImageIcon className="w-4 h-4" />
                </button>
                {uploadedImageUrl ? (
                  <button
                    onClick={() => setUploadedImageUrl(null)}
                    aria-label="Hapus gambar"
                    title="Hapus gambar"
                    className="rounded-full w-9 h-9 grid place-items-center border border-gray-300 text-slate-700 hover:bg-gray-50 focus-visible:ring-2 focus-visible:ring-blue-300"
                  >
                    <X className="w-4 h-4" />
                  </button>
                ) : null}
              </>
            )}
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') sendMessage();
              }}
              placeholder="Contoh: Nike hitam size 42 budget 500k"
              className="flex-1 rounded-xl border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
            {adminMode && (
              <button
                onClick={() => (recording ? stopVoice() : startVoice())}
                aria-label={recording ? 'Hentikan rekam suara' : 'Mulai rekam suara'}
                className={`rounded-full w-9 h-9 grid place-items-center ${recording ? 'bg-rose-500 hover:bg-rose-600' : 'bg-slate-700 hover:bg-slate-800'} text-white focus-visible:ring-2 focus-visible:ring-blue-300`}
              >
                <Mic className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={() => sendMessage()}
              disabled={!canSend}
              className="rounded-xl bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-blue-300"
            >
              Kirim
            </button>
          </div>
        </div>
      )}
      {/* Quick View Modal */}
      {quickView ? (
        <div className="modal-backdrop z-[60]" onClick={() => setQuickView(null)}>
          <div
            className="modal-card w-[90vw] max-w-md mx-auto mt-[10vh] p-4"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-start justify-between mb-2">
              <p className="font-semibold text-slate-900">{quickView.name}</p>
              <button onClick={() => setQuickView(null)} aria-label="Tutup" className="text-slate-600 hover:text-slate-900">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="mb-3 text-slate-700">
              <p className="text-sm">Harga: <span className="font-semibold">Rp {Number(quickView.price||0).toLocaleString('id-ID')}</span></p>
              {quickView.size ? <p className="text-sm">Ukuran: {quickView.size}</p> : null}
            </div>
            <div className="rounded-xl overflow-hidden border border-gray-200 mb-3">
              <ProductCard product={quickView} />
            </div>
            <div className="flex justify-end">
              <button onClick={() => setQuickView(null)} className="px-3 py-2 text-sm rounded-xl border border-gray-300 mr-2">Tutup</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}


