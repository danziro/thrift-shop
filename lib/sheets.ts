import { google } from 'googleapis';

export type ProductItem = {
  id?: string;
  name: string;
  price: number;
  description: string;
  category: string;
  imageUrl?: string;
  images?: string[];
  buyUrl?: string;
  brand?: string;
  size?: string;
  color?: string;
  status?: 'Published' | 'Draft' | string;
  createdAt?: string; // dari kolom Timestamp (A)
  stock?: number; // stok tersedia
};

let cachedProducts: ProductItem[] | null = null;
let lastFetchedAt = 0;
const CACHE_TTL_MS = 1000 * 60; // 1 menit

function getGoogleJwtClient() {
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!clientEmail || !privateKey) {
    throw new Error('Google Service Account env tidak lengkap. Cek GOOGLE_SERVICE_ACCOUNT_EMAIL dan GOOGLE_PRIVATE_KEY');
  }
  return new google.auth.JWT({
    email: clientEmail,
    key: privateKey,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
}

export async function fetchSheetProducts(): Promise<ProductItem[]> {
  const now = Date.now();
  if (cachedProducts && now - lastFetchedAt < CACHE_TTL_MS) {
    return cachedProducts;
  }

  const sheetId = process.env.GOOGLE_SHEET_ID;
  const range = process.env.GOOGLE_SHEET_RANGE || 'Sheet1!A:M';
  if (!sheetId) throw new Error('GOOGLE_SHEET_ID tidak diset');

  const auth = getGoogleJwtClient();
  const sheets = google.sheets({ version: 'v4', auth });
  const res = await sheets.spreadsheets.values.get({ spreadsheetId: sheetId, range });

  const values = res.data.values || [];
  // Asumsi header (baru): Timestamp | ID | Nama | Brand | Ukuran | Warna | Harga | Deskripsi | Kategori | Stok | Buy URL | Status | Gambar
  const [header, ...rows] = values;
  if (!header) return [];

  const products: ProductItem[] = rows.map((row) => {
    const [timestamp, id, name, brand, size, color, price, description, category, stock, buyUrl, status, imageUrl] = row;
    const parsedPrice = Number(String(price || '0').toString().replace(/[^0-9.]/g, '')) || 0;
    const rawImg = String(imageUrl || '').trim();
    const rawBuy = String(buyUrl || '').trim();
    const isValidUrl = (u: string) => /^https?:\/\//.test(u) || u.startsWith('/');
    const isLikelyImage = (u: string) => /\.(png|jpe?g|webp|gif|bmp|svg)(\?|$)/i.test(u) || /\/storage\/v1\/(object|render)\//.test(u) || /supabase\.co\//.test(u);
    let finalImage = isValidUrl(rawImg) ? rawImg : '';
    let finalBuy = isValidUrl(rawBuy) ? rawBuy : '';
    if (!finalImage && finalBuy && isLikelyImage(finalBuy)) {
      finalImage = finalBuy;
      finalBuy = '';
    }
    return {
      id: String(id || '').trim() || undefined,
      name: String(name || '').trim(),
      price: parsedPrice,
      description: String(description || '').trim(),
      category: String(category || '').trim(),
      imageUrl: isValidUrl(finalImage) ? finalImage : '',
      buyUrl: finalBuy || undefined,
      brand: String(brand || '').trim() || undefined,
      size: String(size || '').trim() || undefined,
      color: String(color || '').trim() || undefined,
      status: String(status || '').trim() || undefined,
      createdAt: String(timestamp || '').trim() || undefined,
      stock: Number(stock ?? '') || undefined,
    };
  });

  cachedProducts = products;
  lastFetchedAt = now;
  return products;
}

export type SearchParams = {
  kategori?: string;
  max_price?: number;
  min_price?: number;
  keyword?: string;
  brand?: string;
  size?: string;
  color?: string;
};

export function filterProducts(products: ProductItem[], params: SearchParams): ProductItem[] {
  const keyword = params.keyword?.toLowerCase().trim();
  const category = params.kategori?.toLowerCase().trim();
  const minPrice = typeof params.min_price === 'number' ? params.min_price : undefined;
  const maxPrice = typeof params.max_price === 'number' ? params.max_price : undefined;
  const brandFilter = params.brand?.toLowerCase().trim();
  const sizeFilter = params.size?.toLowerCase().trim();
  const colorFilter = params.color?.toLowerCase().trim();

  const filtered = products.filter((p) => {
    if (p.status && p.status.toLowerCase() === 'draft') return false;
    if (p.status && p.status.toLowerCase() === 'sold') return false; // exclude sold dari katalog
    if (category && !p.category.toLowerCase().includes(category)) return false;
    if (brandFilter && !(p.brand || '').toLowerCase().includes(brandFilter)) return false;
    if (sizeFilter && !(p.size || '').toLowerCase().includes(sizeFilter)) return false;
    if (colorFilter && !(p.color || '').toLowerCase().includes(colorFilter)) return false;

    if (keyword) {
      const haystack = `${p.id ?? ''} ${p.name} ${p.description} ${p.category} ${p.brand ?? ''} ${p.size ?? ''} ${p.color ?? ''}`.toLowerCase();
      // Token-based AND matching improves recall for queries seperti "nike hitam 42"
      // Ignore common Indonesian stopwords that shouldn't be required to match product text
      const stopwords = new Set([
        'ukuran','size','apakah','ada','yang','di','ke','dari','pada','untuk','dan','atau','atau','dengan','tanpa','dibawah','di','bawah','under','<=','<','maks','budget','harga','sepatu','sandal','sendal','warna','brand','merek'
      ]);
      const tokens = keyword.split(/\s+/).filter(t => t && !stopwords.has(t));
      if (tokens.length > 0) {
        let matches = 0;
        for (const t of tokens) {
          if (haystack.includes(t)) matches++;
        }
        // Require at least half tokens to match (rounded up), but cap minimum at 1
        const required = Math.max(1, Math.ceil(tokens.length / 2));
        if (matches < required) return false;
      }
    }

    if (minPrice !== undefined && p.price < minPrice) return false;
    if (maxPrice !== undefined && p.price > maxPrice) return false;
    return true;
  });

  // Relevance scoring & sorting
  if (!keyword && !brandFilter && !sizeFilter && !colorFilter && minPrice === undefined && maxPrice === undefined && !category) {
    return filtered;
  }

  function scoreProduct(p: ProductItem): number {
    let score = 0;
    const hay = `${p.id ?? ''} ${p.name} ${p.description} ${p.category} ${p.brand ?? ''} ${p.size ?? ''} ${p.color ?? ''}`.toLowerCase();
    if (brandFilter && (p.brand || '').toLowerCase().includes(brandFilter)) score += 5;
    if (sizeFilter && (p.size || '').toLowerCase().includes(sizeFilter)) score += 4;
    if (colorFilter && (p.color || '').toLowerCase().includes(colorFilter)) score += 3;
    if (category && p.category.toLowerCase().includes(category)) score += 2;
    if (keyword) {
      const tokens = keyword.split(/\s+/).filter(Boolean);
      for (const t of tokens) {
        if (hay.includes(t)) score += 1;
      }
      // bonus exact phrase
      if (hay.includes(keyword)) score += 2;
    }
    // Prefer published or priced products
    if (Number(p.price || 0) > 0) score += 1;
    return score;
  }

  return filtered
    .map(p => ({ p, s: scoreProduct(p) }))
    .sort((a, b) => b.s - a.s)
    .map(x => x.p);
}

function ensureAuthSheets() {
  const sheetId = process.env.GOOGLE_SHEET_ID;
  if (!sheetId) throw new Error('GOOGLE_SHEET_ID tidak diset');
  const auth = getGoogleJwtClient();
  const sheets = google.sheets({ version: 'v4', auth });
  const range = process.env.GOOGLE_SHEET_RANGE || 'Sheet1!A:L';
  return { sheets, sheetId, range };
}

export async function createProduct(data: ProductItem): Promise<ProductItem> {
  const id = `P-${Date.now()}`;
  const nowIso = new Date().toISOString();
  const row = [
    data.createdAt || nowIso, // Timestamp (A)
    id,                       // ID (B)
    data.name || '',          // Nama (C)
    data.brand || '',         // Brand (D)
    data.size || '',          // Ukuran (E)
    data.color || '',         // Warna (F)
    data.price || 0,          // Harga (G)
    data.description || '',   // Deskripsi (H)
    data.category || '',      // Kategori (I)
    data.stock ?? 1,          // Stok (J)
    data.buyUrl || '',        // Buy URL (K)
    data.status || 'Published', // Status (L)
    (data.imageUrl && (/^https?:\/\//.test(data.imageUrl) || data.imageUrl.startsWith('/'))) ? data.imageUrl : '', // Gambar (M)
  ];
  const { sheets, sheetId, range } = ensureAuthSheets();
  await sheets.spreadsheets.values.append({
    spreadsheetId: sheetId,
    range,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [row] },
  });
  cachedProducts = null;
  return { ...data, id, createdAt: data.createdAt || nowIso };
}

export async function updateProduct(data: Partial<ProductItem> & { id: string }): Promise<void> {
  const { sheets, sheetId, range } = ensureAuthSheets();
  const res = await sheets.spreadsheets.values.get({ spreadsheetId: sheetId, range });
  const values = res.data.values || [];
  const [header, ...rows] = values;
  const rowIndex = rows.findIndex((r) => String(r[1]).trim() === data.id);
  if (rowIndex === -1) throw new Error('Produk tidak ditemukan');
  const idx = rowIndex + 1; // offset header
  const current = rows[rowIndex];
  const merged = {
    id: current[1],
    name: data.name ?? current[2],
    brand: data.brand ?? current[3],
    size: data.size ?? current[4],
    color: data.color ?? current[5],
    price: data.price ?? current[6],
    description: data.description ?? current[7],
    category: data.category ?? current[8],
    buyUrl: data.buyUrl ?? current[10],
    status: data.status ?? current[11],
    createdAt: current[0] || new Date().toISOString(),
    stock: (() => {
      const next = data.stock ?? (Number(current[9] ?? '') || 0);
      return next;
    })(),
    imageUrl: (() => {
      const next = (data.imageUrl ?? current[12] ?? '').toString().trim();
      return (/^https?:\/\//.test(next) || next.startsWith('/')) ? next : '';
    })(),
  };
  // Auto-set Sold if stock <= 0
  if (Number(merged.stock || 0) <= 0) merged.status = 'Sold';
  // Jika stock > 0 dan status sebelumnya Sold, set ke Published agar konsisten
  if (Number(merged.stock || 0) > 0 && String(merged.status||'').toLowerCase() === 'sold') {
    merged.status = 'Published';
  }
  const rowRange = `${(process.env.GOOGLE_SHEET_RANGE || 'Sheet1!A:M').split('!')[0]}!A${idx + 1}:M${idx + 1}`;
  await sheets.spreadsheets.values.update({
    spreadsheetId: sheetId,
    range: rowRange,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [[
      merged.createdAt,
      merged.id,
      merged.name,
      merged.brand,
      merged.size,
      merged.color,
      merged.price,
      merged.description,
      merged.category,
      merged.stock ?? 0,
      merged.buyUrl,
      merged.status,
      merged.imageUrl || '',
    ]] },
  });
  // Catat log stok jika ada perubahan
  try {
    const prevStockNum = Number(current[9] ?? '') || 0;
    if (typeof merged.stock === 'number' && merged.stock !== prevStockNum) {
      const delta = merged.stock - prevStockNum;
      const logRange = `${(process.env.GOOGLE_STOCK_LOG_RANGE || 'StockLog!A:E')}`;
      await sheets.spreadsheets.values.append({
        spreadsheetId: sheetId,
        range: logRange,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [[new Date().toISOString(), merged.id, delta, merged.stock, delta>0 ? 'restock' : 'sold_adjust']] },
      });
    }
  } catch (e) {
    console.error('StockLog append error', e);
  }
  cachedProducts = null;
}

export async function deleteProduct(id: string): Promise<void> {
  const { sheets, sheetId, range } = ensureAuthSheets();
  const res = await sheets.spreadsheets.values.get({ spreadsheetId: sheetId, range });
  const values = res.data.values || [];
  const [header, ...rows] = values;
  const rowIndex = rows.findIndex((r) => String(r[1]).trim() === id);
  if (rowIndex === -1) throw new Error('Produk tidak ditemukan');
  const idx = rowIndex + 2; // +2: header (1) + 1-based index
  const sheetName = (process.env.GOOGLE_SHEET_RANGE || 'Sheet1!A:M').split('!')[0];
  const clearRange = `${sheetName}!A${idx}:M${idx}`;
  await sheets.spreadsheets.values.clear({ spreadsheetId: sheetId, range: clearRange, requestBody: {} });
  cachedProducts = null;
}



// ========== Logs Helpers ==========
export type CartAddLogItem = { time: string; id: string; name: string; size?: string; price?: number; userAgent?: string };
export async function appendCartAddLog(entry: { id?: string; name?: string; size?: string; price?: number; userAgent?: string }) {
  const { sheets, sheetId } = ensureAuthSheets();
  const range = process.env.GOOGLE_CART_LOG_RANGE || 'CartAddLog!A:F';
  await sheets.spreadsheets.values.append({
    spreadsheetId: sheetId,
    range,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [[new Date().toISOString(), entry.id || '', entry.name || '', entry.size || '', Number(entry.price||0), (entry.userAgent||'')]] },
  });
}

