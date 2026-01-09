/**
 * Shared pricing helpers
 * - Keep behavior consistent with existing CartService pricing.
 * - Note: design_fee is handled as an addon (not included in base price computation),
 *   while some addons may already be included by legacy logic; we preserve behavior.
 */

export function getAddonTotal(selectedVariants: any): number {
  const v = selectedVariants && typeof selectedVariants === 'object' ? selectedVariants : {};
  const candidates = [v.design_fee, v.custom_addon];
  let sum = 0;
  for (const raw of candidates) {
    const n = typeof raw === 'number' ? raw : Number(raw);
    if (!Number.isFinite(n)) continue;
    if (n <= 0) continue;
    sum += Math.round(n);
  }
  return sum;
}

/**
 * 計算價格（根據選擇的規格）
 * 新價格體系：尺寸×顏色組合定價
 *
 * Returns:
 * - finalPrice: item-level computed price (addons may be handled separately by caller)
 * - estimatedDuration: minutes (currently fixed default)
 */
export function calculatePriceAndDuration(
  basePrice: number,
  baseDuration: number,
  variants: any[],
  selectedVariants: any,
): { finalPrice: number; estimatedDuration: number } {
  let finalPrice = 0;
  const estimatedDuration = 60; // 固定預設值 (不再計算時長)

  const sv = selectedVariants && typeof selectedVariants === 'object' ? selectedVariants : {};

  // 檢查是否有特殊定價邏輯（圖騰小圖案：彩色=黑白+1000）
  // 需要檢查彩色的metadata，因為只有彩色有colorPriceDiff
  const colorVariantForMetadata = variants.find((v) => v.type === 'color' && v.name === '彩色');
  const colorMetadata = colorVariantForMetadata?.metadata as any;
  const hasColorPriceDiff = colorMetadata?.colorPriceDiff !== undefined;

  // 1. 優先使用顏色規格的固定價格（根據價格表，顏色價格是完整價格）
  // 檢查 color 和 size 是否為非空字符串（安全檢查，避免 undefined/null 錯誤）
  const hasColor = sv.color && typeof sv.color === 'string' && sv.color.trim() !== '';
  const hasSize = sv.size && typeof sv.size === 'string' && sv.size.trim() !== '';

  if (hasColor && hasSize) {
    const colorVariant = variants.find((v) => v.type === 'color' && v.name === sv.color);

    if (colorVariant) {
      // 獲取尺寸的價格（黑白價格）
      const sizeVariant = variants.find((v) => v.type === 'size' && v.name === sv.size);

      if (sizeVariant) {
        const blackWhitePrice = sizeVariant.priceModifier;

        // 如果有colorPriceDiff邏輯（圖騰小圖案）
        if (hasColorPriceDiff) {
          if (sv.color === '彩色') {
            const excludeSizes = colorMetadata.excludeSizes || [];

            // 檢查是否在排除列表中（如Z尺寸）
            if (excludeSizes.includes(sv.size)) {
              // 使用特殊的彩色價格（如Z彩色=1000）
              finalPrice = colorMetadata.zColorPrice || 1000;
            } else {
              // 彩色價格 = 黑白價格 + 差價
              const colorPriceDiff = colorMetadata.colorPriceDiff || 1000;
              finalPrice = blackWhitePrice + colorPriceDiff;
            }
          } else if (sv.color === '黑白') {
            // 黑白價格 = 尺寸價格
            finalPrice = blackWhitePrice;
          }
        } else {
          // 沒有colorPriceDiff邏輯，使用原有邏輯
          const metadata = colorVariant.metadata as any;
          if (metadata?.sizePrices && sv.size) {
            // 向後兼容：使用metadata中的sizePrices（舊邏輯）
            const sizePrice = metadata.sizePrices[sv.size];
            if (sizePrice !== undefined) {
              finalPrice = sizePrice;
            } else {
              // 如果metadata中沒有該尺寸的價格，回退到其他邏輯
              if (colorVariant.priceModifier >= 1000) {
                finalPrice = colorVariant.priceModifier;
              } else if (sv.size) {
                const fallbackSizeVariant = variants.find((v) => v.type === 'size' && v.name === sv.size);
                if (fallbackSizeVariant) {
                  finalPrice = fallbackSizeVariant.priceModifier;
                }
              }
            }
          } else if (colorVariant.priceModifier >= 1000) {
            // 如果顏色規格的 priceModifier >= 1000，視為固定價格（完整價格）
            finalPrice = colorVariant.priceModifier;
          } else if (colorVariant.priceModifier > 0) {
            // 向後兼容：使用尺寸 + 顏色加價
            let sizePrice = 0;
            const sizeVariant2 = sv.size ? variants.find((v) => v.type === 'size' && v.name === sv.size) : null;
            if (sizeVariant2) sizePrice = sizeVariant2.priceModifier;
            finalPrice = sizePrice + colorVariant.priceModifier;
          } else {
            // priceModifier 為 0 或負數，使用尺寸價格（黑白）
            if (sv.size) {
              const sizeVariant3 = variants.find((v) => v.type === 'size' && v.name === sv.size);
              if (sizeVariant3) finalPrice = sizeVariant3.priceModifier;
            }
          }
        }
      } else {
        finalPrice = basePrice;
      }
    } else {
      finalPrice = basePrice;
    }
  } else if (hasSize) {
    // 如果只選擇了尺寸，使用尺寸價格
    const sizeVariant = variants.find((v) => v.type === 'size' && v.name === sv.size);
    if (sizeVariant) {
      finalPrice = sizeVariant.priceModifier;
    } else {
      // 如果找不到對應的尺寸，使用基礎價格
      finalPrice = basePrice;
    }
  } else if (hasColor) {
    // 如果只選擇了顏色，使用顏色價格
    const colorVariant = variants.find((v) => v.type === 'color' && v.name === sv.color);
    if (colorVariant) {
      if (colorVariant.priceModifier >= 1000) {
        // 固定價格
        finalPrice = colorVariant.priceModifier;
      } else if (colorVariant.priceModifier > 0) {
        // 加價
        finalPrice = colorVariant.priceModifier;
      } else {
        // 價格為 0，使用基礎價格
        finalPrice = basePrice;
      }
    } else {
      // 如果找不到對應的顏色，使用基礎價格
      finalPrice = basePrice;
    }
  } else {
    // 如果都沒有選擇，使用基礎價格
    finalPrice = basePrice;
  }

  // 3. 計算部位調整
  if (sv.position && typeof sv.position === 'string' && sv.position.trim() !== '') {
    const positionVariant = variants.find((v) => v.type === 'position' && v.name === sv.position);
    if (positionVariant) finalPrice += positionVariant.priceModifier;
  }

  // 4. 計算左右半邊調整
  if (sv.side && typeof sv.side === 'string' && sv.side.trim() !== '') {
    const sideVariant = variants.find((v) => v.type === 'side' && v.name === sv.side);
    if (sideVariant) finalPrice += sideVariant.priceModifier;
  }

  // 5. 設計費另計，不計入總價（由 addons/帳務側統一加回）

  // 6. 計算增出範圍與細膩度加購（custom_addon 是直接輸入的價格）
  if (sv.custom_addon && typeof sv.custom_addon === 'number' && sv.custom_addon > 0) {
    finalPrice += sv.custom_addon;
  }

  // 7. 計算其他規格（風格、複雜度等）
  ['style', 'complexity', 'technique', 'custom'].forEach((type) => {
    const selectedValue = sv[type];
    if (selectedValue) {
      const variant = variants.find((v) => v.type === type && v.name === selectedValue);
      if (variant) finalPrice += variant.priceModifier;
    }
  });

  return { finalPrice, estimatedDuration };
}

