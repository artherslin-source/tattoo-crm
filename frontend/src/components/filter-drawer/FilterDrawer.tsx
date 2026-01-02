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
          className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-gray-200 bg-white/80 backdrop-blur-sm text-gray-900 shadow-[0_8px_24px_rgba(0,0,0,.5)]"
        >
          <div className="flex items-center justify-between border-b border-gray-200 px-4 py-4 sm:px-6 sm:py-5">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-amber-700">Filter</p>
              <h2 className="text-lg font-semibold text-gray-900 sm:text-xl">更多條件</h2>
            </div>
            <DialogPrimitive.Close className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-300 text-gray-600 transition hover:border-gray-400 hover:text-gray-900 sm:h-10 sm:w-10">
              <X className="h-4 w-4" />
            </DialogPrimitive.Close>
          </div>

          <div className="flex-1 space-y-6 overflow-y-auto px-4 py-4 sm:space-y-8 sm:px-6 sm:py-6">
            <section className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-900">日期區間</h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-xs text-gray-600">起始日期</span>
                  <input
                    type="date"
                    value={draftFilters.dateRange.from ?? ""}
                    onChange={(event) => handleDateChange("from", event.target.value)}
                    className="h-10 w-full rounded-xl border border-gray-300 bg-white px-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-500 sm:h-11"
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-xs text-gray-600">結束日期</span>
                  <input
                    type="date"
                    value={draftFilters.dateRange.to ?? ""}
                    onChange={(event) => handleDateChange("to", event.target.value)}
                    className="h-10 w-full rounded-xl border border-gray-300 bg-white px-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-500 sm:h-11"
                  />
                </label>
              </div>
            </section>

            <section className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-900">價格區間</h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-xs text-gray-600">最低價格</span>
                  <input
                    inputMode="numeric"
                    value={draftFilters.priceRange.min}
                    onChange={(event) => handlePriceChange("min", event.target.value)}
                    className="h-10 w-full rounded-xl border border-gray-300 bg-white px-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 sm:h-11"
                    placeholder="0"
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-xs text-gray-600">最高價格</span>
                  <input
                    inputMode="numeric"
                    value={draftFilters.priceRange.max}
                    onChange={(event) => handlePriceChange("max", event.target.value)}
                    className="h-10 w-full rounded-xl border border-gray-300 bg-white px-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 sm:h-11"
                    placeholder="不限"
                  />
                </label>
              </div>
            </section>

            <section className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-900">狀態</h3>
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
              <h3 className="text-sm font-semibold text-gray-900">部位分類</h3>
              <div className="flex flex-wrap gap-2">
                {availableBodyParts.length === 0 ? (
                  <p className="text-xs text-gray-500">
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

          <div className="border-t border-gray-200 px-4 py-4 sm:px-6 sm:py-5">
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-between">
              <button
                type="button"
                onClick={onReset}
                className="h-10 rounded-xl border border-gray-300 px-4 text-sm font-medium text-gray-600 transition hover:border-gray-400 hover:text-gray-900 sm:h-11"
              >
                重置
              </button>
              <button
                type="button"
                onClick={onApply}
                className={cn(
                  "h-10 rounded-xl bg-amber-600 px-6 text-sm font-semibold text-white shadow-md transition hover:bg-amber-700 sm:h-11"
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
