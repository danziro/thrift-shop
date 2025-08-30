"use client";

import { trackEvent } from '@/lib/analytics';
import { InteractiveHoverButton } from '@/components/ui/interactive-hover-button';

export default function HeroCTAs() {
  return (
    <div className="mt-8 flex items-center justify-center gap-4">
      <a href="#katalog" onClick={() => trackEvent('cta_click', { label: 'hero_katalog' })}>
        <InteractiveHoverButton text="Jelajahi Katalog" variant="black" icon="down" />
      </a>
      <a href="#chat" onClick={() => trackEvent('cta_click', { label: 'hero_chat' })}>
        <InteractiveHoverButton text="Chat AI" variant="ai" icon="right" />
      </a>
    </div>
  );
}
