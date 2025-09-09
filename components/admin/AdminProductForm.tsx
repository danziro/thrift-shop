"use client";

import { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

const productSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2, 'Nama minimal 2 karakter'),
  brand: z.string().optional().or(z.literal('')),
  size: z.string().optional().or(z.literal('')),
  color: z.string().optional().or(z.literal('')),
  price: z.coerce.number().nonnegative({ message: 'Harga tidak valid' }),
  description: z.string().optional().or(z.literal('')),
  category: z.string().default('sepatu'),
  imageUrl: z
    .string()
    .trim()
    .refine(v => v === '' || /^https?:\/\//i.test(v), { message: 'URL gambar harus diawali http(s) atau kosong' }),
  images: z.array(z.string()).optional(),
  buyUrl: z
    .string()
    .trim()
    .optional()
    .refine(v => !v || v === '' || /^https?:\/\//i.test(v), { message: 'URL beli harus diawali http(s) atau kosong' })
    .or(z.literal('')),
  status: z.enum(['Published','Draft','Sold']).default('Published'),
  stock: z.coerce.number().int().nonnegative().default(1),
});
// Use z.input so the resolver and react-hook-form types align (input shape)
export type AdminProductFormValues = z.input<typeof productSchema>;

export function AdminProductForm({
  value,
  onChange,
  onSubmit,
  saving,
}: {
  value: AdminProductFormValues;
  onChange?: (v: AdminProductFormValues) => void;
  onSubmit: (v: AdminProductFormValues) => Promise<void> | void;
  saving?: boolean;
}) {
  const { register, handleSubmit, watch, setValue, formState: { errors }, reset } = useForm<AdminProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: value,
    mode: 'onBlur',
  });
  const firstImageUrl = watch('imageUrl');
  const [dragOver, setDragOver] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    reset(value);
  }, [value, reset]);

  type ImgItem = { id: string; localUrl: string; remoteUrl?: string; uploading?: boolean; error?: string };
  const [images, setImages] = useState<ImgItem[]>([]);

  // Seed initial images from value.images (or fallback to value.imageUrl) for edit mode
  useEffect(() => {
    const urls: string[] = Array.isArray(value.images) && value.images.length
      ? value.images
      : value.imageUrl
        ? [value.imageUrl]
        : [];
    if (!urls.length) return;
    setImages((prev) => {
      const exist = new Set(prev.map((i) => i.remoteUrl || i.localUrl));
      const additions = urls
        .filter((u) => u && !exist.has(u))
        .map((u, idx) => ({ id: `initial-${idx}-${u}`, localUrl: u, remoteUrl: u }));
      if (!additions.length) return prev;
      return [...additions, ...prev];
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value.images, value.imageUrl]);

  // Keep form value.imageUrl and images in sync with uploaded list
  useEffect(() => {
    const remoteUrls = images.map(i => i.remoteUrl).filter((u): u is string => Boolean(u));
    const first = remoteUrls[0] || '';
    if (first && first !== firstImageUrl) {
      setValue('imageUrl', first, { shouldDirty: true, shouldValidate: true });
      setValue('images', remoteUrls, { shouldDirty: true, shouldValidate: false });
      if (onChange) onChange({ ...value, imageUrl: first, images: remoteUrls });
    }
    // if no images left, clear
    if (!first && firstImageUrl) {
      setValue('imageUrl', '', { shouldDirty: true, shouldValidate: true });
      setValue('images', [], { shouldDirty: true, shouldValidate: false });
      if (onChange) onChange({ ...value, imageUrl: '', images: [] });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [images]);

  // Clear previews when parent resets to empty (after submit)
  useEffect(() => {
    const hasIncoming = (Array.isArray(value.images) && value.images.length > 0) || Boolean(value.imageUrl);
    if (!hasIncoming && images.length > 0) {
      setImages([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value.images, value.imageUrl]);

  async function resizeImageToWebp(file: File, maxDim = 1600, quality = 0.85): Promise<Blob> {
    // Skip resize for very small images
    const imgBitmap = await createImageBitmap(file).catch(() => null);
    if (!imgBitmap) return file;
    let { width, height } = imgBitmap;
    const scale = Math.min(1, maxDim / Math.max(width, height));
    const targetW = Math.max(1, Math.round(width * scale));
    const targetH = Math.max(1, Math.round(height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = targetW; canvas.height = targetH;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.drawImage(imgBitmap, 0, 0, targetW, targetH);
    const blob: Blob | null = await new Promise((resolve) => canvas.toBlob((b) => resolve(b), 'image/webp', quality));
    return blob || file;
  }

  async function uploadFiles(fileList: FileList | File[]) {
    setErrorMsg(null);
    const files = Array.from(fileList);
    if (images.length + files.length > 10) {
      setErrorMsg('Maksimal 10 gambar');
      return;
    }
    for (const file of files) {
      const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      const localUrl = URL.createObjectURL(file);
      setImages((prev) => [...prev, { id, localUrl, uploading: true }]);
      try {
        const optimized = await resizeImageToWebp(file);
        const fd = new FormData();
        const webpFile = new File([optimized], file.name.replace(/\.[^.]+$/, '.webp'), { type: 'image/webp' });
        fd.append('file', webpFile);
        const res = await fetch('/api/admin/upload', { method:'POST', body: fd });
        const ct = res.headers.get('content-type') || '';
        let data: any = null;
        if (ct.includes('application/json')) {
          data = await res.json();
        } else {
          const text = await res.text();
          throw new Error(text || 'Upload gagal (non-JSON response)');
        }
        if (!res.ok || !data?.url) throw new Error(data?.error || 'Upload gagal');
        setImages((prev) => prev.map((it) => it.id === id ? { ...it, remoteUrl: data.url, uploading: false } : it));
      } catch (err: any) {
        const message = err?.message || 'Upload gagal';
        setImages((prev) => prev.map((it) => it.id === id ? { ...it, error: message, uploading: false } : it));
        setErrorMsg(message);
      }
    }
  }

  function onDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
    const files = e.dataTransfer.files;
    if (files && files.length) uploadFiles(files).catch(()=>{});
  }

  useEffect(() => {
    if (onChange) {
      const sub = watch((vals) => onChange(vals as AdminProductFormValues));
      return () => sub.unsubscribe();
    }
  }, [watch, onChange]);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
      {/* Info Dasar */}
      <div className="col-span-2">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Info Dasar</h3>
      </div>
      <div className="col-span-2">
        <label className="text-sm text-slate-700">Nama <span className="text-rose-600">*</span></label>
        <input
          {...register('name')}
          placeholder="Contoh: Nike Air Max 270"
          className="w-full mt-1 rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
          aria-required="true"
        />
        {errors.name && <p className="text-rose-600 text-xs mt-1">{errors.name.message}</p>}
      </div>

      <div className="col-span-2 h-px bg-gray-200 my-1 sm:my-2" />

      {/* Harga & Stok */}
      <div className="col-span-2">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Harga & Stok</h3>
      </div>

      <div>
        <label className="text-sm text-slate-700">Brand</label>
        <input
          {...register('brand')}
          placeholder="Misal: Nike, Adidas, Converse"
          className="w-full mt-1 rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
        />
      </div>
      <div>
        <label className="text-sm text-slate-700">Ukuran</label>
        <input
          {...register('size')}
          placeholder="Contoh: 42 EU / 9 US"
          className="w-full mt-1 rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
        />
      </div>

      <div>
        <label className="text-sm text-slate-700">Warna</label>
        <input
          {...register('color')}
          placeholder="Contoh: Hitam, Putih, Navy"
          className="w-full mt-1 rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
        />
      </div>
      <div>
        <label className="text-sm text-slate-700">Harga (Rp) <span className="text-rose-600">*</span></label>
        <input
          {...register('price', { valueAsNumber: true })}
          inputMode="numeric"
          placeholder="Contoh: 350000"
          className="w-full mt-1 rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
          aria-required="true"
        />
        {errors.price && <p className="text-rose-600 text-xs mt-1">{errors.price.message as string}</p>}
      </div>

      <div>
        <label className="text-sm text-slate-700">Stok</label>
        <div className="mt-1 flex items-center gap-2">
          <button type="button" className="h-10 w-10 grid place-items-center rounded-lg border text-lg" onClick={() => {
            const v = Number((watch('stock') as any) ?? 0);
            const next = Math.max(0, (isNaN(v) ? 0 : v) - 1);
            setValue('stock', next, { shouldDirty: true, shouldValidate: true });
            if (onChange) onChange({ ...value, stock: next });
          }}>-</button>
          <input
            {...register('stock', { valueAsNumber: true })}
            inputMode="numeric"
            className="w-24 h-10 rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 text-center"
          />
          <button type="button" className="h-10 w-10 grid place-items-center rounded-lg border text-lg" onClick={() => {
            const v = Number((watch('stock') as any) ?? 0);
            const next = Math.max(0, (isNaN(v) ? 0 : v) + 1);
            setValue('stock', next, { shouldDirty: true, shouldValidate: true });
            if (onChange) onChange({ ...value, stock: next });
          }}>+</button>
        </div>
        {errors.stock && <p className="text-rose-600 text-xs mt-1">Stok tidak valid</p>}
      </div>

      <div>
        <label className="text-sm text-slate-700">Kategori</label>
        <select
          {...register('category')}
          className="w-full mt-1 rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
        >
          {['sepatu','aksesoris','lainnya'].map((c)=>(<option key={c} value={c}>{c}</option>))}
        </select>
        <p className="text-[11px] text-slate-500 mt-1">Pilih jenis utama produk untuk memudahkan pencarian.</p>
      </div>

      <div className="col-span-2 h-px bg-gray-200 my-1 sm:my-2" />

      <div className="col-span-2">
        <label className="text-sm text-slate-700">Deskripsi</label>
        <textarea
          {...register('description')}
          placeholder="Deskripsi kondisi, catatan ukuran/defect ringan, dll."
          className="w-full mt-1 rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
          rows={3}
        />
      </div>

      <div className="col-span-2">
        <label className="text-sm text-slate-700">Upload Gambar (maks 10)</label>
        <div
          className={`mt-1 border-2 border-dashed rounded-xl p-4 text-center ${dragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}`}
          onDragOver={(e)=>{e.preventDefault(); setDragOver(true);}}
          onDragLeave={()=>setDragOver(false)}
          onDrop={onDrop}
        >
          <p className="text-sm text-slate-600">Tarik & lepas gambar di sini atau pilih file</p>
          <div className="mt-2 flex items-center justify-center gap-3">
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-xl border border-gray-300 px-3 py-2 text-sm text-slate-700 bg-white hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300"
              onClick={() => fileInputRef.current?.click()}
            >
              Pilih File
            </button>
            <span className="text-xs text-slate-500">PNG/JPG/WebP • Maks 10 file</span>
            <input ref={fileInputRef} type="file" className="hidden" multiple accept="image/*" onChange={(e)=>{ if (e.target.files?.length) uploadFiles(e.target.files).catch(()=>{}); }} />
          </div>

          {images.length > 0 && (
            <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {images.map((it, idx) => (
                <div key={it.id} className="relative rounded-xl overflow-hidden bg-gray-100 border">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={it.remoteUrl || it.localUrl} alt={`preview-${idx}`} className="w-full h-32 sm:h-36 object-cover" />
                  <div className="absolute top-1 right-1 flex gap-1">
                    {it.uploading && <span className="text-[10px] bg-black/60 text-white px-1.5 py-0.5 rounded">Uploading...</span>}
                    <button type="button" className="bg-black/60 text-white rounded px-1.5 py-0.5 text-xs" onClick={()=>{
                      setImages((prev)=>{
                        const next = prev.filter(p=>p.id!==it.id);
                        return next;
                      });
                    }}>Hapus</button>
                  </div>
                  {it.error && <div className="absolute inset-x-0 bottom-0 bg-rose-600 text-white text-[10px] px-2 py-1">{it.error}</div>}
                </div>
              ))}
            </div>
          )}
        </div>
        {errorMsg && <p className="text-rose-600 text-xs mt-1">{errorMsg}</p>}
        {errors.imageUrl && <p className="text-rose-600 text-xs mt-1">{errors.imageUrl.message}</p>}
      </div>

      <div className="col-span-2">
        <label className="text-sm text-slate-700">Buy URL (opsional)</label>
        <input
          {...register('buyUrl')}
          placeholder="https://link-beli.com/..."
          className="w-full mt-1 rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
        />
        {errors.buyUrl && <p className="text-rose-600 text-xs mt-1">{errors.buyUrl.message}</p>}
      </div>

      {/* Status */}
      <div className="col-span-2 h-px bg-gray-200 my-1 sm:my-2" />
      <div className="col-span-2">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Status</h3>
      </div>
      <div className="col-span-2 md:col-span-1">
        <label className="text-sm text-slate-700">Status</label>
        <select
          {...register('status')}
          className="w-full mt-1 rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
        >
          <option>Published</option>
          <option>Draft</option>
          <option>Sold</option>
        </select>
      </div>
      {/* Submit standard (hidden on mobile) */}
      <div className="col-span-2 hidden sm:block">
        <button type="submit" disabled={!!saving} className="btn btn-primary">
          {saving ? 'Menyimpan...' : 'Simpan'}
        </button>
      </div>

      {/* Sticky submit bar for mobile */}
      <div className="sm:hidden col-span-2 sticky bottom-0 left-0 right-0 bg-white border-t mt-2 -mx-1">
        <div className="p-2">
          <button type="submit" disabled={!!saving} className="w-full btn btn-primary">
            {saving ? 'Menyimpan...' : 'Simpan'}
          </button>
        </div>
      </div>
    </form>
  );
}
