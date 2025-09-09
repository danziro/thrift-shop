export const siteConfig = {
  name: 'ThriftTu',
  tagline: 'Bikin Gayamu Bicara',
  description: 'Thrift shop modern dengan kurasi berkualitas dan AI chatbot untuk bantu cari produk.',
  url: process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
  social: {
    instagram: 'https://instagram.com/',
    tiktok: 'https://tiktok.com/@',
    whatsapp: process.env.NEXT_PUBLIC_WHATSAPP_PHONE || '',
  },
  theme: {
    brand: '#2563eb',
    brandContrast: '#ffffff',
    bg: '#ffffff',
    fg: '#0f172a',
    muted: '#64748b'
  }
} as const;
