"use client";

import { useState, useEffect, useMemo } from "react";
import { X, ShoppingCart, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getApiBase } from "@/lib/api";

interface ServiceVariant {
  id: string;
  type: string;
  name: string;
  code?: string;
  description?: string;
  priceModifier: number;
  sortOrder: number;
  isRequired: boolean;
  metadata?: {
    isCustomPrice?: boolean;
    displayText?: string;
  };
}

interface GroupedVariants {
  size?: ServiceVariant[];
  color?: ServiceVariant[];
  position?: ServiceVariant[];
  design_fee?: ServiceVariant[];
  style?: ServiceVariant[];
  complexity?: ServiceVariant[];
}

interface Service {
  id: string;
  name: string;
  description?: string;
  price: number;
  durationMin: number;
  imageUrl?: string | null;
  category?: string | null;
  hasVariants?: boolean;
}

interface SelectedVariants {
  size: string;
  color: string;
  position?: string;
  design_fee?: number;
  style?: string;
  complexity?: string;
}

interface VariantSelectorProps {
  service: Service;
  onClose: () => void;
  onAddToCart: (selectedVariants: SelectedVariants, notes: string) => Promise<void>;
  isAdmin?: boolean; // 是否為管理後台模式
}

export function VariantSelector({ service, onClose, onAddToCart, isAdmin = false }: VariantSelectorProps) {
  const [variants, setVariants] = useState<GroupedVariants>({});
  const [loading, setLoading] = useState(true);
  const [selectedSize, setSelectedSize] = useState<string>("");
  const [selectedColor, setSelectedColor] = useState<string>("");
  const [selectedPosition, setSelectedPosition] = useState<string>("");
  const [designFee, setDesignFee] = useState<number>(0);
  const [notes, setNotes] = useState<string>("");
  const [adding, setAdding] = useState(false);

  // 獲取規格
  useEffect(() => {
    const fetchVariants = async () => {
      try {
        console.log(`[VariantSelector] 獲取服務規格: ${service.id}`);
        const url = `${getApiBase()}/services/${service.id}/variants`;
        console.log(`[VariantSelector] API URL: ${url}`);
        
        const response = await fetch(url, {
          cache: 'no-store', // 強制不使用緩存
          headers: {
            'Cache-Control': 'no-cache',
          },
        });
        console.log(`[VariantSelector] 響應狀態: ${response.status}`);
        
        if (response.ok) {
          const data = await response.json();
          console.log(`[VariantSelector] 獲取的規格數據:`, data);
          
          // 檢查數據結構
          if (!data || typeof data !== 'object') {
            console.error('[VariantSelector] 規格數據格式錯誤:', data);
            alert('規格數據格式錯誤，請確認服務已初始化規格');
            setLoading(false);
            return;
          }
          
          setVariants(data);
          
          // 自動選擇第一個必選項
          if (data.size && data.size.length > 0) {
            setSelectedSize(data.size[0].name);
            console.log(`[VariantSelector] 自動選擇尺寸: ${data.size[0].name}`);
          } else {
            console.warn('[VariantSelector] 沒有尺寸選項');
          }
          
          if (data.color && data.color.length > 0) {
            setSelectedColor(data.color[0].name);
            console.log(`[VariantSelector] 自動選擇顏色: ${data.color[0].name}`);
          } else {
            console.warn('[VariantSelector] 沒有顏色選項');
          }
        } else {
          const errorText = await response.text();
          console.error(`[VariantSelector] API 錯誤: ${response.status} - ${errorText}`);
          alert(`此服務尚未設定規格，請聯繫管理員初始化規格`);
        }
      } catch (error) {
        console.error("[VariantSelector] 獲取規格失敗:", error);
        alert('獲取規格失敗，請稍後再試');
      } finally {
        setLoading(false);
      }
    };

    fetchVariants();
  }, [service.id]);

  // 計算最終價格
  const calculatedPrice = useMemo(() => {
    let price = 0;

    // 尺寸價格（已包含黑白價格）
    if (selectedSize && variants.size) {
      const sizeVariant = variants.size.find((v) => v.name === selectedSize);
      if (sizeVariant) {
        price += sizeVariant.priceModifier;
      }
    }

    // 顏色加價（彩色通常+1000，但16-17cm例外）
    if (selectedColor && variants.color) {
      const colorVariant = variants.color.find((v) => v.name === selectedColor);
      if (colorVariant) {
        // 特殊情況：16-17cm + 彩色 不加價
        if (selectedSize === "16-17cm" && selectedColor === "彩色") {
          // 不加價
        } else {
          price += colorVariant.priceModifier;
        }
      }
    }

    // 部位加價
    if (selectedPosition && variants.position) {
      const positionVariant = variants.position.find((v) => v.name === selectedPosition);
      if (positionVariant) {
        price += positionVariant.priceModifier;
      }
    }

    // 設計費
    if (designFee > 0) {
      price += designFee;
    }

    return price;
  }, [selectedSize, selectedColor, selectedPosition, designFee, variants]);

  // 處理加入購物車
  const handleAddToCart = async () => {
    if (!selectedSize || !selectedColor) {
      alert("請選擇尺寸和顏色");
      return;
    }

    setAdding(true);
    try {
      const selectedVariants: SelectedVariants = {
        size: selectedSize,
        color: selectedColor,
      };

      if (selectedPosition) {
        selectedVariants.position = selectedPosition;
      }

      if (designFee > 0) {
        selectedVariants.design_fee = designFee;
      }

      await onAddToCart(selectedVariants, notes);
      onClose();
    } catch (error) {
      console.error("加入購物車失敗:", error);
      alert("加入購物車失敗，請重試");
    } finally {
      setAdding(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <div className="w-full max-w-2xl rounded-2xl bg-white p-8 shadow-2xl">
          <div className="flex items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600"></div>
            <span className="ml-3 text-gray-600">載入中...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-white px-6 py-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{service.name}</h2>
            <p className="mt-1 text-sm text-gray-500">選擇您的規格</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 hover:bg-gray-100 transition-colors"
            aria-label="關閉"
          >
            <X className="h-6 w-6 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* 調試信息 */}
          {(!variants.size || variants.size.length === 0) && (!variants.color || variants.color.length === 0) && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
              <div className="text-yellow-800 font-semibold mb-2">
                ⚠️ 此服務尚未設定規格
              </div>
              <p className="text-sm text-yellow-700 mb-4">
                請聯繫管理員為此服務初始化規格，或者選擇其他服務。
              </p>
              <div className="text-xs text-gray-600 bg-white p-3 rounded border">
                <div className="font-mono text-left">
                  <div>服務 ID: {service.id}</div>
                  <div>服務名稱: {service.name}</div>
                  <div>hasVariants: {service.hasVariants ? '是' : '否'}</div>
                  <div className="mt-2">
                    已獲取規格：
                    <div className="ml-4">
                      尺寸: {variants.size?.length || 0} 個
                    </div>
                    <div className="ml-4">
                      顏色: {variants.color?.length || 0} 個
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 尺寸選擇 */}
          {variants.size && variants.size.length > 0 && (
            <div>
              <Label className="mb-3 flex items-center text-base font-semibold text-gray-900">
                尺寸 <span className="ml-1 text-red-500">*</span>
                <Badge variant="outline" className="ml-2 text-xs">
                  必選
                </Badge>
              </Label>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {variants.size.map((variant) => (
                  <button
                    key={variant.id}
                    onClick={() => setSelectedSize(variant.name)}
                    className={`
                      relative rounded-lg border-2 px-4 py-3 text-sm font-medium transition-all
                      ${
                        selectedSize === variant.name
                          ? "border-blue-600 bg-blue-50 text-blue-700 ring-2 ring-blue-600 ring-offset-1"
                          : "border-gray-300 hover:border-gray-400 hover:bg-gray-50 text-gray-800 hover:text-gray-900"
                      }
                    `}
                  >
                    <div className="font-bold text-base">{variant.name}</div>
                    {variant.description && (
                      <div className="mt-0.5 text-xs text-gray-600 truncate font-medium">
                        {variant.description.split("（")[0]}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 顏色選擇 */}
          {variants.color && variants.color.length > 0 && (
            <div>
              <Label className="mb-3 flex items-center text-base font-semibold text-gray-900">
                顏色 <span className="ml-1 text-red-500">*</span>
                <Badge variant="outline" className="ml-2 text-xs">
                  必選
                </Badge>
              </Label>
              <div className="grid grid-cols-2 gap-3">
                {variants.color.map((variant) => (
                  <button
                    key={variant.id}
                    onClick={() => setSelectedColor(variant.name)}
                    className={`
                      relative rounded-lg border-2 px-6 py-4 text-sm font-medium transition-all
                      ${
                        selectedColor === variant.name
                          ? "border-blue-600 bg-blue-50 text-blue-700 ring-2 ring-blue-600 ring-offset-1"
                          : "border-gray-400 hover:border-gray-500 hover:bg-gray-50 text-gray-900 hover:text-black"
                      }
                    `}
                  >
                    <div className="text-xl font-bold">{variant.name}</div>
                    {variant.description && (
                      <div className="mt-1 text-xs text-gray-700 font-medium">
                        {variant.description}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 部位選擇 */}
          {variants.position && variants.position.length > 0 && (
            <div>
              <Label className="mb-3 flex items-center text-base font-semibold text-gray-900">
                部位 
                <Badge variant="outline" className="ml-2 text-xs">
                  可選
                </Badge>
              </Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {variants.position.map((variant) => (
                  <button
                    key={variant.id}
                    onClick={() =>
                      setSelectedPosition(
                        selectedPosition === variant.name ? "" : variant.name
                      )
                    }
                    className={`
                      rounded-lg border-2 px-4 py-3 text-sm font-medium transition-all
                      ${
                        selectedPosition === variant.name
                          ? "border-blue-600 bg-blue-50 text-blue-700"
                          : "border-gray-300 hover:border-gray-400 hover:bg-gray-50 text-gray-800 hover:text-gray-900"
                      }
                    `}
                  >
                    <div className="font-semibold">{variant.name}</div>
                    {variant.priceModifier > 0 && (
                      <div className="mt-0.5 text-xs text-gray-700 font-medium">
                        +{variant.priceModifier}元
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 設計費（管理後台模式） */}
          {isAdmin && variants.design_fee && variants.design_fee.length > 0 && (
            <div>
              <Label className="mb-3 flex items-center text-base font-semibold text-gray-900">
                設計費
                <Badge variant="outline" className="ml-2 text-xs">
                  可選
                </Badge>
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  placeholder="輸入設計費（元）"
                  value={designFee || ""}
                  onChange={(e) => setDesignFee(Number(e.target.value) || 0)}
                  className="w-full"
                  min="0"
                  step="100"
                />
                <span className="text-sm text-gray-500">元</span>
              </div>
              <p className="mt-2 text-xs text-gray-500 flex items-center gap-1">
                <Info className="h-3 w-3" />
                設計費將加入總價計算
              </p>
            </div>
          )}

          {/* 備註 */}
          <div>
            <Label className="mb-2 text-base font-semibold text-gray-900">
              備註
            </Label>
            <Textarea
              placeholder="有任何特殊需求或想法，請在此說明..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="resize-none"
            />
          </div>

          {/* 價格預覽 */}
          <div className="rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 p-6 border border-blue-100">
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">尺寸</span>
                <span className="font-semibold">{selectedSize || "-"}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">顏色</span>
                <span className="font-semibold">{selectedColor || "-"}</span>
              </div>
              {selectedPosition && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">部位</span>
                  <span className="font-semibold">{selectedPosition}</span>
                </div>
              )}
              {designFee > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">設計費</span>
                  <span className="font-semibold">+{designFee.toLocaleString()}元</span>
                </div>
              )}
              <div className="border-t border-blue-200 pt-3 mt-3">
                <div className="flex items-center justify-between">
                  <span className="text-base font-semibold text-gray-900">
                    預估總價
                  </span>
                  <span className="text-2xl font-bold text-blue-600">
                    NT$ {calculatedPrice.toLocaleString()}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  * 實際價格可能依實際狀況調整
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 border-t bg-white px-6 py-4 flex gap-3">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1"
            disabled={adding}
          >
            取消
          </Button>
          <Button
            onClick={handleAddToCart}
            className="flex-1 bg-blue-600 hover:bg-blue-700"
            disabled={adding || !selectedSize || !selectedColor}
          >
            {adding ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent mr-2"></div>
                處理中...
              </>
            ) : (
              <>
                <ShoppingCart className="mr-2 h-4 w-4" />
                加入購物車
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

