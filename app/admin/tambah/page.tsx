"use client";

import { useState } from "react";
import { z } from 'zod';
import { AdminProductForm, type AdminProductFormValues } from '@/components/admin/AdminProductForm';

const productSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2),
  brand: z.string().optional(),
  size: z.string().optional(),
  color: z.string().optional(),
  price: z.coerce.number().nonnegative(),
  description: z.string().optional(),
  category: z.string().default('sepatu'),
  imageUrl: z.string().url().or(z.literal('')),
  images: z.array(z.string().url()).optional(),
  buyUrl: z.string().url().optional(),
  status: z.enum(['Published','Draft']).default('Published'),
});

type Product = z.infer<typeof productSchema>;

export default function AdminTambahPage() {
  const [form, setForm] = useState<Product>({ name: '', price: 0, imageUrl: '', category: 'sepatu', status: 'Published' } as Product);
  const [saving, setSaving] = useState(false);

  function toast(message: string, type: 'success'|'error'|'info' = 'info') {
    const color = type === 'success' ? 'bg-green-500' : type === 'error' ? 'bg-rose-500' : 'bg-slate-700';
    const el = document.createElement('div');
    el.className = `fixed bottom-6 left-1/2 -translate-x-1/2 ${color} text-white px-4 py-2 rounded-xl shadow z-[9999]`;
    el.textContent = message;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 2200);
  }

  async function submitForm(values: AdminProductFormValues) {
    const parsed = productSchema.safeParse(values);
    if (!parsed.success) { toast(parsed.error.issues[0].message, 'error'); return; }
    setSaving(true);
    const res = await fetch('/api/admin/products', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(values) });
    if (!res.ok) {
      setSaving(false);
      return toast('Gagal menyimpan', 'error');
    }
    setForm({ name: '', price: 0, imageUrl: '', category: 'sepatu', status: 'Published' } as Product);
    setSaving(false);
    toast('Produk ditambahkan', 'success');
  }

  return (
    <main className="px-0 py-0">
      <div className="mx-auto max-w-3xl p-3 sm:p-4">
        <section className="card p-3 sm:p-4">
          <h1 className="text-xl font-semibold">Tambah barang</h1>
          <div className="mt-3">
            <AdminProductForm
              value={form as unknown as AdminProductFormValues}
              onChange={(v)=> setForm(v as unknown as Product)}
              onSubmit={submitForm}
              saving={saving}
            />
          </div>
        </section>
      </div>
    </main>
  );
}
