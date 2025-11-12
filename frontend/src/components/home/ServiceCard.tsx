"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface ServiceCardProps {
  item: {
    id: string;
    title: string;
    tag?: string;
    thumb?: string;
    href?: string;
    price?: number;
    durationMin?: number;
    description?: string;
    imageUrl?: string;
    hasVariants?: boolean;
    isPlaceholder?: boolean;
  };
  variant?: "vertical" | "compact";
  onAddToCart?: (serviceId: string) => void;
}

export function ServiceCard({ item, variant = "vertical", onAddToCart }: ServiceCardProps) {
  const [imageError, setImageError] = useState(false);
  const hasImage = item.thumb && item.thumb.trim() !== '' && !imageError;

  const isPlaceholder = item.isPlaceholder;

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onAddToCart) {
      onAddToCart(item.id);
    }
  };

  const description = item.description
    ? item.description
    : isPlaceholder
    ? "此服務尚未建立，敬請期待。"
    : "預約前可先拍照與設計師討論細節。";

  const content = (
    <article
      className={cn(
        "group relative flex h-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm transition",
        isPlaceholder
          ? "opacity-80 hover:opacity-100 hover:border-white/20"
          : "hover:border-yellow-400/60 hover:bg-white/10",
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
            <span className="rounded-full border border-white/20 px-2 py-0.5 text-[10px] uppercase tracking-wide text-neutral-300">
              {item.tag}
            </span>
          )}
        </div>
        <p className="text-sm text-neutral-300">
          {isPlaceholder ? "尚未開放預約" : "割線/黑白/半彩/全彩"}
        </p>
        <div className="mt-auto pt-2 space-y-2">
          <p className="text-sm text-neutral-300">{description}</p>
          {onAddToCart && !isPlaceholder && (
            <Button
              onClick={handleAddToCart}
              className="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-semibold"
              size="sm"
            >
              <ShoppingCart className="mr-2 h-4 w-4" />
              加入購物車
            </Button>
          )}
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
