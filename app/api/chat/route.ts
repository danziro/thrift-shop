import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { GoogleGenAI } from '@google/genai';
import { fetchSheetProducts, filterProducts, type SearchParams } from '@/lib/sheets';

const openaiApiKey = process.env.OPENAI_API_KEY;
const geminiApiKey = process.env.GEMINI_API_KEY;
const geminiModel = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const llmTimeoutMs = Number(process.env.LLM_TIMEOUT_MS || 6000);
const useLlmAssistantMsg = String(process.env.CHAT_MESSAGE_USE_LLM || 'false') === 'true';
const openai = openaiApiKey ? new OpenAI({ apiKey: openaiApiKey }) : null;
// @google/genai akan mengambil GEMINI_API_KEY dari env secara otomatis
const gemini = geminiApiKey ? new GoogleGenAI({}) : null;

const functionSchema = {
  name: 'search_products',
  description: 'Mencari produk berdasarkan filter dari user',
  parameters: {
    type: 'object',
    properties: {
      kategori: { type: 'string' },
      max_price: { type: 'number' },
      min_price: { type: 'number' },
      keyword: { type: 'string' },
      brand: { type: 'string' },
      size: { type: 'string' },
      color: { type: 'string' },
    },
  },
} as const;

function extractFirstJson(text: string): any | null {
  // Remove code fences if present
  const cleaned = text.replace(/```[a-zA-Z]*\n([\s\S]*?)```/g, '$1').trim();
  // Try direct parse
  try { return JSON.parse(cleaned); } catch {}
  // Fallback: find first {...}
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (match) {
    try { return JSON.parse(match[0]); } catch {}
  }
  return null;
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const userMessage: string = body?.message || '';
    if (!userMessage) {
      return NextResponse.json({ error: 'message is required' }, { status: 400 });
    }

    // Step 1: minta model mengekstrak parameter function
    const tools: OpenAI.Chat.Completions.ChatCompletionTool[] = [
      {
        type: 'function',
        function: functionSchema as any,
      },
    ];

    let params: SearchParams = {};
    if (gemini) {
      // Gunakan Gemini (SDK baru) dengan timeout
      const prompt = `Kamu akan mengekstrak parameter pencarian sepatu. Output-kan HANYA JSON valid tanpa teks lain.
Skema: { "kategori": string(optional), "max_price": number(optional), "min_price": number(optional), "keyword": string(optional), "brand": string(optional), "size": string(optional), "color": string(optional) }
Contoh output: {"kategori":"sepatu","brand":"nike","color":"hitam","size":"42","max_price":500000,"keyword":"nike hitam 42"}
Teks pengguna: "${userMessage}"`;
      try {
        const raced = await Promise.race([
          gemini.models.generateContent({
            model: geminiModel,
            contents: prompt,
            config: { responseMimeType: 'application/json', temperature: 0 },
          }),
          new Promise((resolve) => setTimeout(() => resolve(null), llmTimeoutMs)),
        ] as const);
        const text = (raced as any)?.text ? String((raced as any).text).trim() : '';
        if (text) {
          const parsed = extractFirstJson(text);
          params = parsed && typeof parsed === 'object' ? parsed : {};
        }
      } catch {
        // fallback di bawah
      }
    } else if (openai) {
      try {
        const extraction = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: 'Kamu adalah asisten toko thrift. Tugasmu memahami kebutuhan user lalu memanggil fungsi search_products dengan parameter yang relevan.' },
            { role: 'user', content: userMessage },
          ],
          tools,
          tool_choice: { type: 'function', function: { name: 'search_products' } },
          temperature: 0,
        });
        const toolCall = extraction.choices[0]?.message?.tool_calls?.[0] as any;
        if (toolCall && toolCall.type === 'function' && toolCall.function && typeof toolCall.function.arguments === 'string') {
          try { params = JSON.parse(toolCall.function.arguments); } catch {}
        }
      } catch {
        // fallback di bawah
      }
    } else {
      // Heuristik sederhana untuk demo jika model tidak tersedia
      const lower = userMessage.toLowerCase();
      const priceNums = Array.from(lower.matchAll(/(\d+[\.]?\d*)\s?k/g)).map((m) => Number(m[1]) * 1000);
      const maxPrice = priceNums.length ? Math.max(...priceNums) : undefined;
      const minPriceMatch = lower.match(/(di atas|min)\s*(\d+[\.]?\d*)\s?k/);
      const minPrice = minPriceMatch ? Number(minPriceMatch[2]) * 1000 : undefined;
      const categoryMatch = lower.match(/(hoodie|kemeja|celana|t\-?shirt|kaos|sepatu|sneaker)/);
      const kategori = categoryMatch ? categoryMatch[1].replace('tshirt', 't-shirt') : undefined;
      const brandMatch = lower.match(/(nike|adidas|converse|vans|new balance|puma|reebok|asics|fila|onitsuka)/);
      const brand = brandMatch ? brandMatch[1] : undefined;
      const colorMatch = lower.match(/(hitam|putih|merah|biru|hijau|abu|coklat|cream|krem|kuning)/);
      const color = colorMatch ? colorMatch[1] : undefined;
      const sizeMatch = lower.match(/\b(3[5-9]|4[0-6]|[8-9](?:\.5)?|1[0-2](?:\.5)?)\b/); // includes EU 35-46 and US 8-12.5
      const size = sizeMatch ? sizeMatch[1] : undefined;
      const keyword = lower.replace(/[^a-z0-9\s]/g, ' ').split(' ').filter(Boolean).slice(0, 8).join(' ');

      params = { kategori, max_price: maxPrice, min_price: minPrice, keyword, brand, size, color };
    }

    // Jika ekstraksi dari model gagal (params kosong), pakai fallback keyword dari userMessage
    if (!params || (Object.keys(params).length === 0)) {
      const lower = userMessage.toLowerCase();
      params = { keyword: lower };
    }

    const products = await fetchSheetProducts();
    let result = filterProducts(products, params);
    let relaxedApplied = false;
    // Jika tidak ada hasil, coba relaksasi filter harga agar lebih toleran
    if (result.length === 0 && (params.min_price !== undefined || params.max_price !== undefined)) {
      const relaxed: SearchParams = { ...params };
      delete (relaxed as any).min_price;
      delete (relaxed as any).max_price;
      result = filterProducts(products, relaxed);
      if (result.length > 0) relaxedApplied = true;
    }

    // Step 2: Buat pesan natural asisten berbasis hasil (grounded, anti-halusinasi)
    let assistantMsg = '';
    try {
      const count = result.length;
      const prices = result
        .map((p) => Number(p.price || 0))
        .filter((n) => Number.isFinite(n) && n > 0) as number[];
      const minPrice = prices.length ? Math.min(...prices) : undefined;
      const maxPrice = prices.length ? Math.max(...prices) : undefined;
      if (!useLlmAssistantMsg) {
        assistantMsg = count
          ? `Aku nemuin ${count} produk yang cocok${relaxedApplied ? ' (beberapa filter harga aku longgarkan agar tetap ada rekomendasi)' : ''}. Cek kartunya di bawah ya—kalau butuh penyesuaian (brand/ukuran/warna/budget), tinggal bilang.`
          : 'Belum ketemu yang pas. Bisa sebut brand, ukuran, warna, atau budget yang kamu mau?';
      } else if (gemini) {
        const sys = `Peran: Asisten toko thrift berbahasa Indonesia.
Aturan ketat:
- Hanya gunakan data hasil yang diberikan server (daftar produk). Jangan pernah menebak atau menciptakan produk.
- Saat ADA hasil: jangan sebut nama/brand/model/ukuran/warna spesifik apapun. Cukup sebut jumlah hasil dan arahkan pengguna untuk klik kartu produk di bawah untuk detail.
- Saat TIDAK ADA hasil: jangan menyebut produk apapun. Minta klarifikasi preferensi (brand/ukuran/warna/budget/kategori) secara singkat.
- Jangan menulis kode. Singkat, natural, ramah, non-bertele-tele. Hindari klaim di luar data.`;
        const safeSummary = { count, minPrice, maxPrice, relaxedApplied };
        const userCtx = `Permintaan pengguna: ${userMessage}\nParam pencarian: ${JSON.stringify(params)}\nRingkasan hasil (aman): ${JSON.stringify(safeSummary)}\nCatatan: Jika relaxedApplied true, akui secara singkat bahwa filter harga dilonggarkan untuk memberi alternatif terdekat. Ikuti Aturan ketat di atas.`;
        const raced = await Promise.race([
          gemini.models.generateContent({
            model: geminiModel,
            contents: `${sys}\n\n${userCtx}`,
            config: { temperature: 0.2 },
          }),
          new Promise((resolve) => setTimeout(() => resolve(null), llmTimeoutMs)),
        ] as const);
        const text = (raced as any)?.text ? String((raced as any).text).trim() : '';
        if (text) assistantMsg = text;
      } else if (openai) {
        const completion = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          temperature: 0.5,
          messages: [
            { role: 'system', content: 'Peran: Asisten toko thrift berbahasa Indonesia. Aturan: hanya gunakan data hasil dari server; dilarang menyebut nama/brand/model/ukuran/warna spesifik; jika ada hasil, sebut jumlah dan arahkan klik kartu; jika tidak ada hasil, minta klarifikasi preferensi. Jangan mengada-ada. Singkat, natural.' },
            { role: 'user', content: `Permintaan: ${userMessage}\nParam: ${JSON.stringify(params)}\nRingkasan hasil (aman): ${JSON.stringify({ count, minPrice, maxPrice })}` },
          ],
        });
        assistantMsg = completion.choices?.[0]?.message?.content?.trim() || '';
      }
    } catch {}

    if (!assistantMsg) {
      assistantMsg = result.length
        ? `Aku nemuin ${result.length} produk yang mungkin cocok. Cek kartunya di bawah ya—kalau butuh penyesuaian (brand/ukuran/warna/budget), tinggal bilang.`
        : 'Belum ketemu yang pas. Bisa sebut brand, ukuran, warna, atau budget yang kamu mau?';
    }

    return NextResponse.json({
      query: params,
      products: result,
      message: assistantMsg,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Chat error' }, { status: 500 });
  }
}


