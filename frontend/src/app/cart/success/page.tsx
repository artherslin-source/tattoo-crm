"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle, Calendar, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Suspense } from "react";

function SuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const appointmentId = searchParams.get("appointmentId");
  const orderId = searchParams.get("orderId");

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardContent className="pt-8 pb-8">
          <div className="text-center">
            {/* 成功圖標 */}
            <div className="mx-auto w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6">
              <CheckCircle className="h-12 w-12 text-green-600" />
            </div>

            {/* 標題 */}
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              預約成功！
            </h1>
            <p className="text-gray-600 mb-8">
              我們已收到您的預約申請，稍後會有專人與您聯繫確認時間
            </p>

            {/* 預約資訊 */}
            <div className="bg-blue-50 rounded-lg p-6 mb-8 space-y-3">
              {appointmentId && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    預約編號
                  </span>
                  <span className="font-mono font-semibold text-gray-900">
                    {appointmentId.slice(0, 8).toUpperCase()}
                  </span>
                </div>
              )}
              {orderId && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">訂單編號</span>
                  <span className="font-mono font-semibold text-gray-900">
                    {orderId.slice(0, 8).toUpperCase()}
                  </span>
                </div>
              )}
            </div>

            {/* 後續步驟 */}
            <div className="text-left bg-gray-50 rounded-lg p-4 mb-8">
              <h3 className="font-semibold text-gray-900 mb-3">後續步驟：</h3>
              <ol className="space-y-2 text-sm text-gray-600">
                <li className="flex gap-2">
                  <span className="font-semibold">1.</span>
                  <span>我們會在 24 小時內與您聯繫確認預約時間</span>
                </li>
                <li className="flex gap-2">
                  <span className="font-semibold">2.</span>
                  <span>刺青師會與您討論設計細節</span>
                </li>
                <li className="flex gap-2">
                  <span className="font-semibold">3.</span>
                  <span>到店施作，完成您的刺青作品</span>
                </li>
              </ol>
            </div>

            {/* 操作按鈕 */}
            <div className="space-y-3">
              <Button
                onClick={() => router.push("/")}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                <Home className="mr-2 h-4 w-4" />
                返回首頁
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push("/appointments")}
                className="w-full"
              >
                查看我的預約
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600"></div>
      </div>
    }>
      <SuccessContent />
    </Suspense>
  );
}

