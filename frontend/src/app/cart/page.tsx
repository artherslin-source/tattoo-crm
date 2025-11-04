"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Trash2, ShoppingCart, ArrowRight, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getCart, removeCartItem, type Cart } from "@/lib/cart-api";
import { getImageUrl } from "@/lib/api";

export default function CartPage() {
  const router = useRouter();
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(true);
  const [removing, setRemoving] = useState<string | null>(null);

  // 獲取購物車
  useEffect(() => {
    fetchCart();
  }, []);

  const fetchCart = async () => {
    try {
      const data = await getCart();
      setCart(data);
    } catch (error) {
      console.error("獲取購物車失敗:", error);
    } finally {
      setLoading(false);
    }
  };

  // 刪除項目
  const handleRemove = async (itemId: string) => {
    if (!confirm("確定要刪除這個項目嗎？")) return;

    setRemoving(itemId);
    try {
      const updatedCart = await removeCartItem(itemId);
      setCart(updatedCart);
    } catch (error) {
      console.error("刪除失敗:", error);
      alert("刪除失敗，請重試");
    } finally {
      setRemoving(null);
    }
  };

  // 前往結帳
  const handleCheckout = () => {
    router.push("/cart/checkout");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">載入中...</p>
        </div>
      </div>
    );
  }

  const isEmpty = !cart || cart.items.length === 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ShoppingCart className="h-8 w-8 text-blue-600" />
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">購物車</h1>
                <p className="text-sm text-gray-500 mt-0.5">
                  {isEmpty ? "您的購物車是空的" : `共 ${cart.items.length} 個項目`}
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              onClick={() => router.push("/")}
              className="text-sm"
            >
              繼續選購
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isEmpty ? (
          <div className="text-center py-16">
            <Package className="h-24 w-24 text-gray-300 mx-auto mb-6" />
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">購物車是空的</h2>
            <p className="text-gray-500 mb-8">
              瀏覽我們的服務項目，選擇您喜歡的刺青設計
            </p>
            <Button
              onClick={() => router.push("/")}
              className="bg-blue-600 hover:bg-blue-700"
            >
              前往選購
            </Button>
          </div>
        ) : (
          <div className="grid lg:grid-cols-3 gap-8">
            {/* 購物車項目列表 */}
            <div className="lg:col-span-2 space-y-4">
              {cart.items.map((item) => (
                <Card key={item.id} className="overflow-hidden">
                  <CardContent className="p-0">
                    <div className="flex gap-4 p-4">
                      {/* 服務圖片 */}
                      <div className="flex-shrink-0 w-24 h-24 sm:w-32 sm:h-32 bg-gray-100 rounded-lg overflow-hidden relative">
                        {item.serviceImageUrl ? (
                          <Image
                            src={getImageUrl(item.serviceImageUrl)}
                            alt={item.serviceName}
                            fill
                            className="object-cover"
                            unoptimized
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400">
                            🎨
                          </div>
                        )}
                      </div>

                      {/* 服務資訊 */}
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                          {item.serviceName}
                        </h3>
                        
                        {/* 規格顯示 */}
                        <div className="space-y-1.5 mb-3">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              尺寸
                            </Badge>
                            <span className="text-sm font-medium text-gray-700">
                              {item.selectedVariants.size}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              顏色
                            </Badge>
                            <span className="text-sm font-medium text-gray-700">
                              {item.selectedVariants.color}
                            </span>
                          </div>
                          {item.selectedVariants.position && (
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">
                                部位
                              </Badge>
                              <span className="text-sm font-medium text-gray-700">
                                {item.selectedVariants.position}
                              </span>
                            </div>
                          )}
                          {item.selectedVariants.design_fee && item.selectedVariants.design_fee > 0 && (
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">
                                設計費
                              </Badge>
                              <span className="text-sm font-medium text-gray-700">
                                NT$ {item.selectedVariants.design_fee.toLocaleString()}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* 備註 */}
                        {item.notes && (
                          <p className="text-sm text-gray-500 mb-2">
                            備註：{item.notes}
                          </p>
                        )}

                        {/* 價格和時長 */}
                        <div className="flex items-center gap-4 text-sm">
                          <span className="text-xl font-bold text-blue-600">
                            NT$ {item.finalPrice.toLocaleString()}
                          </span>
                          <span className="text-gray-500">
                            約 {item.estimatedDuration} 分鐘
                          </span>
                        </div>
                      </div>

                      {/* 操作按鈕 */}
                      <div className="flex flex-col gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemove(item.id)}
                          disabled={removing === item.id}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50 h-10 w-10 p-0"
                        >
                          {removing === item.id ? (
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-red-500 border-t-transparent"></div>
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* 訂單摘要 */}
            <div className="lg:col-span-1">
              <Card className="sticky top-6">
                <CardContent className="p-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-6">訂單摘要</h2>
                  
                  <div className="space-y-3 mb-6">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">項目數量</span>
                      <span className="font-medium">{cart.items.length} 項</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">預估總時長</span>
                      <span className="font-medium">{cart.totalDuration} 分鐘</span>
                    </div>
                    <div className="border-t pt-3">
                      <div className="flex justify-between items-center">
                        <span className="text-base font-semibold text-gray-900">總計</span>
                        <span className="text-2xl font-bold text-blue-600">
                          NT$ {cart.totalPrice.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  <Button
                    onClick={handleCheckout}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3"
                  >
                    前往結帳
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>

                  <p className="text-xs text-gray-500 text-center mt-4">
                    結帳後將為您安排預約時間
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

