"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { X, Image as ImageIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { getApiBase } from "@/lib/api";

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
}

interface PortfolioDialogProps {
  artist: Artist | null;
  open: boolean;
  onClose: () => void;
}

// 假的作品集數據（目前使用色塊暫時替代）
const MOCK_PORTFOLIO_COLORS = [
  { id: 1, gradient: "from-amber-600 via-orange-600 to-red-600", title: "舊傳統" },
  { id: 2, gradient: "from-rose-500 via-pink-500 to-purple-500", title: "新傳統" },
  { id: 3, gradient: "from-slate-600 via-gray-700 to-slate-900", title: "歐美圖" },
  { id: 4, gradient: "from-neutral-700 via-gray-800 to-black", title: "寫實風格" },
  { id: 5, gradient: "from-teal-600 via-emerald-500 to-lime-500", title: "水墨風格" },
  { id: 6, gradient: "from-sky-400 via-indigo-400 to-purple-500", title: "小圖案" },
  { id: 7, gradient: "from-amber-300 via-yellow-400 to-amber-500", title: "文字刺青" },
  { id: 8, gradient: "from-indigo-500 via-violet-500 to-fuchsia-500", title: "畫作欣賞" },
];

export function PortfolioDialog({ artist, open, onClose }: PortfolioDialogProps) {
  const [items, setItems] = useState<PortfolioItem[]>([]);
  const [loading, setLoading] = useState(false);

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
        setItems(Array.isArray(data) ? data : []);
      } catch (e) {
        setItems([]);
      } finally {
        setLoading(false);
      }
    };
    fetchPortfolio();
  }, [artist, open]);

  if (!artist) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[95vh] md:max-h-[90vh] overflow-y-auto bg-white dark:bg-neutral-900 p-0 w-[95vw] md:w-full">
        {/* 標題區 - 響應式 padding */}
        <DialogHeader className="sticky top-0 z-10 bg-white dark:bg-neutral-900 border-b border-gray-200 dark:border-neutral-700 p-4 sm:p-6">
          <div className="flex items-start gap-3 sm:gap-4">
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-lg sm:text-xl md:text-2xl font-bold text-text-primary-light dark:text-text-primary-dark mb-1 sm:mb-2 truncate">
                {artist.displayName} 的作品集
              </DialogTitle>
              <p className="text-xs sm:text-sm text-text-secondary-light dark:text-text-secondary-dark truncate">
                {artist.speciality}
              </p>
              <div className="flex flex-wrap gap-1.5 sm:gap-2 mt-2 sm:mt-3">
                {(artist.styles || []).map((style) => (
                  <Badge key={style} variant="secondary" className="text-[10px] sm:text-xs px-2 py-0.5">
                    {style}
                  </Badge>
                ))}
              </div>
            </div>
            <button
              onClick={onClose}
              className="flex-shrink-0 p-1.5 sm:p-2 rounded-full hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors"
              aria-label="關閉"
            >
              <X className="h-4 w-4 sm:h-5 sm:w-5 text-gray-500 dark:text-gray-400" />
            </button>
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

          {/* 作品集網格 - 完整響應式 */}
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-3 sm:gap-4">
            {(items.length ? items : []).map((item) => (
              <div key={item.id} className="group relative aspect-square overflow-hidden rounded-lg sm:rounded-xl">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={item.imageUrl || 'https://placehold.co/800x800?text=Work'} alt={item.title} className="absolute inset-0 h-full w-full object-cover" />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-3 sm:p-4">
                  <p className="text-white text-xs sm:text-sm font-medium truncate">{item.title || '作品'}</p>
                </div>
              </div>
            ))}

            {/* 若沒有作品，顯示示意色塊作為暫時替代 */}
            {!loading && items.length === 0 && (
              <>
                {MOCK_PORTFOLIO_COLORS.map((item) => (
                  <div
                    key={item.id}
                    className="group relative aspect-square overflow-hidden rounded-lg sm:rounded-xl"
                  >
                    <div className={`absolute inset-0 bg-gradient-to-br ${item.gradient} opacity-90`} />
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-3 sm:p-4">
                      <p className="text-white text-xs sm:text-sm font-medium truncate">{item.title}</p>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>

          {/* 提示訊息 - 響應式 */}
          <div className="mt-4 sm:mt-6 p-3 sm:p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <p className="text-xs sm:text-sm text-blue-700 dark:text-blue-300 text-center leading-relaxed">
              💡 提示：目前使用色塊暫時展示，實際作品圖片將由刺青師上傳後顯示
            </p>
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
      </DialogContent>
    </Dialog>
  );
}

