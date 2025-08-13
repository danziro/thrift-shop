# ThriftinAja — Thrift Shop MVP

> Next.js 15 + React 19 + TypeScript + TailwindCSS.
>
> Public katalog, Admin CRUD (protected), upload gambar ke Supabase, data produk via Google Sheets, SEO + Analytics.

---

## 1) Konfigurasi Branding

- File: `config/site.ts`
  - `name`, `description`, `url`, `social`, warna dan identitas brand.
- File: `app/globals.css`
  - Variabel CSS (warna, radius) dan utilitas komponen (btn, card, reveal).

Ganti nilai di `siteConfig` untuk rebrand cepat. Semua metadata dan UI memakai nilai ini.

---

## 2) Environment Variables

Buat file `.env.local` di root dan isi sesuai kebutuhan:

```env
# URL dasar site (tanpa slash di akhir)
NEXT_PUBLIC_SITE_URL=https://your-domain.com

# Google Analytics (opsional)
NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX

# WhatsApp untuk CTA pembelian (628xx… tanpa +)
NEXT_PUBLIC_WHATSAPP_PHONE=6281234567890

# Supabase (image upload)
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_ROLE=your-service-role-key
SUPABASE_BUCKET=public

# Google Sheets API (produk)
GOOGLE_PROJECT_ID=...
GOOGLE_CLIENT_EMAIL=...
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
GOOGLE_SHEETS_ID=your_sheet_id
GOOGLE_SHEETS_TAB=Products

# Admin security (lihat middleware implementasi)
# ADMIN_USERNAME=...
# ADMIN_PASSWORD=...
```

Catatan:
- `next.config.ts` otomatis mengizinkan `next/image` untuk domain di `NEXT_PUBLIC_SUPABASE_URL`.
- GA opsional: event akan dikirim jika `NEXT_PUBLIC_GA_ID` tersedia.

---

## 3) Google Sheets — Struktur Data Produk

Sheet (tab default: `Products`). Kolom yang digunakan:

- `id` (string) — opsional (dibuat saat insert jika kosong)
- `name` (string) — wajib
- `brand` (string)
- `size` (string)
- `color` (string)
- `price` (number) — wajib
- `description` (string)
- `category` (string) — default: `sepatu`
- `imageUrl` (string URL)
- `buyUrl` (string URL)
- `status` (enum: `Published` | `Draft`) — default: `Published`

Aplikasi membaca dan menulis baris menggunakan Google Sheets API (scope write sudah diaktifkan).

---

## 4) Supabase — Upload Gambar

- Gunakan bucket (mis. `public`) yang readable secara publik.
- Endpoint upload: `POST /api/admin/upload` (server-side) memakai `SUPABASE_SERVICE_ROLE`.
- Setelah upload, URL publik disimpan ke `imageUrl` pada produk.

Pastikan domain `NEXT_PUBLIC_SUPABASE_URL` valid agar optimasi `next/image` berjalan.

---

## 5) Admin & Endpoint API

- Halaman Admin: `/admin` (Basic Auth, lihat middleware proyek).
- Endpoints (semua di-protect sesuai middleware):
  - `GET /api/admin/products` — list produk.
  - `POST /api/admin/products` — tambah produk.
  - `PUT /api/admin/products` — update produk (body memuat `id` dan patch).
  - `DELETE /api/admin/products?id=...` — hapus produk.
  - `POST /api/admin/upload` — upload gambar, balikan `{ url }`.

Gunakan Basic Auth di Postman/cURL saat mengakses endpoint di atas (jika diperlukan oleh middleware).

---

## 6) SEO & Analytics

- Metadata global ada di `app/layout.tsx` (title template, OG/Twitter, canonical).
- JSON-LD:
  - Organization disuntikkan di layout.
  - Product List (ItemList) di `components/ProductGrid.tsx`.
  - Product per item di `components/ProductCard.tsx`.
- Analytics:
  - GA via `NEXT_PUBLIC_GA_ID`.
  - Event tracking di CTA (katalog/hero), navbar, chat (open/send/suggestion), dan tombol beli.

---

## 7) Menjalankan Secara Lokal

```bash
npm install
npm run dev
# buka http://localhost:3000
```

Build & start production:

```bash
npm run build
npm start
```

---

## 8) Handover Checklist

- [ ] Isi `.env.local` lengkap (domain, GA, WhatsApp, Supabase, Sheets, admin creds bila ada).
- [ ] Cek kembali `config/site.ts` untuk branding dan metadata.
- [ ] Verifikasi upload gambar Supabase dan optimasi `next/image`.
- [ ] Uji Admin CRUD, validasi form, dan toast.
- [ ] Uji event analytics di CTA, nav, chat, beli.
- [ ] Regenerasi `robots.ts`/sitemap otomatis tergantung `NEXT_PUBLIC_SITE_URL`.

---

## 9) Troubleshooting

- Gambar tidak muncul/teroptimasi: cek `NEXT_PUBLIC_SUPABASE_URL` valid (hostname benar) dan bucket publik.
- GA event tidak terlihat: pastikan `NEXT_PUBLIC_GA_ID` terisi dan tidak di-block ad blocker.
- Basic Auth admin/API: lihat middleware; akses via browser akan memunculkan prompt; di tools gunakan Authorization header (Basic base64).
