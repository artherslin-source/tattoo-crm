"use client";
import * as React from "react";

interface HorizontalScrollerProps {
  children: React.ReactNode;
  ariaLabel?: string;
}

export function HorizontalScroller({ children, ariaLabel }: HorizontalScrollerProps) {
  return (
    <div
      role="list"
      aria-label={ariaLabel}
      className="flex gap-3 overflow-x-auto scroll-smooth snap-x snap-mandatory [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {React.Children.map(children, (child, index) => (
        <div role="listitem" key={index} className="snap-start shrink-0 w-64">
          {child}
        </div>
      ))}
    </div>
  );
}
