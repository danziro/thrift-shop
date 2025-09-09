"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export default function SearchBar({ className = "" }: { className?: string }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (q.trim()) params.set("keyword", q.trim());
    router.push(`/katalog${params.toString() ? `?${params.toString()}` : ""}`);
  }
  return (
    <form onSubmit={onSubmit} className={`flex items-center gap-2 ${className}`} role="search" aria-label="Pencarian produk">
      <input
        value={q}
        onChange={(e)=>setQ(e.target.value)}
        placeholder="Cari sepatu: nama, brand, ukuran..."
        className="flex-1 rounded-xl border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
        aria-label="Kata kunci pencarian"
      />
      <button type="submit" className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 text-sm focus-visible:ring-2 focus-visible:ring-blue-300">Cari</button>
    </form>
  );
}
