"use client";

import { trackEvent } from '@/lib/analytics';

export default function HeroCTAs() {
  return (
    <div className="mt-8 flex items-center justify-center gap-3">
      <a
        href="#katalog"
        onClick={() => trackEvent('cta_click', { label: 'hero_katalog' })}
        className="btn-primary"
      >
        Jelajahi Katalog
      </a>
      <a
        href="#chat"
        onClick={() => trackEvent('cta_click', { label: 'hero_chat' })}
        className="btn-ghost"
      >
        Chat AI
      </a>
    </div>
  );
}
