"use client";

interface StickyCTAProps {
  onClick: () => void;
  label: string;
}

export function StickyCTA({ onClick, label }: StickyCTAProps) {
  return (
    <div className="sm:hidden">
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50 bg-gradient-to-t from-black/90 via-black/60 to-transparent pt-6 pb-[calc(env(safe-area-inset-bottom)+1.5rem)]">
        <div className="pointer-events-auto px-4">
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