export async function listCartAddLogs(limit = 20): Promise<CartAddLogItem[]> {
  const { sheets, sheetId } = ensureAuthSheets();
  const range = process.env.GOOGLE_CART_LOG_RANGE || 'CartAddLog!A:F';
  const res = await sheets.spreadsheets.values.get({ spreadsheetId: sheetId, range });
  const values = res.data.values || [];
  const [, ...rows] = values; // skip header jika ada
  const mapped = rows.map(r => ({ time: String(r[0]||''), id: String(r[1]||''), name: String(r[2]||''), size: r[3], price: Number(r[4]||0), userAgent: r[5] })) as CartAddLogItem[];
  return mapped.slice(-limit).reverse();
}

export type QueryLogItem = { time: string; text: string; userAgent?: string; referer?: string };
export async function appendQueryLog(entry: { text: string; userAgent?: string; referer?: string }) {
  const { sheets, sheetId } = ensureAuthSheets();
  const range = process.env.GOOGLE_QUERY_LOG_RANGE || 'Queries!A:D';
  await sheets.spreadsheets.values.append({
    spreadsheetId: sheetId,
    range,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [[new Date().toISOString(), entry.text, entry.userAgent||'', entry.referer||'']] },
  });
}

export async function listQueryLogs(limit = 50): Promise<QueryLogItem[]> {
  const { sheets, sheetId } = ensureAuthSheets();
  const range = process.env.GOOGLE_QUERY_LOG_RANGE || 'Queries!A:D';
  const res = await sheets.spreadsheets.values.get({ spreadsheetId: sheetId, range });
  const values = res.data.values || [];
  const [, ...rows] = values;
  const mapped = rows.map(r => ({ time: String(r[0]||''), text: String(r[1]||''), userAgent: r[2], referer: r[3] })) as QueryLogItem[];
  return mapped.slice(-limit).reverse();
}
