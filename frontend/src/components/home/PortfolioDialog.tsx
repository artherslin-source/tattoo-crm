"use client";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { getApiBase, getImageUrl } from "@/lib/api";
import useMediaQuery from "@/hooks/useMediaQuery";
import { AVAILABLE_TAGS } from "@/constants/portfolio-tags";

interface Artist {
  id: string;
  displayName: string;
  bio: string;
  styles: string[];
  speciality: string;
  photoUrl?: string;
}

interface PortfolioItem {
  id: string;
  title: string;
  description?: string | null;
  imageUrl: string;
  tags?: string[] | null;
}

interface PortfolioDialogProps {
  artist: Artist | null;
  open: boolean;
  onClose: () => void;
}

export function PortfolioDialog({ artist, open, onClose }: PortfolioDialogProps) {
  const [items, setItems] = useState<PortfolioItem[]>([]);
  const [loading, setLoading] = useState(false);
  const isMobile = useMediaQuery("(max-width: 640px)");

  // Image availability tracking (avoid broken images + avoid repeated 404s)
  const loadedUrlsRef = useRef(new Set<string>());
  const failedUrlsRef = useRef(new Set<string>());
  const [assetVersion, setAssetVersion] = useState(0);

  // 風格篩選（方式一：Tab 點選後篩選）
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  // Viewer overlay state
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const pointersRef = useRef(new Map<number, { x: number; y: number }>());
  const pinchRef = useRef<{ startDist: number; startScale: number } | null>(null);
  const dragRef = useRef<{ lastX: number; lastY: number } | null>(null);
  const lastTapRef = useRef<number>(0);

  const hasAnyRealLoaded = loadedUrlsRef.current.size > 0;

  const visibleRealItems = useMemo(() => {
    // Force recompute when assetVersion changes
    void assetVersion;
    return items.filter((it) => {
      const url = it.imageUrl;
      if (!url) return false;
      return !failedUrlsRef.current.has(url);
    });
  }, [items, assetVersion]);

  const normalizeTags = (t: unknown): string[] => {
    if (Array.isArray(t)) return t.filter((x): x is string => typeof x === "string");
    if (typeof t === "string") {
      try {
        const parsed = JSON.parse(t) as unknown;
        return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : [];
      } catch {
        return [];
      }
    }
    return [];
  };

  // 此刺青師作品裡有出現的風格（用於 Tab 只顯示有作品的）
  const tagsInUse = useMemo(() => {
    const set = new Set<string>();
    for (const it of visibleRealItems) {
      normalizeTags(it.tags).forEach((tag) => set.add(tag));
    }
    return AVAILABLE_TAGS.filter((tag) => set.has(tag));
  }, [visibleRealItems]);

  // 依選中的風格篩選（selectedTag === null 表示「全部」）
  const filteredItems = useMemo(() => {
    if (!selectedTag) return visibleRealItems;
    return visibleRealItems.filter((it) => normalizeTags(it.tags).includes(selectedTag));
  }, [visibleRealItems, selectedTag]);

  const displayed = useMemo(() => {
    // Viewer 與網格一致：顯示篩選後的列表
    void assetVersion;
    if (!hasAnyRealLoaded) return [];
    return filteredItems;
  }, [assetVersion, hasAnyRealLoaded, filteredItems]);

  useEffect(() => {
    const fetchPortfolio = async () => {
      if (!artist || !open) return;
      try {
        setLoading(true);
        // 後端 /artists/:artistId/portfolio 的 artistId = User.id
        // 首頁傳入的 artist 型別在此元件沒有 user.id，因此改為由首頁在開啟前注入 userId 至 artist.id
        const base = getApiBase();
        const res = await fetch(`${base}/artists/${artist.id}/portfolio`, { cache: "no-store" });
        const data = await res.json();
        const nextItems = Array.isArray(data) ? data : [];
        setItems(nextItems);
        // Reset tracking for the new artist/session
        loadedUrlsRef.current = new Set();
        failedUrlsRef.current = new Set();
        setAssetVersion((v) => v + 1);
      } catch (e) {
        setItems([]);
      } finally {
        setLoading(false);
      }
    };
    fetchPortfolio();
  }, [artist, open]);

  // 換刺青師或關閉彈窗時重置風格篩選
  useEffect(() => {
    if (!open || !artist) setSelectedTag(null);
  }, [open, artist]);

  useEffect(() => {
    // Background probe: detect when real images load so the grid can show them.
    if (!open) return;
    if (!items.length) return;
    if (typeof window === "undefined") return;

    let cancelled = false;
    const probes: HTMLImageElement[] = [];

    for (const it of items) {
      const url = it.imageUrl;
      if (!url) continue;
      if (loadedUrlsRef.current.has(url) || failedUrlsRef.current.has(url)) continue;

      const img = new window.Image();
      img.onload = () => {
        if (cancelled) return;
        if (!loadedUrlsRef.current.has(url)) {
          loadedUrlsRef.current.add(url);
          setAssetVersion((v) => v + 1);
        }
      };
      img.onerror = () => {
        if (cancelled) return;
        if (!failedUrlsRef.current.has(url)) {
          failedUrlsRef.current.add(url);
          setAssetVersion((v) => v + 1);
        }
      };
      img.src = url;
      probes.push(img);
    }

    return () => {
      cancelled = true;
      for (const img of probes) {
        img.onload = null;
        img.onerror = null;
      }
    };
  }, [open, items]);

  useEffect(() => {
    if (!viewerOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setViewerOpen(false);
      if (e.key === "ArrowLeft") setViewerIndex((i) => Math.max(0, i - 1));
      if (e.key === "ArrowRight") setViewerIndex((i) => Math.min(displayed.length - 1, i + 1));
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [viewerOpen, displayed.length]);

  useEffect(() => {
    // reset transforms when switching image or closing
    setScale(1);
    setOffset({ x: 0, y: 0 });
    pointersRef.current.clear();
    pinchRef.current = null;
    dragRef.current = null;
  }, [viewerIndex, viewerOpen]);

  const openViewer = (index: number) => {
    if (!displayed.length) return;
    setViewerIndex(index);
    setViewerOpen(true);
  };

  const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

  const handleViewerPointerDown = (e: React.PointerEvent) => {
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    const now = Date.now();
    if (now - lastTapRef.current < 320) {
      // double tap/click
      setScale((s) => {
        const next = s > 1 ? 1 : 2;
        return next;
      });
      setOffset({ x: 0, y: 0 });
      pointersRef.current.clear();
      pinchRef.current = null;
      dragRef.current = null;
      lastTapRef.current = 0;
      return;
    }
    lastTapRef.current = now;

    const pts = Array.from(pointersRef.current.values());
    if (pts.length === 2) {
      const dx = pts[0].x - pts[1].x;
      const dy = pts[0].y - pts[1].y;
      pinchRef.current = { startDist: Math.hypot(dx, dy), startScale: scale };
      dragRef.current = null;
    } else if (pts.length === 1) {
      dragRef.current = { lastX: e.clientX, lastY: e.clientY };
    }
  };

  const handleViewerPointerMove = (e: React.PointerEvent) => {
    if (!pointersRef.current.has(e.pointerId)) return;
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const pts = Array.from(pointersRef.current.values());

    if (pts.length === 2 && pinchRef.current) {
      const dx = pts[0].x - pts[1].x;
      const dy = pts[0].y - pts[1].y;
      const dist = Math.hypot(dx, dy);
      const nextScale = clamp((pinchRef.current.startScale * dist) / pinchRef.current.startDist, 1, 4);
      setScale(nextScale);
      return;
    }

    if (pts.length === 1 && dragRef.current) {
      const dx = e.clientX - dragRef.current.lastX;
      const dy = e.clientY - dragRef.current.lastY;
      dragRef.current = { lastX: e.clientX, lastY: e.clientY };
      if (scale > 1) {
        setOffset((o) => ({ x: o.x + dx, y: o.y + dy }));
      }
    }
  };

  const handleViewerPointerUp = (e: React.PointerEvent) => {
    pointersRef.current.delete(e.pointerId);
    const pts = Array.from(pointersRef.current.values());
    if (pts.length < 2) pinchRef.current = null;
    if (pts.length === 0) dragRef.current = null;
  };

  if (!artist) return null;

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => { if (!nextOpen) onClose(); }}>
      <DialogContent
        disableTransform={isMobile}
        className={
          isMobile
            ? "left-0 right-0 bottom-0 top-auto max-w-none w-full h-[92vh] overflow-y-auto bg-white dark:bg-neutral-900 p-0 rounded-t-2xl border border-gray-200 dark:border-neutral-800"
            : "max-w-5xl max-h-[95vh] md:max-h-[90vh] ipad:max-h-[92vh] overflow-y-auto bg-white dark:bg-neutral-900 p-0 w-[95vw] md:w-full"
        }
      >
        {/* 標題區 - 響應式 padding */}
        <DialogHeader className="sticky top-0 z-10 bg-white dark:bg-neutral-900 border-b border-gray-200 dark:border-neutral-700 p-4 sm:p-6 ipad:p-7">
          <div className="flex items-start gap-3 sm:gap-4">
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-lg sm:text-xl md:text-2xl font-bold text-text-primary-light dark:text-text-primary-dark mb-1 sm:mb-2 truncate">
                {artist.displayName} 的作品集
              </DialogTitle>
              <DialogDescription className="text-xs sm:text-sm text-text-secondary-light dark:text-text-secondary-dark truncate">
                {artist.speciality}
              </DialogDescription>
              <div className="flex flex-wrap gap-1.5 sm:gap-2 mt-2 sm:mt-3">
                {(artist.styles || [])
                  .filter((style) => {
                    // 過濾掉英文標籤
                    const englishTags = ['Traditional', 'Nature', 'Minimalist', 'Japanese', 'Geometric'];
                    return !englishTags.includes(style);
                  })
                  .map((style) => (
                  <Badge key={style} variant="secondary" className="text-[10px] sm:text-xs px-2 py-0.5">
                    {style}
                  </Badge>
                ))}
              </div>
            </div>
            <DialogClose asChild>
              <button
                type="button"
                className="flex-shrink-0 p-1.5 sm:p-2 rounded-full hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors"
                aria-label="關閉"
              >
                <X className="h-4 w-4 sm:h-5 sm:w-5 text-gray-500 dark:text-gray-400" />
              </button>
            </DialogClose>
          </div>
        </DialogHeader>

        {/* 內容區 - 響應式 padding */}
        <div className="p-4 sm:p-6">
          {/* 刺青師簡介 - 響應式文字 */}
          <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-gray-50 dark:bg-neutral-800 rounded-lg">
            <p className="text-xs sm:text-sm text-text-secondary-light dark:text-text-secondary-dark leading-relaxed">
              {artist.bio}
            </p>
          </div>

          {/* 載入中 */}
          {loading && (
            <div className="py-12 text-center text-sm text-text-secondary-light dark:text-text-secondary-dark">
              載入作品集中…
            </div>
          )}

          {/* 空狀態：已載入但沒有作品或沒有可顯示的圖片 */}
          {!loading && items.length === 0 && (
            <div className="py-12 text-center text-sm text-text-secondary-light dark:text-text-secondary-dark">
              此刺青師尚無作品集
            </div>
          )}
          {!loading && items.length > 0 && visibleRealItems.length === 0 && (
            <div className="py-12 text-center text-sm text-text-secondary-light dark:text-text-secondary-dark">
              暫無可顯示的作品
            </div>
          )}

          {/* 風格篩選 Tab（方式一：點選後篩選）— 有作品且至少有一種風格時才顯示 */}
          {!loading && visibleRealItems.length > 0 && (
            <div className="mb-4 flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
              <button
                type="button"
                onClick={() => setSelectedTag(null)}
                className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                  selectedTag === null
                    ? "bg-gray-800 text-white dark:bg-neutral-200 dark:text-neutral-900"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-600"
                }`}
              >
                全部
              </button>
              {tagsInUse.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setSelectedTag(tag)}
                  className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                    selectedTag === tag
                      ? "bg-gray-800 text-white dark:bg-neutral-200 dark:text-neutral-900"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-600"
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          )}

          {/* 作品集網格 - 依篩選結果顯示 */}
          {!loading && visibleRealItems.length > 0 && filteredItems.length === 0 && selectedTag && (
            <div className="py-8 text-center text-sm text-text-secondary-light dark:text-text-secondary-dark">
              目前沒有符合「{selectedTag}」風格的作品
            </div>
          )}
          <div className="columns-2 md:columns-3 gap-3 sm:gap-4">
            {filteredItems.map((item, idx) => (
              <button
                key={item.id}
                type="button"
                className="group relative w-full break-inside-avoid mb-3 sm:mb-4 overflow-hidden rounded-lg sm:rounded-xl"
                onClick={() => openViewer(idx)}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={getImageUrl(item.imageUrl) || "https://placehold.co/800x800?text=Work"}
                  alt={item.title}
                  className="w-full h-auto object-cover"
                  loading="lazy"
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-3 sm:p-4">
                  <p className="text-white text-xs sm:text-sm font-medium truncate">{item.title || "作品"}</p>
                </div>
              </button>
            ))}
          </div>

          {/* 聯絡預約區 - 完整響應式 */}
          <div className="mt-4 sm:mt-6 pt-4 sm:pt-6 border-t border-gray-200 dark:border-neutral-700">
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <button
                onClick={() => {
                  onClose();
                  document.getElementById('booking-form')?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="w-full sm:flex-1 px-4 sm:px-6 py-2.5 sm:py-3 bg-blue-600 text-white text-sm sm:text-base rounded-lg hover:bg-blue-700 active:bg-blue-800 transition-colors font-medium"
              >
                立即預約 {artist.displayName}
              </button>
              <button
                onClick={() => {
                  window.location.href = '/home#contact';
                  onClose();
                }}
                className="w-full sm:flex-1 px-4 sm:px-6 py-2.5 sm:py-3 border border-gray-300 dark:border-neutral-600 text-gray-700 dark:text-gray-300 text-sm sm:text-base rounded-lg hover:bg-gray-50 dark:hover:bg-neutral-800 active:bg-gray-100 dark:active:bg-neutral-700 transition-colors font-medium"
              >
                聯絡諮詢
              </button>
            </div>
          </div>
        </div>

        {/* Fullscreen viewer overlay */}
        {viewerOpen && displayed.length > 0 ? (
          <div className="fixed inset-0 z-[120] bg-black/95">
            {/* 頂列：z-20 確保在圖片層之上，關閉鈕可點擊 */}
            <div className="absolute inset-x-0 top-0 z-20 flex items-center justify-between gap-3 p-3 sm:p-4">
              <div className="text-xs sm:text-sm text-white/80">
                {viewerIndex + 1} / {displayed.length}
              </div>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setViewerOpen(false); onClose(); }}
                className="relative z-20 rounded-full bg-white/10 px-3 py-2 text-xs sm:text-sm text-white hover:bg-white/15"
              >
                關閉
              </button>
            </div>

            <button
              type="button"
              className="hidden md:flex absolute left-3 top-1/2 z-10 -translate-y-1/2 h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/15"
              onClick={() => setViewerIndex((i) => Math.max(0, i - 1))}
              disabled={viewerIndex === 0}
              aria-label="上一張"
            >
              ‹
            </button>
            <button
              type="button"
              className="hidden md:flex absolute right-3 top-1/2 z-10 -translate-y-1/2 h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/15"
              onClick={() => setViewerIndex((i) => Math.min(displayed.length - 1, i + 1))}
              disabled={viewerIndex === displayed.length - 1}
              aria-label="下一張"
            >
              ›
            </button>

            <div className="absolute inset-0 z-0 pt-14 sm:pt-16 pb-14 sm:pb-16 flex items-center justify-center pointer-events-none">
              <div
                className="h-full w-full flex items-center justify-center touch-none pointer-events-auto"
                onPointerDown={handleViewerPointerDown}
                onPointerMove={handleViewerPointerMove}
                onPointerUp={handleViewerPointerUp}
                onPointerCancel={handleViewerPointerUp}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={getImageUrl(displayed[viewerIndex]?.imageUrl) || "https://placehold.co/1200x1200?text=Work"}
                  alt={displayed[viewerIndex]?.title || "作品"}
                  className="max-h-full max-w-full select-none"
                  style={{
                    transform: `translate3d(${offset.x}px, ${offset.y}px, 0) scale(${scale})`,
                    transformOrigin: "center",
                    transition: pointersRef.current.size === 0 ? "transform 120ms ease-out" : "none",
                  }}
                  draggable={false}
                />
              </div>
            </div>

            <div className="absolute inset-x-0 bottom-0 z-20 flex items-center justify-center gap-2 p-3">
              <button
                type="button"
                className="rounded-full bg-white/10 px-4 py-2 text-xs sm:text-sm text-white hover:bg-white/15"
                onClick={() => setViewerIndex((i) => Math.max(0, i - 1))}
                disabled={viewerIndex === 0}
              >
                上一張
              </button>
              <button
                type="button"
                className="rounded-full bg-white/10 px-4 py-2 text-xs sm:text-sm text-white hover:bg-white/15"
                onClick={() => {
                  setScale(1);
                  setOffset({ x: 0, y: 0 });
                }}
              >
                重置
              </button>
              <button
                type="button"
                className="rounded-full bg-white/10 px-4 py-2 text-xs sm:text-sm text-white hover:bg-white/15"
                onClick={() => setViewerIndex((i) => Math.min(displayed.length - 1, i + 1))}
                disabled={viewerIndex === displayed.length - 1}
              >
                下一張
              </button>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

