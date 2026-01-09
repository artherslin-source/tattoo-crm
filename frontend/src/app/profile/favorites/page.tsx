"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Heart } from "lucide-react";

export default function ProfileFavoritesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">我的收藏作品</h2>
        <div className="flex items-center gap-2">
          <p className="text-gray-600">收藏喜歡的刺青作品，方便日後參考</p>
          <Badge variant="secondary">即將推出</Badge>
        </div>
      </div>

      <Card>
        <CardContent className="py-12 text-center">
          <Heart className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">即將推出</h3>
          <p className="text-gray-600">
            這個功能尚在開發中：未來可在刺青師作品集中一鍵收藏喜歡的設計，方便日後參考。
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

