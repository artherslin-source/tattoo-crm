"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Heart } from "lucide-react";

export default function ProfileFavoritesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">我的收藏作品</h2>
        <p className="text-gray-600">收藏喜歡的刺青作品，方便日後參考</p>
      </div>

      <Card>
        <CardContent className="py-12 text-center">
          <Heart className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">尚無收藏作品</h3>
          <p className="text-gray-600">
            瀏覽刺青師作品集，點擊收藏您喜歡的設計
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

