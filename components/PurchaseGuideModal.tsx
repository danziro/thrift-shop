"use client";

import { X } from "lucide-react";

type Props = {
  open: boolean;
  onClose: () => void;
};

export default function PurchaseGuideModal({ open, onClose }: Props) {
  if (!open) return null;
  return (
    <div className="modal-backdrop z-[70]" onClick={onClose}>
      <div
        className="modal-card w-[92vw] max-w-lg mx-auto mt-[10vh] p-5"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="cara-beli-title"
      >
        <div className="flex items-start justify-between mb-2">
          <h3 id="cara-beli-title" className="text-lg font-semibold text-slate-900">Cara Beli di Sneaker Thrift</h3>
          <button onClick={onClose} aria-label="Tutup" className="text-slate-600 hover:text-slate-900">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="prose prose-sm max-w-none text-slate-700">
          <ol className="list-decimal pl-4 space-y-2">
            <li>
              <strong>Cari produk</strong> lewat <em>Chat AI</em> atau jelajahi <strong>Katalog</strong>.
              Sebutkan brand, ukuran, warna, dan budget biar hasilnya akurat.
            </li>
            <li>
              <strong>Pilih produk</strong> yang cocok, lalu klik <em>Beli via WhatsApp</em>.
              Kamu akan diarahkan chat dengan admin toko.
            </li>
            <li>
              <strong>Admin cek ketersediaan</strong> barang secepatnya dan konfirmasikan detail pesananmu.
            </li>
            <li>
              <strong>Lakukan pembayaran</strong> sesuai instruksi admin.
              Sertakan bukti pembayaran agar proses lebih cepat.
            </li>
            <li>
              <strong>Pengiriman</strong>: setelah disetujui, kami proses dan kirim resi ke WhatsApp kamu.
            </li>
          </ol>
          <p className="mt-4 text-slate-600">Pertanyaan lain? Cukup ketik di Chat AI atau chat admin langsung—kami siap bantu.</p>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} className="px-3 py-2 text-sm rounded-xl border border-gray-300">Tutup</button>
        </div>
      </div>
    </div>
  );
}
