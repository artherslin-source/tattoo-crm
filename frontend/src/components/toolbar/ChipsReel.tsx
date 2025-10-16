"use client";

import React from "react";

export function ChipsReel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 sm:gap-4">
      <div className="flex-1 overflow-x-auto no-scrollbar sm:overflow-visible">
        <div className="flex gap-2 sm:flex-wrap sm:gap-3 pr-4 sm:pr-0 snap-x snap-mandatory">
          {React.Children.map(children, (child, index) => (
            <div key={index} className="snap-start shrink-0 sm:shrink">
              {child}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
