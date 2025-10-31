"use client";

import Image from "next/image";
import { Edit, Trash2, Link2 } from "lucide-react";

import { cn } from "@/lib/utils";

type WorkCardProps = {
  item: {
    id: string;
    title: string;
    description?: string;
    imageUrl: string;
    tags: string[];
    createdAt: string;
    status?: string;
    price?: number;
  };
  selectable?: boolean;
  selected?: boolean;
  onSelectToggle?: (selected: boolean) => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onCopyLink?: () => void;
};

export function WorkCard({
  item,
  selectable,
  selected,
  onSelectToggle,
  onEdit,
  onDelete,
  onCopyLink,
}: WorkCardProps) {
  const statusLabel = item.status ?? "已發布";

  return (
    <article className="group relative rounded-2xl border border-[var(--line)] bg-[var(--panel)] shadow-[0_8px_24px_rgba(0,0,0,.35)] transition hover:-translate-y-1 hover:shadow-[0_12px_32px_rgba(0,0,0,.45)] sm:rounded-3xl">
      {selectable && (
        <label className="absolute left-2 top-2 z-30 flex h-8 w-8 items-center justify-center rounded-full border border-[var(--line)] bg-[#0F1216]/90 backdrop-blur-md shadow-lg sm:left-4 sm:top-4 sm:h-9 sm:w-9">
          <input
            type="checkbox"
            checked={selected}
            onChange={(event) => onSelectToggle?.(event.target.checked)}
            className="peer sr-only"
            aria-label={selected ? "取消選取" : "選取作品"}
          />
          <span
            className={cn(
              "flex h-4 w-4 items-center justify-center rounded-full border border-[var(--line)] text-xs font-semibold text-[var(--muted)] transition peer-checked:border-[var(--brand)]/60 peer-checked:bg-[var(--brand)] peer-checked:text-black sm:h-5 sm:w-5",
            )}
          >
            {selected ? "✓" : ""}
          </span>
        </label>
      )}

      <div className="relative overflow-hidden rounded-t-2xl sm:rounded-t-3xl">
        <div className="relative aspect-[4/5] w-full">
          <Image
            src={item.imageUrl}
            alt={item.title}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            className="object-cover"
            priority={false}
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-black/10 opacity-0 transition group-hover:opacity-100" />

        {(onEdit || onDelete || onCopyLink) && (
          <div className="absolute top-2 right-2 flex translate-y-2 gap-1.5 opacity-0 transition group-hover:translate-y-0 group-hover:opacity-100 sm:top-4 sm:right-4 sm:gap-2">
            {onEdit && (
              <button
                type="button"
                onClick={onEdit}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white transition hover:bg-black/80 sm:h-10 sm:w-10"
                aria-label="編輯作品"
              >
                <Edit className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </button>
            )}
            {onDelete && (
              <button
                type="button"
                onClick={onDelete}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white transition hover:bg-black/80 sm:h-10 sm:w-10"
                aria-label="刪除作品"
              >
                <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </button>
            )}
            {onCopyLink && (
              <button
                type="button"
                onClick={onCopyLink}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white transition hover:bg-black/80 sm:h-10 sm:w-10"
                aria-label="複製連結"
              >
                <Link2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </button>
            )}
          </div>
        )}
      </div>

      <div className="space-y-2 px-3 pb-3 pt-3 sm:space-y-3 sm:px-5 sm:pb-5 sm:pt-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="flex-1 text-sm font-semibold text-[var(--text)] line-clamp-1 sm:text-base">{item.title}</h3>
          <span className="flex-shrink-0 rounded-full bg-[#1A1405] px-2 py-0.5 text-[10px] font-semibold text-[var(--brand)] sm:px-3 sm:py-1 sm:text-xs">
            {statusLabel}
          </span>
        </div>
        {item.description && (
          <p className="text-xs text-[var(--muted)] line-clamp-2 sm:text-sm">{item.description}</p>
        )}
        <div className="flex flex-wrap gap-1.5 text-[10px] text-[var(--muted)] sm:gap-2 sm:text-xs">
          {item.tags.slice(0, 3).map((tag) => (
            <span key={tag} className="rounded-full border border-[var(--line)]/70 px-2 py-0.5 sm:px-3 sm:py-1">
              {tag}
            </span>
          ))}
          {item.tags.length > 3 && (
            <span className="rounded-full border border-[var(--line)]/70 px-2 py-0.5 text-[var(--muted)]/70 sm:px-3 sm:py-1">
              +{item.tags.length - 3}
            </span>
          )}
        </div>
        <div className="flex items-center justify-between text-[10px] text-[var(--muted)] sm:text-xs">
          <span className="truncate">{new Date(item.createdAt).toLocaleDateString("zh-TW")}</span>
          {typeof item.price === "number" && (
            <span className="ml-2 flex-shrink-0 font-semibold text-[var(--text)]">NT$ {item.price.toLocaleString()}</span>
          )}
        </div>
      </div>
    </article>
  );
}

export function WorkCardSkeleton() {
  return (
    <div className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] shadow-[0_8px_24px_rgba(0,0,0,.35)] animate-pulse sm:rounded-3xl">
      <div className="aspect-[4/5] w-full bg-[#1A1D23]" />
      <div className="space-y-2 px-3 pb-3 pt-3 sm:space-y-3 sm:px-5 sm:pb-5 sm:pt-4">
        <div className="h-3.5 w-3/4 rounded-full bg-[#1A1D23] sm:h-4" />
        <div className="h-2.5 w-1/2 rounded-full bg-[#1A1D23] sm:h-3" />
        <div className="flex gap-1.5 sm:gap-2">
          <div className="h-2.5 w-12 rounded-full bg-[#1A1D23] sm:h-3 sm:w-16" />
          <div className="h-2.5 w-10 rounded-full bg-[#1A1D23] sm:h-3 sm:w-14" />
        </div>
      </div>
    </div>
  );
}

export function EmptyState({ onCreate }: { onCreate?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-3xl border border-[var(--line)] bg-[var(--panel)] px-4 py-12 text-center shadow-[0_8px_24px_rgba(0,0,0,.35)] sm:px-6 sm:py-16">
      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-[#1A1D23] text-2xl sm:mb-6 sm:h-20 sm:w-20 sm:text-3xl">🎨</div>
      <h3 className="text-lg font-semibold text-[var(--text)] sm:text-xl">還沒有作品</h3>
      <p className="mt-2 max-w-md px-2 text-sm text-[var(--muted)]">
        建立您的第一個作品集，展示獨特的刺青風格。也可以先了解如何建立分類，讓作品呈現更有層次。
      </p>
      <div className="mt-6 flex w-full flex-col gap-3 sm:mt-8 sm:w-auto sm:flex-row">
        {onCreate && (
          <button
            type="button"
            onClick={onCreate}
            className="w-full rounded-xl bg-[var(--brand)] px-6 py-3 text-sm font-semibold text-black shadow-md transition hover:brightness-110 sm:w-auto"
          >
            新增作品
          </button>
        )}
        <a
          href="#"
          className="w-full rounded-xl border border-[var(--line)] px-6 py-3 text-sm font-medium text-[var(--text)]/80 transition hover:border-[var(--accent)]/40 hover:text-[var(--text)] sm:w-auto"
        >
          了解如何建立分類
        </a>
      </div>
    </div>
  );
}
