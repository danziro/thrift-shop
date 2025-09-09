// Generate favicon.ico and apple-touch-icon.png from public/logo.png
// Usage: npm run icons:gen
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import toIco from 'to-ico';

const root = path.resolve(process.cwd());
const publicDir = path.join(root, 'public');
const logoPng = path.join(publicDir, 'logo.png');
const appleTouch = path.join(publicDir, 'apple-touch-icon.png');
const faviconIco = path.join(publicDir, 'favicon.ico');

async function ensureLogoExists() {
  try {
    const st = await fs.stat(logoPng);
    if (!st.isFile()) throw new Error('logo.png is not a file');
  } catch {
    throw new Error('public/logo.png tidak ditemukan. Taruh logo PNG di public/logo.png terlebih dahulu.');
  }
}

async function genAppleTouch() {
  const buf = await sharp(logoPng)
    .resize(180, 180, { fit: 'cover' })
    .png({ compressionLevel: 9 })
    .toBuffer();
  await fs.writeFile(appleTouch, buf);
}

async function genFaviconIco() {
  // Buat beberapa ukuran umum untuk ICO (16, 32, 48)
  const sizes = [16, 32, 48];
  const bufs = await Promise.all(
    sizes.map((s) => sharp(logoPng).resize(s, s, { fit: 'cover' }).png().toBuffer())
  );
  const ico = await toIco(bufs);
  await fs.writeFile(faviconIco, ico);
}

(async () => {
  await ensureLogoExists();
  await genAppleTouch();
  await genFaviconIco();
  console.log('✔ Generated public/apple-touch-icon.png and public/favicon.ico');
})();
