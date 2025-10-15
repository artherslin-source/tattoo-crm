"use client";

import { useEffect, useState } from "react";

interface StickyCTAProps {
  onClick: () => void;
  label: string;
}

export function StickyCTA({ onClick, label }: StickyCTAProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const handleScroll = () => {
      const { scrollHeight, clientHeight, scrollTop } = document.documentElement;
      const distanceToBottom = scrollHeight - (scrollTop + clientHeight);
      setIsVisible(distanceToBottom > 96); // 保留 footer 滑動空間，避免被 CTA 阻擋
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  return (
    <div className="sm:hidden">
      <div
        className={`pointer-events-none fixed inset-x-0 bottom-0 z-50 bg-gradient-to-t from-black/90 via-black/60 to-transparent pt-6 pb-[calc(env(safe-area-inset-bottom)+1.5rem)] transition-transform duration-300 ease-out ${
          isVisible ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <div className={`px-4 transition-opacity duration-200 ${isVisible ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"}`}>
          <button
            type="button"
            onClick={onClick}
            className="block w-full rounded-full bg-yellow-400 py-3 text-center text-base font-semibold text-black shadow-lg shadow-yellow-400/40 transition hover:bg-yellow-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-black/80"
          >
            {label}
          </button>
        </div>
      </div>
    </div>
  );
}
