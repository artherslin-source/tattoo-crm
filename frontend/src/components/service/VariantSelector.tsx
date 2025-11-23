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
    blackWhitePrice?: number;
    colorPrice?: number;
    priceDiff?: number;
    useSizeMetadata?: boolean;
    note?: string;
    sizePrices?: Record<string, number>;
    colorPriceDiff?: number;
    excludeSizes?: string[];
    zColorPrice?: number;
  };
}

const COLOR_VARIANT_SUBTITLES: Record<string, string> = {
  黑白: "全黑白漸層",
  半彩: "背景黑白 / 主圖彩色",
  彩色: "全彩色漸層",
  全彩: "全彩色漸層",
};

interface GroupedVariants {
  size?: ServiceVariant[];
  color?: ServiceVariant[];
  position?: ServiceVariant[];
  side?: ServiceVariant[];
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
  side?: string;
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
  const [selectedSide, setSelectedSide] = useState<string>("");
  const [designFee, setDesignFee] = useState<number>(0);
  const [notes, setNotes] = useState<string>("");
  const [adding, setAdding] = useState(false);

  // 獲取規格
  useEffect(() => {
    const fetchVariants = async () => {
      try {
        console.log(`[VariantSelector] 獲取服務規格:`, {
          serviceId: service.id,
          serviceName: service.name
        });
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
          
          // 特別檢查圖騰小圖案的彩色變體 metadata
          if (service.name === '圖騰小圖案' && data.color) {
            const colorVariant = data.color.find((v: ServiceVariant) => v.name === '彩色');
            if (colorVariant) {
              console.log(`🔍 [VariantSelector] 圖騰小圖案-彩色變體:`, {
                id: colorVariant.id,
                name: colorVariant.name,
                metadata: colorVariant.metadata,
                metadataType: typeof colorVariant.metadata
              });
              if (colorVariant.metadata && typeof colorVariant.metadata === 'object') {
                console.log(`🔍 [VariantSelector] metadata 的所有鍵:`, Object.keys(colorVariant.metadata));
                console.log(`🔍 [VariantSelector] metadata.colorPriceDiff:`, colorVariant.metadata.colorPriceDiff);
                console.log(`🔍 [VariantSelector] metadata.useSizeMetadata:`, colorVariant.metadata.useSizeMetadata);
                if (!colorVariant.metadata.colorPriceDiff) {
                  console.error('❌ [VariantSelector] 錯誤！metadata 中沒有 colorPriceDiff！');
                  console.error('❌ [VariantSelector] 這可能是 API 返回了錯誤的數據！');
                }
              }
            } else {
              console.error('❌ [VariantSelector] 找不到彩色變體！');
            }
          }
          
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
          
          // 自動選擇第一個左右半邊選項（如果存在且為必選）
          if (data.side && data.side.length > 0) {
            const requiredSide = data.side.find((v: ServiceVariant) => v.isRequired);
            if (requiredSide) {
              setSelectedSide(requiredSide.name);
              console.log(`[VariantSelector] 自動選擇左右半邊: ${requiredSide.name}`);
            }
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

    // 特別處理：圖騰小圖案的獨立價格計算邏輯
    // 避免與其他服務的顏色變體共用而影響價格顯示
    const isTotemService = service.name === '圖騰小圖案';
    
    // 對於圖騰小圖案，必須確保使用該服務專屬的顏色變體
    // 通過 serviceId 和變體名稱來精確匹配
    let colorVariant: ServiceVariant | undefined;
    let colorMetadata: { 
      sizePrices?: Record<string, number>;
      colorPriceDiff?: number;
      excludeSizes?: string[];
      zColorPrice?: number;
    } | null | undefined = null;
    
    if (isTotemService) {
      // 圖騰小圖案：強制使用該服務的彩色變體
      // 確保不會因為變體共用而使用錯誤的 metadata
      colorVariant = variants.color?.find((v) => v.name === '彩色');
      
      console.log(`🔍 [價格計算] 圖騰小圖案專屬檢查:`, {
        hasColorVariant: !!colorVariant,
        colorVariantId: colorVariant?.id,
        colorVariantName: colorVariant?.name,
        serviceId: service.id,
        serviceName: service.name,
        allColorVariants: variants.color?.map(v => ({ id: v.id, name: v.name }))
      });
      
      // 解析 metadata
      if (colorVariant?.metadata) {
        if (typeof colorVariant.metadata === 'string') {
          try {
            colorMetadata = JSON.parse(colorVariant.metadata);
            console.log(`✅ [價格計算] 圖騰小圖案-解析 metadata 字符串成功:`, colorMetadata);
          } catch (e) {
            console.error('❌ [價格計算] 圖騰小圖案-解析 metadata 失敗:', e);
            colorMetadata = null;
          }
        } else if (typeof colorVariant.metadata === 'object') {
          colorMetadata = colorVariant.metadata as { 
            sizePrices?: Record<string, number>;
            colorPriceDiff?: number;
            excludeSizes?: string[];
            zColorPrice?: number;
          };
          console.log(`✅ [價格計算] 圖騰小圖案-直接使用 metadata 對象:`, colorMetadata);
          console.log(`🔍 [價格計算] 圖騰小圖案-metadata 的所有鍵:`, Object.keys(colorMetadata || {}));
          console.log(`🔍 [價格計算] 圖騰小圖案-metadata.colorPriceDiff:`, colorMetadata?.colorPriceDiff);
        }
      } else {
        console.error('❌ [價格計算] 圖騰小圖案-找不到彩色變體或沒有 metadata！');
      }
    } else {
      // 其他服務：使用通用邏輯
      colorVariant = variants.color?.find((v) => v.name === '彩色');
      
      if (colorVariant?.metadata) {
        if (typeof colorVariant.metadata === 'string') {
          try {
            colorMetadata = JSON.parse(colorVariant.metadata);
          } catch (e) {
            console.warn('⚠️ 無法解析 metadata 字符串:', e);
            colorMetadata = null;
          }
        } else if (typeof colorVariant.metadata === 'object') {
          colorMetadata = colorVariant.metadata as { 
            sizePrices?: Record<string, number>;
            colorPriceDiff?: number;
            excludeSizes?: string[];
            zColorPrice?: number;
          };
        }
      }
    }
    
    const hasColorPriceDiff = colorMetadata?.colorPriceDiff !== undefined;
    
    // 調試信息
    console.log(`🔍 [價格計算] 檢查 colorPriceDiff 邏輯:`, {
      isTotemService,
      hasColorVariant: !!colorVariant,
      colorVariantId: colorVariant?.id,
      rawMetadata: colorVariant?.metadata,
      rawMetadataType: typeof colorVariant?.metadata,
      colorMetadata,
      colorMetadataType: typeof colorMetadata,
      hasColorPriceDiff,
      selectedColor,
      selectedSize,
      serviceId: service.id,
      serviceName: service.name
    });
    
    // 對於圖騰小圖案，如果沒有 colorPriceDiff，這是錯誤的
    if (isTotemService && !hasColorPriceDiff) {
      console.error('❌ [價格計算] 圖騰小圖案必須有 colorPriceDiff！');
      console.error('❌ [價格計算] 這可能是因為變體共用或 API 返回了錯誤的數據！');
    }
    
    // 使用 hasColorPriceDiff（圖騰小圖案必須有，其他服務可能沒有）
    const effectiveHasColorPriceDiff = hasColorPriceDiff;
    
    if (selectedColor && variants.color && selectedSize) {
      const selectedColorVariant = variants.color.find((v) => v.name === selectedColor);
      console.log(`🔍 [價格計算] 選擇的顏色: ${selectedColor}`, selectedColorVariant);
      console.log(`🔍 [價格計算] 選擇的尺寸: ${selectedSize}`);
      console.log(`🔍 [價格計算] 初始 hasColorPriceDiff: ${hasColorPriceDiff}`);
      console.log(`🔍 [價格計算] 最終 hasColorPriceDiff: ${effectiveHasColorPriceDiff}`);
      console.log(`🔍 [價格計算] colorMetadata:`, colorMetadata);
      console.log(`🔍 [價格計算] 所有尺寸變體:`, variants.size?.map(v => ({ name: v.name, priceModifier: v.priceModifier })));
      
      if (selectedColorVariant) {
        // 獲取尺寸的價格（黑白價格）
        const sizeVariant = variants.size?.find((v) => v.name === selectedSize);
        
        if (sizeVariant) {
          const blackWhitePrice = sizeVariant.priceModifier;
          console.log(`🔍 [價格計算] 找到尺寸變體:`, { name: sizeVariant.name, priceModifier: sizeVariant.priceModifier });
          console.log(`🔍 [價格計算] 尺寸價格（黑白）: NT$ ${blackWhitePrice}`);
          
          // 價格計算邏輯
          // 對於圖騰小圖案，必須使用 colorPriceDiff 邏輯
          // 對於其他服務，如果有 colorPriceDiff 也使用，否則使用其他邏輯
          const shouldUseColorPriceDiff = effectiveHasColorPriceDiff && colorMetadata;
          
          if (shouldUseColorPriceDiff && colorMetadata) {
            console.log(`✅ [價格計算] 使用 colorPriceDiff 邏輯`, { 
              colorPriceDiff: colorMetadata.colorPriceDiff,
              effectiveHasColorPriceDiff,
              isTotemService,
              hasColorPriceDiffInMetadata: colorMetadata.colorPriceDiff !== undefined
            });
            if (selectedColor === '彩色') {
              const excludeSizes = colorMetadata.excludeSizes || [];
              
              // 檢查是否在排除列表中（如Z尺寸）
              if (excludeSizes.includes(selectedSize)) {
                // 使用特殊的彩色價格（如Z彩色=1000）
                price = colorMetadata.zColorPrice || 1000;
                console.log(`💰 使用排除尺寸的特殊彩色價格 [${selectedSize} + ${selectedColor}]: NT$ ${price}`);
              } else {
                // 彩色價格 = 黑白價格 + 差價
                const colorPriceDiff = colorMetadata.colorPriceDiff || 1000;
                price = blackWhitePrice + colorPriceDiff;
                console.log(`💰 使用尺寸+顏色差價 [${selectedSize} 黑白=NT$ ${blackWhitePrice} + 彩色差價=NT$ ${colorPriceDiff}]: NT$ ${price}`);
              }
            } else if (selectedColor === '黑白') {
              // 黑白價格 = 尺寸價格
              price = blackWhitePrice;
              console.log(`💰 使用尺寸價格（黑白） [${selectedSize}]: NT$ ${price}`);
            }
          } else {
            // 沒有colorPriceDiff邏輯，使用原有邏輯
            const metadata = selectedColorVariant.metadata as { 
              sizePrices?: Record<string, number>;
              colorPriceDiff?: number;
              excludeSizes?: string[];
              zColorPrice?: number;
            } | null | undefined;
            
            if (metadata?.sizePrices && selectedSize) {
              // 向後兼容：使用metadata中的sizePrices（舊邏輯）
              const sizePrice = metadata.sizePrices[selectedSize];
              if (sizePrice !== undefined) {
                price = sizePrice;
                console.log(`💰 使用metadata中的尺寸+顏色價格 [${selectedSize} + ${selectedColor}]: NT$ ${price}`);
              } else {
                // 如果metadata中沒有該尺寸的價格，回退到其他邏輯
                console.warn(`⚠️ metadata中沒有尺寸「${selectedSize}」的價格，使用其他邏輯`);
                if (selectedColorVariant.priceModifier >= 1000) {
                  price = selectedColorVariant.priceModifier;
                } else if (selectedSize && variants.size) {
                  const sizeVariant = variants.size.find((v) => v.name === selectedSize);
                  if (sizeVariant) {
                    price = sizeVariant.priceModifier;
                  }
                }
              }
            } else if (selectedColorVariant.priceModifier >= 1000) {
              // 如果顏色規格的 priceModifier >= 1000，視為固定價格（完整價格）
              price = selectedColorVariant.priceModifier;
              console.log(`💰 使用顏色固定價格 [${selectedColor}]: NT$ ${price}`);
            } else if (selectedColorVariant.priceModifier > 0) {
              // 向後兼容：使用尺寸 + 顏色加價
              if (selectedSize && variants.size) {
                const sizeVariant = variants.size.find((v) => v.name === selectedSize);
                if (sizeVariant) {
                  price = sizeVariant.priceModifier;
                }
              }
              price += selectedColorVariant.priceModifier;
              console.log(`💰 使用尺寸+顏色加價 [${selectedSize || '無尺寸'} + ${selectedColor}]: NT$ ${price}`);
            } else {
              // priceModifier 為 0 或負數，使用尺寸價格（黑白）
              if (selectedSize && variants.size) {
                const sizeVariant = variants.size.find((v) => v.name === selectedSize);
                if (sizeVariant) {
                  price = sizeVariant.priceModifier;
                  console.log(`💰 使用尺寸價格 [${selectedSize}]: NT$ ${price}`);
                }
              }
            }
          }
        } else {
          console.warn(`⚠️ 找不到尺寸「${selectedSize}」`);
        }
      } else {
        console.warn(`⚠️ 找不到顏色規格: ${selectedColor}`);
      }
    } else if (selectedSize && variants.size) {
      // 如果只選擇了尺寸，使用尺寸價格
      const sizeVariant = variants.size.find((v) => v.name === selectedSize);
      if (sizeVariant) {
        price = sizeVariant.priceModifier;
        console.log(`💰 使用尺寸價格（僅尺寸） [${selectedSize}]: NT$ ${price}`);
      }
    }
    
    console.log(`💰 [價格計算] 最終價格: NT$ ${price}`);

    // 部位加價
    if (selectedPosition && variants.position) {
      const positionVariant = variants.position.find((v) => v.name === selectedPosition);
      if (positionVariant) {
        price += positionVariant.priceModifier;
      }
    }

    // 左右半邊加價
    if (selectedSide && variants.side) {
      const sideVariant = variants.side.find((v) => v.name === selectedSide);
      if (sideVariant) {
        price += sideVariant.priceModifier;
      }
    }

    // 設計費
    if (designFee > 0) {
      price += designFee;
    }

    return price;
  }, [selectedSize, selectedColor, selectedPosition, selectedSide, designFee, variants]);

  // 處理加入購物車
  const handleAddToCart = async () => {
    // 只要求至少選擇顏色（尺寸已停用，變為可選）
    if (!selectedColor) {
      alert("請至少選擇顏色");
      return;
    }

    setAdding(true);
    try {
      const selectedVariants: SelectedVariants = {
        size: selectedSize || "",
        color: selectedColor,
      };

      if (selectedPosition) {
        selectedVariants.position = selectedPosition;
      }

      // 左右半邊
      if (selectedSide) {
        selectedVariants.side = selectedSide;
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
                尺寸
                <Badge variant="outline" className="ml-2 text-xs">
                  可選
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
                顏色
                <Badge variant="outline" className="ml-2 text-xs bg-blue-50 text-blue-700 border-blue-200">
                  建議選擇
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
                    {(() => {
                      const subtitle = COLOR_VARIANT_SUBTITLES[variant.name];
                      if (!subtitle) return null;
                      return (
                      <div className="mt-1 text-xs text-gray-700 font-medium">
                        {subtitle}
                      </div>
                      );
                    })()}
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

          {/* 左右半邊選擇 */}
          {variants.side && variants.side.length > 0 && (
            <div>
              <Label className="mb-3 flex items-center text-base font-semibold text-gray-900">
                左右半邊
                <Badge variant="outline" className="ml-2 text-xs">
                  {variants.side.some((v) => v.isRequired) ? "必選" : "可選"}
                </Badge>
              </Label>
              <div className="grid grid-cols-2 gap-2">
                {variants.side.map((variant) => (
                  <button
                    key={variant.id}
                    onClick={() =>
                      setSelectedSide(
                        selectedSide === variant.name ? "" : variant.name
                      )
                    }
                    className={`
                      rounded-lg border-2 px-4 py-3 text-sm font-medium transition-all
                      ${
                        selectedSide === variant.name
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

          {/* 設計費（前台和管理後台都可顯示） */}
          {variants.design_fee && variants.design_fee.length > 0 && (
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
              {selectedSize && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-blue-600 font-medium">尺寸</span>
                  <span className="font-semibold text-blue-700">{selectedSize}</span>
                </div>
              )}
              {selectedColor && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-blue-600 font-medium">顏色</span>
                  <span className="font-semibold text-blue-700">{selectedColor}</span>
                </div>
              )}
              {selectedPosition && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-blue-600 font-medium">部位</span>
                  <span className="font-semibold text-blue-700">{selectedPosition}</span>
                </div>
              )}
              {selectedSide && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-blue-600 font-medium">左右半邊</span>
                  <span className="font-semibold text-blue-700">{selectedSide}</span>
                </div>
              )}
              {designFee > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-blue-600 font-medium">設計費</span>
                  <span className="font-semibold text-blue-700">+{designFee.toLocaleString()}元</span>
                </div>
              )}
              <div className="border-t border-blue-200 pt-3 mt-3">
                <div className="flex items-center justify-between">
                  <span className="text-base font-semibold text-gray-900">
                    預估總價
                  </span>
                  <span className="text-2xl font-bold text-blue-600">
                    NT$ {(calculatedPrice || 0).toLocaleString()}
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
            className="flex-1 text-blue-600 border-blue-600 hover:bg-blue-50"
            disabled={adding}
          >
            取消
          </Button>
          <Button
            onClick={handleAddToCart}
            className="flex-1 bg-blue-600 hover:bg-blue-700"
            disabled={adding || !selectedColor}
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

