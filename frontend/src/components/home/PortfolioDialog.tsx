"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { X, Image as ImageIcon } from "lucide-react";

interface Artist {
  id: string;
  displayName: string;
  bio: string;
  styles: string[];
  speciality: string;
  photoUrl?: string;
}

interface PortfolioDialogProps {
  artist: Artist | null;
  open: boolean;
  onClose: () => void;
}

// 假的作品集數據（目前使用色塊暫時替代）
const MOCK_PORTFOLIO_COLORS = [
  { id: 1, gradient: "from-purple-500 to-pink-500", title: "幾何圖騰" },
  { id: 2, gradient: "from-blue-500 to-cyan-500", title: "海洋主題" },
  { id: 3, gradient: "from-green-500 to-emerald-500", title: "自然元素" },
  { id: 4, gradient: "from-orange-500 to-red-500", title: "火焰圖案" },
  { id: 5, gradient: "from-indigo-500 to-purple-500", title: "星空系列" },
  { id: 6, gradient: "from-yellow-500 to-orange-500", title: "太陽光芒" },
  { id: 7, gradient: "from-pink-500 to-rose-500", title: "花卉設計" },
  { id: 8, gradient: "from-teal-500 to-green-500", title: "水墨風格" },
  { id: 9, gradient: "from-violet-500 to-indigo-500", title: "銀河漸層" },
];

export function PortfolioDialog({ artist, open, onClose }: PortfolioDialogProps) {
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
                {artist.styles.map((style) => (
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
            {MOCK_PORTFOLIO_COLORS.map((item) => (
              <div
                key={item.id}
                className="group relative aspect-square overflow-hidden rounded-lg sm:rounded-xl cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-xl"
              >
                {/* 色塊暫時替代圖片 */}
                <div className={`absolute inset-0 bg-gradient-to-br ${item.gradient} opacity-90 group-hover:opacity-100 transition-opacity duration-300`} />
                
                {/* 圖片圖標 */}
                <div className="absolute top-2 right-2 sm:top-3 sm:right-3 p-1.5 sm:p-2 bg-white/20 backdrop-blur-sm rounded-full">
                  <ImageIcon className="h-3 w-3 sm:h-4 sm:w-4 text-white" />
                </div>

                {/* 作品標題（懸停顯示） */}
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-3 sm:p-4 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                  <p className="text-white text-xs sm:text-sm font-medium truncate">
                    {item.title}
                  </p>
                </div>

                {/* 作品編號（桌面版顯示） */}
                <div className="hidden md:flex absolute inset-0 items-center justify-center">
                  <div className="text-white text-2xl sm:text-3xl md:text-4xl font-bold opacity-10 group-hover:opacity-20 transition-opacity">
                    #{item.id}
                  </div>
                </div>

                {/* 懸停遮罩效果 */}
                <div className="absolute inset-0 bg-black opacity-0 group-hover:opacity-10 transition-opacity duration-300" />
              </div>
            ))}
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

