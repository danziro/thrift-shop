import { NextResponse } from 'next/server';
import { getSupabaseServiceClient } from '@/lib/supabase';

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get('file') as File | null;
    if (!file) return NextResponse.json({ error: 'file is required' }, { status: 400 });
    if (typeof file.size === 'number' && file.size === 0) {
      return NextResponse.json({ error: 'file is empty' }, { status: 400 });
    }
    const bucket = process.env.SUPABASE_BUCKET || 'products';
    const supabase = getSupabaseServiceClient();
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE) {
      return NextResponse.json({ error: 'Supabase env tidak lengkap' }, { status: 500 });
    }
    const name = (file.name || '').trim();
    const guessedExt = name.includes('.') ? name.split('.').pop() : '';
    const ext = guessedExt || (file.type === 'image/webp' ? 'webp' : 'jpg');
    const path = `images/${Date.now()}-${Math.random().toString(16).slice(2)}.${ext}`;
    const { data, error } = await supabase.storage.from(bucket).upload(path, file, {
      contentType: file.type || 'application/octet-stream',
      cacheControl: '3600',
      upsert: false,
    });
    if (error) {
      return NextResponse.json({ error: error.message || 'upload error' }, { status: 500 });
    }
    const pub = supabase.storage.from(bucket).getPublicUrl(path);
    const publicUrl = pub?.data?.publicUrl;
    if (!publicUrl) {
      return NextResponse.json({ error: 'public url error' }, { status: 500 });
    }
    return NextResponse.json({ url: publicUrl });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'upload error' }, { status: 500 });
  }
}


