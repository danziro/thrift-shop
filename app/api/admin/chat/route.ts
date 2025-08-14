import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { GoogleGenAI } from '@google/genai';
import { createProduct, fetchSheetProducts, type ProductItem } from '@/lib/sheets';

const openaiApiKey = process.env.OPENAI_API_KEY;
const geminiApiKey = process.env.GEMINI_API_KEY;
const geminiModel = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const llmTimeoutMs = Number(process.env.LLM_TIMEOUT_MS || 6000);
const openai = openaiApiKey ? new OpenAI({ apiKey: openaiApiKey }) : null;
// @google/genai membaca GEMINI_API_KEY dari env
const gemini = geminiApiKey ? new GoogleGenAI({}) : null;

function withTimeout<T>(p: Promise<T>, ms = llmTimeoutMs): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('LLM timeout')), ms);
    p.then((v) => { clearTimeout(t); resolve(v); }).catch((e) => { clearTimeout(t); reject(e); });
  });
}

function extractFirstJson(text: string): any | null {
  const cleaned = text.replace(/```[a-zA-Z]*\n([\s\S]*?)```/g, '$1').trim();
  try { return JSON.parse(cleaned); } catch {}
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (match) {
    try { return JSON.parse(match[0]); } catch {}
  }
  return null;
}

function parseHeuristic(message: string): Partial<ProductItem> {
  const m = message;
  const lower = m.toLowerCase();

  // Size
  const sizeMatch = m.match(/ukuran\s*([a-z0-9\_\.\-\/]+)/i);
  const size = sizeMatch ? sizeMatch[1] : undefined;

  // Color
  let color: string | undefined;
  const colorLabel = m.match(/warna\s*([^,\n]+)/i);
  if (colorLabel) color = colorLabel[1].trim();

  // Condition -> description
  let description: string | undefined;
  const cond = m.match(/(kondisi|condition)\s*([0-9]{1,3}%)/i);
  if (cond) description = `Kondisi: ${cond[2]}`;

  // Price: 500k / 500.000 / Rp 500.000
  let price = 0;
  const kMatch = lower.match(/(\d+(?:[\.,]\d+)?)\s*k\b/);
  if (kMatch) {
    price = Math.round(parseFloat(kMatch[1].replace(',', '.')) * 1000);
  } else {
    const rpMatch = m.match(/(?:rp\.?\s*)?([0-9][0-9\.,]{2,})/i);
    if (rpMatch) {
      price = Number(rpMatch[1].replace(/[^0-9]/g, '')) || 0;
    }
  }

  // Brand detection simple list
  const brands = ['nike','adidas','vans','converse','puma','reebok','asics','new balance','nb'];
  let brand: string | undefined;
  for (const b of brands) {
    if (lower.includes(b)) {
      brand = b === 'nb' ? 'New Balance' : b.replace(/\b\w/g, (c) => c.toUpperCase());
      if (b === 'new balance') brand = 'New Balance';
      break;
    }
  }

  // Name: after 'tambahkan sepatu' up to comma
  let name: string | undefined;
  const nameMatch = m.match(/tambahkan\s+sepatu\s+([^,\n]+)/i);
  if (nameMatch) name = nameMatch[1].trim();

  // Default category
  const category = lower.includes('sepatu') ? 'sepatu' : 'lainnya';

  return { name, brand, size, color, description, price, category };
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const userMessage: string = body?.message || '';
    const imageOverride: string | undefined = body?.imageUrl || undefined;
    if (!userMessage) {
      return NextResponse.json({ error: 'message is required' }, { status: 400 });
    }

    // Intent: Cek ketersediaan produk berdasarkan ID
    const lowerMsg = userMessage.toLowerCase();
    const bracketId = userMessage.match(/\[([^\]]+)\]/)?.[1]?.trim();
    const pDashId = userMessage.match(/\bP-\d{6,}\b/i)?.[0];
    const afterId = userMessage.match(/\b(?:id)\s*[:\-]?\s*([A-Za-z0-9_-]+)\b/i)?.[1];
    const idCandidate = (bracketId || pDashId || afterId)?.trim();
    const isAskAvailability = /\b(apakah|ada|tersedia|available|exists|cek)\b/i.test(userMessage);
    if (idCandidate && isAskAvailability) {
      const all = await fetchSheetProducts();
      const found = all.find(p => String(p.id || '').trim().toLowerCase() === idCandidate.toLowerCase());
      if (found) {
        return NextResponse.json({
          message: `Produk ${found.id} — ${found.name} ADA dengan harga Rp ${Number(found.price||0).toLocaleString('id-ID')}.`,
          product: found,
        });
      }
      return NextResponse.json({ message: `Produk ${idCandidate} TIDAK ditemukan.` });
    }

    let extracted: any = null;

    if (gemini) {
      const prompt = `Ekstrak detail produk dari teks berikut dan kembalikan HANYA JSON valid dengan field:
{"name": string, "brand": string(optional), "size": string(optional), "color": string(optional), "price": number(optional), "description": string(optional), "category": string(optional, default "sepatu"), "imageUrl": string(optional), "buyUrl": string(optional), "status": string(optional, default "Published")}
Teks: "${userMessage}"`;
      const result = await withTimeout(
        gemini.models.generateContent({
          model: geminiModel,
          contents: prompt,
          config: { responseMimeType: 'application/json', temperature: 0 },
        })
      );
      const text = String((result as any)?.text || '').trim();
      extracted = extractFirstJson(text);
    } else if (openai) {
      const completion = await withTimeout(openai.chat.completions.create({
        model: 'gpt-4o-mini',
        temperature: 0,
        messages: [
          { role: 'system', content: 'Ekstrak detail produk dan kembalikan HANYA JSON valid sesuai skema yang diminta.' },
          { role: 'user', content: `Skema: { "name": string, "brand": string(optional), "size": string(optional), "color": string(optional), "price": number(optional), "description": string(optional), "category": string(optional, default \"sepatu\"), "imageUrl": string(optional), "buyUrl": string(optional), "status": string(optional, default \"Published\") }\nTeks: ${userMessage}` },
        ],
      }));
      const text = completion.choices[0]?.message?.content?.trim() || '';
      extracted = extractFirstJson(text);
    }

    if (!extracted || typeof extracted !== 'object') {
      extracted = parseHeuristic(userMessage);
    }

    // Normalize & defaults
    const name = String(extracted.name || '').trim() || 'Produk Tanpa Nama';
    const brand = extracted.brand ? String(extracted.brand).trim() : undefined;
    const size = extracted.size ? String(extracted.size).trim() : undefined;
    const color = extracted.color ? String(extracted.color).trim() : undefined;
    const description = extracted.description ? String(extracted.description).trim() : '';
    const category = (extracted.category ? String(extracted.category) : 'sepatu').trim() || 'sepatu';
    const imageUrl = (imageOverride ? String(imageOverride) : (extracted.imageUrl ? String(extracted.imageUrl) : '')).trim();
    const buyUrl = extracted.buyUrl ? String(extracted.buyUrl).trim() : undefined;
    let price = Number(extracted.price || 0);
    if (!Number.isFinite(price)) price = 0;
    const status = String(extracted.status || 'Published').trim() === 'Draft' ? 'Draft' : 'Published';

    const toCreate: ProductItem = {
      name,
      brand,
      size,
      color,
      price,
      description,
      category,
      imageUrl,
      buyUrl,
      status,
    } as ProductItem;

    const created = await createProduct(toCreate);
    return NextResponse.json({ product: created });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Admin chat error' }, { status: 500 });
  }
}
