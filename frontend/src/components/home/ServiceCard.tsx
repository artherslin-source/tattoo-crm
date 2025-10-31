"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { cn } from "@/lib/utils";

export interface ServiceCardProps {
  item: {
    id: string;
    title: string;
    tag?: string;
    thumb?: string;
    href?: string;
    price?: number;
    durationMin?: number;
  };
  variant?: "vertical" | "compact";
}

export function ServiceCard({ item, variant = "vertical" }: ServiceCardProps) {
  const [imageError, setImageError] = useState(false);
  const hasImage = item.thumb && item.thumb.trim() !== '' && !imageError;

  const content = (
    <article
      className={cn(
        "group relative flex h-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm transition hover:border-yellow-400/60 hover:bg-white/10",
        variant === "compact" ? "min-h-[240px]" : ""
      )}
    >
      <div className="relative aspect-[4/3] w-full bg-gradient-to-br from-neutral-800 via-neutral-900 to-black overflow-hidden">
        {hasImage ? (
          <Image
            src={item.thumb!}
            alt={item.title}
            fill
            sizes="(min-width: 1024px) 320px, (min-width: 640px) 240px, 224px"
            className="object-cover"
            priority={false}
            unoptimized
            onError={() => {
              setImageError(true);
            }}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-neutral-400">
            <div className="text-center">
              <div className="mb-2 text-2xl">🎨</div>
              <div>待補圖片</div>
            </div>
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-center justify-between gap-2">
          <h4 className="text-lg font-semibold text-white">{item.title}</h4>
          {item.tag && (
            <span className="rounded-full border border-white/20 px-2 py-0.5 text-xs uppercase tracking-wide text-neutral-300">
              {item.tag}
            </span>
          )}
        </div>
        {item.price != null && (
          <p className="text-base font-medium text-yellow-300">NT$ {item.price.toLocaleString()}</p>
        )}
        {item.durationMin != null && (
          <p className="text-sm text-neutral-300">耗時約 {item.durationMin} 分鐘</p>
        )}
        <div className="mt-auto pt-2 text-sm text-neutral-300">
          預約前可先拍照與設計師討論細節。
        </div>
      </div>
    </article>
  );

  if (item.href) {
    return (
      <Link href={item.href} className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400/80">
        {content}
      </Link>
    );
  }

  return content;
}
