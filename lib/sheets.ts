import { google } from 'googleapis';

export type ProductItem = {
  id?: string;
  name: string;
  price: number;
  description: string;
  category: string;
  imageUrl: string;
  images?: string[];
  buyUrl?: string;
  brand?: string;
  size?: string;
  color?: string;
  status?: 'Published' | 'Draft' | string;
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
  const range = process.env.GOOGLE_SHEET_RANGE || 'Sheet1!A:E';
  if (!sheetId) throw new Error('GOOGLE_SHEET_ID tidak diset');

  const auth = getGoogleJwtClient();
  const sheets = google.sheets({ version: 'v4', auth });
  const res = await sheets.spreadsheets.values.get({ spreadsheetId: sheetId, range });

  const values = res.data.values || [];
  // Asumsi header baru (admin): ID | Nama | Brand | Ukuran | Warna | Harga | Deskripsi | Kategori | Link Gambar | Buy URL | Status
  const [header, ...rows] = values;
  if (!header) return [];

  const products: ProductItem[] = rows.map((row) => {
    const [id, name, brand, size, color, price, description, category, imageUrl, buyUrl, status] = row;
    const parsedPrice = Number(String(price || '0').toString().replace(/[^0-9.]/g, '')) || 0;
    const rawImg = String(imageUrl || '').trim();
    const list = rawImg ? rawImg.split(',').map(s => s.trim()).filter(Boolean) : [];
    const first = list[0] || rawImg;
    return {
      id: String(id || '').trim() || undefined,
      name: String(name || '').trim(),
      price: parsedPrice,
      description: String(description || '').trim(),
      category: String(category || '').trim(),
      imageUrl: String(first || '').trim(),
      images: list.length ? list : undefined,
      buyUrl: String(buyUrl || '').trim() || undefined,
      brand: String(brand || '').trim() || undefined,
      size: String(size || '').trim() || undefined,
      color: String(color || '').trim() || undefined,
      status: String(status || '').trim() || undefined,
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
};

export function filterProducts(products: ProductItem[], params: SearchParams): ProductItem[] {
  const keyword = params.keyword?.toLowerCase().trim();
  const category = params.kategori?.toLowerCase().trim();
  const minPrice = typeof params.min_price === 'number' ? params.min_price : undefined;
  const maxPrice = typeof params.max_price === 'number' ? params.max_price : undefined;

  return products.filter((p) => {
    if (p.status && p.status.toLowerCase() === 'draft') return false;
    if (category && !p.category.toLowerCase().includes(category)) return false;

    if (keyword) {
      const haystack = `${p.id ?? ''} ${p.name} ${p.description} ${p.category} ${p.brand ?? ''} ${p.size ?? ''} ${p.color ?? ''}`.toLowerCase();
      // Token-based AND matching improves recall for queries seperti "nike hitam 42"
      // Ignore common Indonesian stopwords that shouldn't be required to match product text
      const stopwords = new Set([
        'ukuran','size','apakah','ada','yang','di','ke','dari','pada','untuk','dan','atau','atau','dengan','tanpa','dibawah','di','bawah','under','<=','<','maks','budget','harga','sepatu','sandal','sendal','warna','brand','merek'
      ]);
      const tokens = keyword.split(/\s+/).filter(t => t && !stopwords.has(t));
      if (tokens.length === 0) {
        // If all tokens are stopwords, don't enforce token matching
      } else {
        for (const t of tokens) {
          if (!haystack.includes(t)) return false;
        }
      }
    }

    if (minPrice !== undefined && p.price < minPrice) return false;
    if (maxPrice !== undefined && p.price > maxPrice) return false;
    return true;
  });
}

function ensureAuthSheets() {
  const sheetId = process.env.GOOGLE_SHEET_ID;
  if (!sheetId) throw new Error('GOOGLE_SHEET_ID tidak diset');
  const auth = getGoogleJwtClient();
  const sheets = google.sheets({ version: 'v4', auth });
  const range = process.env.GOOGLE_SHEET_RANGE || 'Sheet1!A:K';
  return { sheets, sheetId, range };
}

export async function createProduct(data: ProductItem): Promise<ProductItem> {
  const id = `P-${Date.now()}`;
  const imgList = Array.isArray(data.images) && data.images.length ? data.images : (data.imageUrl ? [data.imageUrl] : []);
  const imgJoined = imgList.join(',');
  const row = [
    id,
    data.name || '',
    data.brand || '',
    data.size || '',
    data.color || '',
    data.price || 0,
    data.description || '',
    data.category || '',
    imgJoined,
    data.buyUrl || '',
    data.status || 'Published',
  ];
  const { sheets, sheetId, range } = ensureAuthSheets();
  await sheets.spreadsheets.values.append({
    spreadsheetId: sheetId,
    range,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [row] },
  });
  cachedProducts = null;
  return { ...data, id };
}

export async function updateProduct(id: string, data: Partial<ProductItem>): Promise<void> {
  const { sheets, sheetId, range } = ensureAuthSheets();
  const res = await sheets.spreadsheets.values.get({ spreadsheetId: sheetId, range });
  const values = res.data.values || [];
  const [header, ...rows] = values;
  const rowIndex = rows.findIndex((r) => String(r[0]).trim() === id);
  if (rowIndex === -1) throw new Error('Produk tidak ditemukan');
  const idx = rowIndex + 1; // offset header
  const current = rows[rowIndex];
  // current[8] may contain comma-separated URLs
  const currentRawImg: string = String(current[8] || '').trim();
  const currentImgs = currentRawImg ? currentRawImg.split(',').map(s=>s.trim()).filter(Boolean) : [];
  const nextImgs = (Array.isArray(data.images) ? data.images : undefined) || (data.imageUrl ? [data.imageUrl] : currentImgs);
  const imgJoined = nextImgs.join(',');
  const merged = {
    id: current[0],
    name: data.name ?? current[1],
    brand: data.brand ?? current[2],
    size: data.size ?? current[3],
    color: data.color ?? current[4],
    price: data.price ?? current[5],
    description: data.description ?? current[6],
    category: data.category ?? current[7],
    imageUrl: imgJoined,
    buyUrl: data.buyUrl ?? current[9],
    status: data.status ?? current[10],
  };
  const rowRange = `${(process.env.GOOGLE_SHEET_RANGE || 'Sheet1!A:K').split('!')[0]}!A${idx + 1}:K${idx + 1}`;
  await sheets.spreadsheets.values.update({
    spreadsheetId: sheetId,
    range: rowRange,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [[
      merged.id,
      merged.name,
      merged.brand,
      merged.size,
      merged.color,
      merged.price,
      merged.description,
      merged.category,
      merged.imageUrl,
      merged.buyUrl,
      merged.status,
    ]] },
  });
  cachedProducts = null;
}

export async function deleteProduct(id: string): Promise<void> {
  const { sheets, sheetId, range } = ensureAuthSheets();
  const res = await sheets.spreadsheets.values.get({ spreadsheetId: sheetId, range });
  const values = res.data.values || [];
  const [header, ...rows] = values;
  const rowIndex = rows.findIndex((r) => String(r[0]).trim() === id);
  if (rowIndex === -1) throw new Error('Produk tidak ditemukan');
  const idx = rowIndex + 2; // +2: header (1) + 1-based index
  const sheetName = (process.env.GOOGLE_SHEET_RANGE || 'Sheet1!A:K').split('!')[0];
  const clearRange = `${sheetName}!A${idx}:K${idx}`;
  await sheets.spreadsheets.values.clear({ spreadsheetId: sheetId, range: clearRange, requestBody: {} });
  cachedProducts = null;
}


