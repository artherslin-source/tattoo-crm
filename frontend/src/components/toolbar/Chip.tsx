"use client";

import React from "react";
import { cn } from "@/lib/utils";

export type ChipProps = {
  active?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
  icon?: React.ReactNode;
  className?: string;
};

export function Chip({ active, disabled, children, onClick, icon, className }: ChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      disabled={disabled}
      className={cn(
        "px-2.5 h-8 rounded-full text-xs transition-colors whitespace-nowrap border flex items-center gap-1.5 flex-shrink-0",
        "border-[var(--line)] bg-[#0F1216] text-[var(--muted)] hover:border-[var(--accent)]/40",
        "sm:px-3 sm:h-9 sm:text-sm sm:gap-2",
        active && "border-[var(--brand)]/60 bg-[#1A1405] text-[var(--text)] shadow-[0_6px_14px_rgba(0,0,0,.25)]",
        disabled && "opacity-60 cursor-not-allowed",
        className
      )}
    >
      {icon && <span className="text-[var(--muted)] flex-shrink-0">{icon}</span>}
      <span className="truncate max-w-[200px] sm:max-w-none">{children}</span>
    </button>
  );
}
