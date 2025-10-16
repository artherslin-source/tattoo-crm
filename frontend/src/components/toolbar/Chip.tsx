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
        "px-3 h-9 rounded-full text-sm transition-colors whitespace-nowrap border flex items-center gap-2",
        "border-[var(--line)] bg-[#0F1216] text-[var(--muted)] hover:border-[var(--accent)]/40",
        active && "border-[var(--brand)]/60 bg-[#1A1405] text-[var(--text)] shadow-[0_6px_14px_rgba(0,0,0,.25)]",
        disabled && "opacity-60 cursor-not-allowed",
        className
      )}
    >
      {icon && <span className="text-[var(--muted)]">{icon}</span>}
      <span className="truncate">{children}</span>
    </button>
  );
}
