"use client";

import { Menu, Plus, Upload, Download } from "lucide-react";

import { cn } from "@/lib/utils";

type TopBarProps = {
  onCreate: () => void;
  onImportExport?: () => void;
};

export function TopBar({ onCreate, onImportExport }: TopBarProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-[var(--line)] bg-[color-mix(in_srgb,var(--bg)_85%,#000)]/80 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--line)] text-[var(--text)]/80 transition hover:border-[var(--accent)]/40 hover:text-[var(--text)] sm:hidden"
            aria-label="開啟主選單"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-[var(--brand)]/80">Tattoo Studio</p>
            <h1 className="text-lg font-semibold text-[var(--text)] sm:text-2xl">作品管理</h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onCreate}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--brand)] text-black shadow-[0_6px_14px_rgba(0,0,0,.25)] transition hover:brightness-110 sm:hidden"
            aria-label="新增作品"
          >
            <Plus className="h-5 w-5" />
          </button>

          <div className="hidden items-center gap-2 sm:flex">
            <button
              type="button"
              onClick={onImportExport}
              className="flex items-center gap-2 rounded-xl border border-[var(--line)] px-4 py-2 text-sm font-medium text-[var(--text)]/80 transition hover:border-[var(--accent)]/40"
            >
              <Upload className="h-4 w-4" />
              <Download className="h-4 w-4" />
              <span>匯入 / 匯出</span>
            </button>
            <button
              type="button"
              onClick={onCreate}
              className={cn(
                "hidden items-center gap-2 rounded-xl bg-[var(--brand)] px-5 py-2 text-sm font-semibold text-black shadow-md transition hover:brightness-110 lg:flex"
              )}
            >
              <Plus className="h-4 w-4" />
              <span>新增作品</span>
            </button>
            <button
              type="button"
              onClick={onCreate}
              className="flex items-center gap-2 rounded-xl bg-[var(--brand)] px-4 py-2 text-sm font-semibold text-black shadow-md transition hover:brightness-110 lg:hidden"
            >
              <Plus className="h-4 w-4" />
              <span>新增</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
