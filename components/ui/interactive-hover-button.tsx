"use client";

import React from "react";
import { ArrowRight, ArrowDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface InteractiveHoverButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  text?: string;
  variant?: 'black' | 'ai';
  icon?: 'right' | 'down';
  size?: 'sm' | 'md';
}

const InteractiveHoverButton = React.forwardRef<HTMLButtonElement, InteractiveHoverButtonProps>(
  ({ text = "Button", className, variant = 'ai', icon = 'right', size = 'md', ...props }, ref) => {
    const isBlack = variant === 'black';
    const bgColor = isBlack ? 'bg-black' : 'bg-indigo-600';
    const borderColor = isBlack ? 'border-black' : 'border-indigo-600';
    const IconComp = icon === 'down' ? ArrowDown : ArrowRight;
    const sizeClasses = size === 'sm'
      ? 'px-4 py-2 text-xs min-w-[9rem]'
      : 'px-6 py-3 text-sm min-w-[12rem]';
    const iconClasses = size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4';
    return (
      <button
        ref={ref}
        className={cn(
          "group relative inline-flex cursor-pointer select-none items-center justify-center overflow-hidden rounded-full border bg-white text-center font-semibold text-slate-800 whitespace-nowrap transition-colors duration-300 group-hover:border-transparent",
          sizeClasses,
          borderColor,
          className,
        )}
        {...props}
      >
        {/* Background overlay fills fully and scales to avoid clipping */}
        <div className={cn(
          "absolute inset-[-2px] z-0 origin-center scale-0 rounded-full transition-transform duration-300 ease-out group-hover:scale-100",
          bgColor,
        )} />

        <span className="relative z-20 inline-block translate-x-0 transition-all duration-300 group-hover:translate-x-10 group-hover:opacity-0">
          {text}
        </span>
        <div className="absolute inset-0 z-20 flex translate-x-12 items-center justify-center gap-2 px-4 text-white opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100">
          <span>{text}</span>
          <IconComp className={iconClasses} />
        </div>
      </button>
    );
  },
);

InteractiveHoverButton.displayName = "InteractiveHoverButton";

export { InteractiveHoverButton };


