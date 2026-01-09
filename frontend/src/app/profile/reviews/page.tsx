"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star } from "lucide-react";

export default function ProfileReviewsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">我的評價</h2>
        <div className="flex items-center gap-2">
          <p className="text-gray-600">查看您對刺青師的評價與回饋</p>
          <Badge variant="secondary">即將推出</Badge>
        </div>
      </div>

      <Card>
        <CardContent className="py-12 text-center">
          <Star className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">即將推出</h3>
          <p className="text-gray-600">
            這個功能尚在開發中：未來完成預約後，可以為刺青師留下評價與回饋。
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

