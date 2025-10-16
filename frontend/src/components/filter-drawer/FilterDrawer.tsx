"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { Chip } from "../toolbar/Chip";

import { cn } from "@/lib/utils";

type AdvancedFiltersState = {
  dateRange: {
    from: string | null;
    to: string | null;
  };
  priceRange: {
    min: string;
    max: string;
  };
  statuses: string[];
  bodyParts: string[];
};

type FilterDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  draftFilters: AdvancedFiltersState;
  onDraftChange: (filters: AdvancedFiltersState) => void;
  onReset: () => void;
  onApply: () => void;
  availableBodyParts: string[];
};

const STATUS_OPTIONS = ["已發布", "草稿", "隱藏"];

export function FilterDrawer({
  open,
  onOpenChange,
  draftFilters,
  onDraftChange,
  onReset,
  onApply,
  availableBodyParts,
}: FilterDrawerProps) {
  const toggleArrayValue = (key: "statuses" | "bodyParts", value: string) => {
    const current = draftFilters[key];
    const exists = current.includes(value);
    const next = exists ? current.filter((item) => item !== value) : [...current, value];
    onDraftChange({ ...draftFilters, [key]: next });
  };

  const handleDateChange = (field: "from" | "to", value: string) => {
    onDraftChange({
      ...draftFilters,
      dateRange: { ...draftFilters.dateRange, [field]: value || null },
    });
  };

  const handlePriceChange = (field: "min" | "max", value: string) => {
    if (!/^[0-9]*$/.test(value)) {
      return;
    }
    onDraftChange({
      ...draftFilters,
      priceRange: { ...draftFilters.priceRange, [field]: value },
    });
  };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm" />
        <DialogPrimitive.Content
          className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-[var(--line)] bg-[var(--panel)] text-[var(--text)] shadow-[0_8px_24px_rgba(0,0,0,.5)]"
        >
          <div className="flex items-center justify-between border-b border-[var(--line)] px-6 py-5">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-[var(--brand)]/70">Filter</p>
              <h2 className="text-xl font-semibold">更多條件</h2>
            </div>
            <DialogPrimitive.Close className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--line)] text-[var(--text)]/80 transition hover:border-[var(--accent)]/40 hover:text-[var(--text)]">
              <X className="h-4 w-4" />
            </DialogPrimitive.Close>
          </div>

          <div className="flex-1 space-y-8 overflow-y-auto px-6 py-6">
            <section className="space-y-3">
              <h3 className="text-sm font-semibold text-[var(--text)]">日期區間</h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-xs text-[var(--muted)]">起始日期</span>
                  <input
                    type="date"
                    value={draftFilters.dateRange.from ?? ""}
                    onChange={(event) => handleDateChange("from", event.target.value)}
                    className="h-11 w-full rounded-xl border border-[var(--line)] bg-[#0F1216] px-3 text-sm text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-xs text-[var(--muted)]">結束日期</span>
                  <input
                    type="date"
                    value={draftFilters.dateRange.to ?? ""}
                    onChange={(event) => handleDateChange("to", event.target.value)}
                    className="h-11 w-full rounded-xl border border-[var(--line)] bg-[#0F1216] px-3 text-sm text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                  />
                </label>
              </div>
            </section>

            <section className="space-y-3">
              <h3 className="text-sm font-semibold text-[var(--text)]">價格區間</h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-xs text-[var(--muted)]">最低價格</span>
                  <input
                    inputMode="numeric"
                    value={draftFilters.priceRange.min}
                    onChange={(event) => handlePriceChange("min", event.target.value)}
                    className="h-11 w-full rounded-xl border border-[var(--line)] bg-[#0F1216] px-3 text-sm text-[var(--text)] placeholder:text-[var(--muted)]/70 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                    placeholder="0"
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-xs text-[var(--muted)]">最高價格</span>
                  <input
                    inputMode="numeric"
                    value={draftFilters.priceRange.max}
                    onChange={(event) => handlePriceChange("max", event.target.value)}
                    className="h-11 w-full rounded-xl border border-[var(--line)] bg-[#0F1216] px-3 text-sm text-[var(--text)] placeholder:text-[var(--muted)]/70 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                    placeholder="不限"
                  />
                </label>
              </div>
            </section>

            <section className="space-y-3">
              <h3 className="text-sm font-semibold text-[var(--text)]">狀態</h3>
              <div className="flex flex-wrap gap-2">
                {STATUS_OPTIONS.map((status) => (
                  <Chip
                    key={status}
                    active={draftFilters.statuses.includes(status)}
                    onClick={() => toggleArrayValue("statuses", status)}
                  >
                    {status}
                  </Chip>
                ))}
              </div>
            </section>

            <section className="space-y-3">
              <h3 className="text-sm font-semibold text-[var(--text)]">部位分類</h3>
              <div className="flex flex-wrap gap-2">
                {availableBodyParts.length === 0 ? (
                  <p className="text-xs text-[var(--muted)]/70">
                    從列表中選擇標籤後，可在此進行更精準的交叉篩選。
                  </p>
                ) : (
                  availableBodyParts.map((tag) => (
                    <Chip
                      key={tag}
                      active={draftFilters.bodyParts.includes(tag)}
                      onClick={() => toggleArrayValue("bodyParts", tag)}
                    >
                      {tag}
                    </Chip>
                  ))
                )}
              </div>
            </section>
          </div>

          <div className="border-t border-[var(--line)] px-6 py-5">
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-between">
              <button
                type="button"
                onClick={onReset}
                className="h-11 rounded-xl border border-[var(--line)] px-4 text-sm font-medium text-[var(--muted)] transition hover:border-[var(--accent)]/40 hover:text-[var(--text)]"
              >
                重置
              </button>
              <button
                type="button"
                onClick={onApply}
                className={cn(
                  "h-11 rounded-xl bg-[var(--brand)] px-6 text-sm font-semibold text-black shadow-md transition hover:brightness-110"
                )}
              >
                套用
              </button>
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
