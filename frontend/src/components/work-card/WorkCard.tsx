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
    <article className="group relative rounded-3xl border border-[var(--line)] bg-[var(--panel)] shadow-[0_8px_24px_rgba(0,0,0,.35)] transition hover:-translate-y-1 hover:shadow-[0_12px_32px_rgba(0,0,0,.45)]">
      {selectable && (
        <label className="absolute left-4 top-4 z-30 flex h-9 w-9 items-center justify-center rounded-full border border-[var(--line)] bg-[#0F1216]/90 backdrop-blur-md shadow-lg">
          <input
            type="checkbox"
            checked={selected}
            onChange={(event) => onSelectToggle?.(event.target.checked)}
            className="peer sr-only"
            aria-label={selected ? "取消選取" : "選取作品"}
          />
          <span
            className={cn(
              "flex h-5 w-5 items-center justify-center rounded-full border border-[var(--line)] text-xs font-semibold text-[var(--muted)] transition peer-checked:border-[var(--brand)]/60 peer-checked:bg-[var(--brand)] peer-checked:text-black",
            )}
          >
            {selected ? "✓" : ""}
          </span>
        </label>
      )}

      <div className="relative overflow-hidden">
        <div className="relative aspect-[4/5]">
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

        <div className="absolute top-4 right-4 flex translate-y-2 gap-2 opacity-0 transition group-hover:translate-y-0 group-hover:opacity-100">
          <button
            type="button"
            onClick={onEdit}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-black/60 text-white transition hover:bg-black/80"
            aria-label="編輯作品"
          >
            <Edit className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-black/60 text-white transition hover:bg-black/80"
            aria-label="刪除作品"
          >
            <Trash2 className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onCopyLink}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-black/60 text-white transition hover:bg-black/80"
            aria-label="複製連結"
          >
            <Link2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="space-y-3 px-5 pb-5 pt-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-base font-semibold text-[var(--text)] line-clamp-1">{item.title}</h3>
          <span className="rounded-full bg-[#1A1405] px-3 py-1 text-xs font-semibold text-[var(--brand)]">
            {statusLabel}
          </span>
        </div>
        {item.description && (
          <p className="text-sm text-[var(--muted)] line-clamp-2">{item.description}</p>
        )}
        <div className="flex flex-wrap gap-2 text-xs text-[var(--muted)]">
          {item.tags.map((tag) => (
            <span key={tag} className="rounded-full border border-[var(--line)]/70 px-3 py-1">
              {tag}
            </span>
          ))}
        </div>
        <div className="flex items-center justify-between text-xs text-[var(--muted)]">
          <span>{new Date(item.createdAt).toLocaleDateString("zh-TW")}</span>
          {typeof item.price === "number" && (
            <span className="font-semibold text-[var(--text)]">NT$ {item.price.toLocaleString()}</span>
          )}
        </div>
      </div>
    </article>
  );
}

export function WorkCardSkeleton() {
  return (
    <div className="rounded-3xl border border-[var(--line)] bg-[var(--panel)] shadow-[0_8px_24px_rgba(0,0,0,.35)] animate-pulse">
      <div className="aspect-[4/5] w-full bg-[#1A1D23]" />
      <div className="space-y-3 px-5 py-4">
        <div className="h-4 w-3/4 rounded-full bg-[#1A1D23]" />
        <div className="h-3 w-1/2 rounded-full bg-[#1A1D23]" />
        <div className="flex gap-2">
          <div className="h-3 w-16 rounded-full bg-[#1A1D23]" />
          <div className="h-3 w-14 rounded-full bg-[#1A1D23]" />
        </div>
      </div>
    </div>
  );
}

export function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-3xl border border-[var(--line)] bg-[var(--panel)] px-6 py-16 text-center shadow-[0_8px_24px_rgba(0,0,0,.35)]">
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-[#1A1D23] text-3xl">🎨</div>
      <h3 className="text-xl font-semibold text-[var(--text)]">還沒有作品</h3>
      <p className="mt-2 max-w-md text-sm text-[var(--muted)]">
        建立您的第一個作品集，展示獨特的刺青風格。也可以先了解如何建立分類，讓作品呈現更有層次。
      </p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={onCreate}
          className="rounded-xl bg-[var(--brand)] px-6 py-3 text-sm font-semibold text-black shadow-md transition hover:brightness-110"
        >
          新增作品
        </button>
        <a
          href="#"
          className="rounded-xl border border-[var(--line)] px-6 py-3 text-sm font-medium text-[var(--text)]/80 transition hover:border-[var(--accent)]/40 hover:text-[var(--text)]"
        >
          了解如何建立分類
        </a>
      </div>
    </div>
  );
}
