"use client";

import { ArrowUp, Trash2 } from "lucide-react";

import { cn } from "@/lib/utils";

type FloatingActionsProps = {
  selectedCount: number;
  onBulkDelete: () => void;
  onScrollTop: () => void;
};

export function FloatingActions({ selectedCount, onBulkDelete, onScrollTop }: FloatingActionsProps) {
  if (selectedCount === 0) {
    return null;
  }

  return (
    <div className="fixed inset-x-0 bottom-4 z-40 flex justify-center px-4 sm:hidden">
      <div className="flex w-full max-w-md items-center justify-between rounded-2xl border border-[var(--line)] bg-[color-mix(in_srgb,var(--panel)_92%,#000)]/90 px-4 py-3 text-[var(--text)] shadow-[0_8px_24px_rgba(0,0,0,.45)]">
        <div className="flex flex-col text-xs text-[var(--muted)]">
          <span className="font-medium text-[var(--text)]">已選 {selectedCount} 件作品</span>
          <span>可進行批次操作</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onScrollTop}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--line)] text-[var(--text)]/80 transition hover:border-[var(--accent)]/40 hover:text-[var(--text)]"
            aria-label="回到頂部"
          >
            <ArrowUp className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={onBulkDelete}
            className={cn(
              "flex items-center gap-2 rounded-xl bg-[var(--brand)] px-4 py-2 text-sm font-semibold text-black shadow-md transition hover:brightness-110"
            )}
          >
            <Trash2 className="h-4 w-4" />
            <span>批次刪除</span>
          </button>
        </div>
      </div>
    </div>
  );
}
