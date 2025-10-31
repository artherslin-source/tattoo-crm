"use client";

import { Search, X, SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { Chip } from "./Chip";
import { ChipsReel } from "./ChipsReel";

type ToolbarProps = {
  searchValue: string;
  onSearchChange: (value: string) => void;
  onClearSearch: () => void;
  chips: Array<{ id: string; label: string; active: boolean; onClick: () => void }>;
  onMoreFilters: () => void;
  activeFiltersCount?: number;
  isMultiSelect: boolean;
  onToggleSelectionMode?: () => void;
};

export function Toolbar({
  searchValue,
  onSearchChange,
  onClearSearch,
  chips,
  onMoreFilters,
  activeFiltersCount = 0,
  isMultiSelect,
  onToggleSelectionMode,
}: ToolbarProps) {
  return (
    <div className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] shadow-[0_8px_24px_rgba(0,0,0,.35)] p-4 sm:p-5 lg:p-6 space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
          <input
            value={searchValue}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="搜尋作品標題或描述..."
            className="h-11 w-full rounded-xl bg-[#0F1216] pl-12 pr-12 text-sm text-[var(--text)] placeholder:text-[var(--muted)]/70 border border-[var(--line)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
            aria-label="搜尋作品"
          />
          {searchValue && (
            <button
              type="button"
              onClick={onClearSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted)] hover:text-[var(--text)]"
              aria-label="清除搜尋"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <div className="flex items-center justify-between gap-2 sm:w-auto">
          {onToggleSelectionMode && (
            <button
              type="button"
              onClick={onToggleSelectionMode}
              className={cn(
                "h-11 rounded-xl border border-[var(--line)] px-4 text-sm font-medium text-[var(--muted)] transition",
                isMultiSelect
                  ? "border-[var(--brand)]/60 bg-[#1A1405] text-[var(--text)]"
                  : "hover:border-[var(--accent)]/40 hover:text-[var(--text)]"
              )}
            >
              {isMultiSelect ? "多選" : "單選"}
            </button>
          )}
          <button
            type="button"
            onClick={onMoreFilters}
            className="relative h-11 rounded-xl border border-[var(--line)] px-4 text-sm font-medium text-[var(--text)]/80 transition hover:border-[var(--accent)]/40"
          >
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4" />
              <span className="hidden sm:inline">更多條件</span>
              <span className="sm:hidden">篩選</span>
            </div>
            {activeFiltersCount > 0 && (
              <span className="absolute -right-2 -top-2 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[var(--brand)] px-1 text-xs font-semibold text-black shadow-md">
                {activeFiltersCount}
              </span>
            )}
          </button>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-medium uppercase tracking-[0.3em] text-[var(--muted)]/70">快速篩選</p>
        </div>
        <ChipsReel>
          {chips.map((chip) => (
            <Chip key={chip.id} active={chip.active} onClick={chip.onClick}>
              {chip.label}
            </Chip>
          ))}
        </ChipsReel>
      </div>
    </div>
  );
}
