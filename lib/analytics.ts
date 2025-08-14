export function trackEvent(event: string, params: Record<string, any> = {}) {
  if (typeof window === 'undefined') return;
  // Google Analytics gtag
  const w = window as any;
  if (typeof w.gtag === 'function') {
    w.gtag('event', event, params);
    return;
  }
  // Fallback dataLayer
  if (Array.isArray((w as any).dataLayer)) {
    (w as any).dataLayer.push({ event, ...params });
  }
}
