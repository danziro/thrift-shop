export type TransformOptions = {
  width?: number;
  height?: number;
  quality?: number; // 1-100
  format?: 'jpeg' | 'webp' | 'png';
};

// Convert a Supabase public object URL into a render endpoint URL with transformations.
// Example:
// https://<ref>.supabase.co/storage/v1/object/public/bucket/path.jpg
// -> https://<ref>.supabase.co/storage/v1/render/image/public/bucket/path.jpg?format=jpeg&quality=80
export function toSupabaseTransformedUrl(inputUrl?: string | null, opts: TransformOptions = {}): string | undefined {
  if (!inputUrl) return undefined;
  try {
    const u = new URL(inputUrl);
    if (!u.hostname.endsWith('.supabase.co')) return inputUrl;

    // Only handle public object URLs
    const objectPrefix = '/storage/v1/object/public/';
    if (!u.pathname.startsWith(objectPrefix)) return inputUrl;

    // Build render image path
    const rest = u.pathname.slice(objectPrefix.length); // bucket/path
    u.pathname = `/storage/v1/render/image/public/${rest}`;

    const { width, height, quality, format } = opts;
    if (width) u.searchParams.set('width', String(width));
    if (height) u.searchParams.set('height', String(height));
    if (quality) u.searchParams.set('quality', String(quality));
    if (format) u.searchParams.set('format', format);

    // Default for WA: compress a bit
    if (!quality) u.searchParams.set('quality', '80');

    return u.toString();
  } catch {
    return inputUrl || undefined;
  }
}
