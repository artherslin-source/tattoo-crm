"use client";

import React from "react";

export function ChipsReel({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full overflow-hidden">
      <div className="overflow-x-auto overflow-y-hidden no-scrollbar -mx-1 px-1 sm:overflow-visible sm:mx-0 sm:px-0">
        <div className="flex gap-2 sm:flex-wrap sm:gap-3 min-w-max sm:min-w-0">
          {React.Children.map(children, (child, index) => (
            <div key={index} className="flex-shrink-0 sm:flex-shrink">
              {child}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
