"use client";

import { trackEvent } from '@/lib/analytics';
import { InteractiveHoverButton } from '@/components/ui/interactive-hover-button';

export default function HeroCTAs() {
  return (
    <div className="mt-8 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 sm:gap-4 w-full max-w-xl mx-auto">
      <a href="#katalog" onClick={() => trackEvent('cta_click', { label: 'hero_katalog' })} className="w-full sm:w-auto">
        <InteractiveHoverButton text="Jelajahi Katalog" variant="black" icon="down" className="w-full" />
      </a>
      <InteractiveHoverButton
        text="Chat AI"
        variant="ai"
        icon="right"
        className="w-full sm:w-auto active:scale-[.98]"
        onClick={(e) => {
          e.preventDefault();
          trackEvent('cta_click', { label: 'hero_chat' });
          try { window.dispatchEvent(new Event('chat:open')); } catch {}
        }}
        aria-label="Buka Chat AI"
      />
    </div>
  );
}
