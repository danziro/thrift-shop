# Thrift Shop MVP — Ringkasan & Panduan UMKM

Dokumen ini merangkum fitur, cara pakai, dan nilai bisnis dari situs e-commerce thrift shop yang dioptimalkan untuk UMKM. Fokus: UI/UX modern, chatbot AI yang humanis, integrasi Google Sheets, dan handover mudah.

## Nilai Utama untuk UMKM
- Hemat biaya dan waktu: input produk lewat dashboard atau chatbot admin (NLP), otomatis sinkron ke Google Sheet dan frontsite.
- Konversi lebih tinggi: pencarian produk cepat via chat dan CTA WhatsApp langsung. Respon cepat cenderung menaikkan peluang konversi.
- Mudah diserahkan (handover): konfigurasi terkonsolidasi, dokumentasi, dan CI/CD ke Vercel.

## Fitur Utama
- Chatbot AI (frontsite):
  - Balasan lebih natural dan humanis.
  - Kartu produk dapat diklik di dalam chat (tanpa CTA beli), membuka Quick View yang elegan.
  - Tombol duplikat seperti “Lihat” dan “Lihat Produk Utama” dihapus agar UI rapi.
  - Efek suara halus, timeout, dan pesan error ramah.
- Chatbot Admin (dashboard `/admin`):
  - Perintah natural language untuk menambah produk (name, brand, size, color, price, dsb.).
  - Cek ketersediaan produk berdasarkan Product ID.
  - Proteksi Basic Auth di halaman dan API `/api/admin/*`.
- Integrasi Google Sheets:
  - CRUD via `lib/sheets.ts` dengan scope penuh (write).
  - Multi-gambar (gallery) dengan kolom dipisah koma; kompatibel `imageUrl`.
  - Frontsite membaca langsung dari Sheet (real-time, cache ±1 menit).
- Frontsite & UI/UX:
  - Hero modern dengan background gradient + blob dan animasi teks “sheen” elegan.
  - `ProductCard` dipoles: elevate + ring saat hover, tampilkan ukuran (size), JSON-LD Product.
  - Modal “Cara Beli” dengan copywriting jelas.
  - Perbaikan hover/focus, glassmorphism pada header/footer chat, avatar bubble.
- SEO & Analytics:
  - Meta dasar (title, description, og/twitter, canonical, keywords).
  - JSON-LD Organization & Product.
  - Tracking event: navigasi, CTA, chat, form; kompatibel GA/Plausible.
- Gambar & Performa:
  - `next/image` diaktifkan kembali; `remotePatterns` Supabase/public.

## Cara Pakai
- Frontsite (pembeli):
  1) Jelajah katalog atau gunakan chatbot. Sebutkan brand/ukuran/budget.
  2) Klik kartu produk di chat untuk Quick View, lalu lanjut ke halaman produk/CTA WA.
  3) Gunakan modal “Cara Beli” dari Header untuk panduan.
- Admin (penjual):
  1) Login ke `/admin` (Basic Auth).
  2) Tambah produk via form (react-hook-form + validasi) atau via chatbot admin.
  3) Produk otomatis masuk Google Sheet “Master Produk” dan muncul di frontsite.
  4) Edit/hapus lewat modal dengan UX lengkap (ESC/klik luar, focus trap, dsb.).

## Konfigurasi & Handover
- File penting:
  - `config/site.ts`: branding, URL, dll.
  - `app/globals.css`: gaya global + animasi.
  - `components/Chatbox.tsx`, `components/ProductCard.tsx`: komponen kunci UI/UX baru.
  - `lib/sheets.ts`: koneksi Google Sheets.
  - `next.config.ts`: `remotePatterns` untuk `next/image`.
- Environment:
  - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (bila pakai Supabase storage untuk gambar)
  - `NEXT_PUBLIC_WHATSAPP_PHONE` (format internasional tanpa +)
  - Kredensial Google Service Account (Sheets) + aktifkan Google Sheets API.
- Deploy:
  - Vercel + GitHub Actions (build & deploy). Tambahkan secrets Vercel di repo.

## Arsitektur Data Singkat
- Sumber data utama: Google Sheets (Master Produk).
- Frontsite fetch data → cache ±1 menit untuk performa.
- Admin tulis ke Sheets → invalidasi cache → frontsite terbarui otomatis.

## Catatan UX/Desain
- Chatbot frontsite: lebih humanis, ringkas, tidak memaksa CTA beli di konteks chat.
- Kartu produk klik untuk Quick View → mengurangi distraksi & langkah klik berlebih.
- Teks hero dengan animasi “sheen” yang subtle, dengan fallback untuk reduced motion.

## Troubleshooting Cepat
- Gambar tidak tampil: cek `next.config.ts` remotePatterns dan host Supabase; pastikan URL publik valid.
- Admin chatbot 403/401: cek Basic Auth (middleware) dan kredensial .env.
- Error Google Sheets “API not used”: aktifkan Google Sheets API di GCP project terkait.
- Upload gagal: pastikan file tidak kosong, perhatikan pesan error dari Supabase.

## Data/Fakta & Referensi
- Kecepatan respon berdampak besar pada konversi:
  - InsideSales/Lead Response Study: konversi 8x lebih tinggi dalam 5 menit pertama. (https://www.insidesales.com/response-time-matters/)
  - ChiliPiper: follow-up di menit pertama dapat meningkatkan konversi hingga ~391%. (https://www.chilipiper.com/article/speed-to-lead-statistics)
- WhatsApp untuk bisnis di Indonesia:
  - Statista: Indonesia peringkat #2 unduhan WhatsApp Business (~128,4 juta, Feb 2024). (https://www.statista.com/statistics/1276030/whatsapp-business-downloads-leading-countries/)
  - DataReportal 2024 Indonesia: gambaran digital & ad reach platform utama. (https://datareportal.com/reports/digital-2024-indonesia)
- Tren chatbot dan kepuasan pengguna:
  - Tidio/Backlinko/Chatbot.com: adopsi chatbot meningkat, pengalaman pengguna cenderung positif (metodologi bervariasi). (https://www.tidio.com/blog/chatbot-statistics/, https://backlinko.com/chatbot-stats, https://www.chatbot.com/blog/chatbot-statistics/)

Catatan: angka dapat bervariasi antar studi dan metodologi. Gunakan sebagai arah umum, bukan patokan tunggal.
