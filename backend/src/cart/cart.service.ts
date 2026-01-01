import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AddToCartDto, UpdateCartItemDto, CartResponseDto, CartItemResponseDto } from './dto/add-to-cart.dto';
import { CheckoutCartDto } from './dto/checkout-cart.dto';
// dayBounds was previously used for slot-based conflict checks; C-flow INTENT checkout doesn't need it.

@Injectable()
export class CartService {
  constructor(private prisma: PrismaService) {}

  /**
   * 獲取或創建購物車
   */
  async getOrCreateCart(userId?: string, sessionId?: string): Promise<string> {
    if (!userId && !sessionId) {
      throw new BadRequestException('必須提供 userId 或 sessionId');
    }

    // 查找現有購物車
    const existingCart = await this.prisma.cart.findFirst({
      where: {
        OR: [
          userId ? { userId } : {},
          sessionId ? { sessionId } : {},
        ],
        status: 'active',
        expiresAt: {
          gt: new Date(),
        },
      },
    });

    if (existingCart) {
      return existingCart.id;
    }

    // 創建新購物車（7天過期）
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const newCart = await this.prisma.cart.create({
      data: {
        userId,
        sessionId,
        status: 'active',
        expiresAt,
      },
    });

    return newCart.id;
  }

  /**
   * 加入購物車
   */
  async addToCart(
    dto: AddToCartDto,
    userId?: string,
    sessionId?: string,
  ): Promise<CartResponseDto> {
    // 驗證服務存在
    const service = await this.prisma.service.findUnique({
      where: { id: dto.serviceId },
      include: {
        variants: {
          where: { isActive: true },
        },
      },
    });

    if (!service || !service.isActive) {
      throw new NotFoundException('服務不存在或已停用');
    }

    // 驗證規格選項（所有規格都非必選）
    const { size, color, position, side } = dto.selectedVariants;
    
    // 所有規格都非必選，不需要驗證

    // 計算價格和時長
    const { finalPrice, estimatedDuration } = this.calculatePriceAndDuration(
      service.price,
      service.durationMin,
      service.variants,
      dto.selectedVariants,
    );

    // 獲取或創建購物車
    const cartId = await this.getOrCreateCart(userId, sessionId);

    // 添加項目到購物車
    await this.prisma.cartItem.create({
      data: {
        cartId,
        serviceId: dto.serviceId,
        selectedVariants: dto.selectedVariants,
        basePrice: service.price,
        finalPrice,
        estimatedDuration,
        notes: dto.notes,
        referenceImages: dto.referenceImages || [],
      },
    });

    // 返回購物車詳情
    return this.getCartDetails(cartId);
  }

  /**
   * 更新購物車項目
   */
  async updateCartItem(
    cartItemId: string,
    dto: UpdateCartItemDto,
    userId?: string,
    sessionId?: string,
  ): Promise<CartResponseDto> {
    const cartItem = await this.prisma.cartItem.findUnique({
      where: { id: cartItemId },
      include: {
        cart: true,
        service: {
          include: {
            variants: {
              where: { isActive: true },
            },
          },
        },
      },
    });

    if (!cartItem) {
      throw new NotFoundException('購物車項目不存在');
    }

    // 驗證權限
    if (userId && cartItem.cart.userId !== userId) {
      throw new BadRequestException('無權限修改此購物車項目');
    }
    if (sessionId && cartItem.cart.sessionId !== sessionId) {
      throw new BadRequestException('無權限修改此購物車項目');
    }

    // 合併規格
    const updatedVariants = {
      ...(cartItem.selectedVariants as object),
      ...dto.selectedVariants,
    };

    // 重新計算價格和時長
    const { finalPrice, estimatedDuration } = this.calculatePriceAndDuration(
      cartItem.service.price,
      cartItem.service.durationMin,
      cartItem.service.variants,
      updatedVariants,
    );

    // 更新項目
    await this.prisma.cartItem.update({
      where: { id: cartItemId },
      data: {
        selectedVariants: updatedVariants,
        finalPrice,
        estimatedDuration,
        notes: dto.notes !== undefined ? dto.notes : cartItem.notes,
        referenceImages: dto.referenceImages !== undefined ? dto.referenceImages : cartItem.referenceImages,
      },
    });

    return this.getCartDetails(cartItem.cartId);
  }

  /**
   * 刪除購物車項目
   */
  async removeCartItem(
    cartItemId: string,
    userId?: string,
    sessionId?: string,
  ): Promise<CartResponseDto> {
    const cartItem = await this.prisma.cartItem.findUnique({
      where: { id: cartItemId },
      include: { cart: true },
    });

    if (!cartItem) {
      throw new NotFoundException('購物車項目不存在');
    }

    // 驗證權限
    if (userId && cartItem.cart.userId !== userId) {
      throw new BadRequestException('無權限刪除此購物車項目');
    }
    if (sessionId && cartItem.cart.sessionId !== sessionId) {
      throw new BadRequestException('無權限刪除此購物車項目');
    }

    await this.prisma.cartItem.delete({
      where: { id: cartItemId },
    });

    return this.getCartDetails(cartItem.cartId);
  }

  /**
   * 獲取購物車詳情
   */
  async getCartDetails(
    cartId?: string,
    userId?: string,
    sessionId?: string,
  ): Promise<CartResponseDto> {
    let cart;

    if (cartId) {
      cart = await this.prisma.cart.findUnique({
        where: { id: cartId },
        include: {
          items: {
            include: {
              service: true,
            },
          },
        },
      });
    } else {
      cart = await this.prisma.cart.findFirst({
        where: {
          OR: [
            userId ? { userId } : {},
            sessionId ? { sessionId } : {},
          ],
          status: 'active',
          expiresAt: {
            gt: new Date(),
          },
        },
        include: {
          items: {
            include: {
              service: true,
            },
          },
        },
      });
    }

    if (!cart) {
      // 返回空購物車
      return {
        id: '',
        userId,
        sessionId,
        status: 'active',
        expiresAt: new Date(),
        items: [],
        totalPrice: 0,
        totalDuration: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }

    // 計算總價和總時長
    const totalPrice = cart.items.reduce((sum, item) => sum + item.finalPrice, 0);
    const totalDuration = cart.items.reduce((sum, item) => sum + item.estimatedDuration, 0);

    // 轉換為響應格式
    const items: CartItemResponseDto[] = cart.items.map((item) => ({
      id: item.id,
      cartId: item.cartId,
      serviceId: item.serviceId,
      serviceName: item.service.name,
      serviceDescription: item.service.description,
      serviceImageUrl: item.service.imageUrl,
      selectedVariants: item.selectedVariants as any,
      basePrice: item.basePrice,
      finalPrice: item.finalPrice,
      estimatedDuration: item.estimatedDuration,
      notes: item.notes,
      referenceImages: item.referenceImages,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    }));

    return {
      id: cart.id,
      userId: cart.userId,
      sessionId: cart.sessionId,
      status: cart.status,
      expiresAt: cart.expiresAt,
      items,
      totalPrice,
      totalDuration,
      createdAt: cart.createdAt,
      updatedAt: cart.updatedAt,
    };
  }

  /**
   * 結帳（將購物車轉成聯絡管理）
   */
  async checkout(
    dto: CheckoutCartDto,
    userId?: string,
    sessionId?: string,
  ): Promise<{ contactId: string }> {
    // 獲取購物車
    const cart = await this.prisma.cart.findFirst({
      where: {
        OR: [
          userId ? { userId } : {},
          sessionId ? { sessionId } : {},
        ],
        status: 'active',
        expiresAt: {
          gt: new Date(),
        },
      },
      include: {
        items: {
          include: {
            service: true,
          },
        },
      },
    });

    if (!cart || cart.items.length === 0) {
      throw new BadRequestException('購物車為空');
    }

    // 計算總價和總時長（用於 cartSnapshot）
    const totalPrice = cart.items.reduce((sum, item) => sum + item.finalPrice, 0);
    const totalDuration = cart.items.reduce((sum, item) => sum + item.estimatedDuration, 0);

    // 創建購物車快照
    const cartSnapshot = {
      items: cart.items.map((item) => ({
        serviceId: item.serviceId,
        serviceName: item.service.name,
        selectedVariants: item.selectedVariants,
        basePrice: item.basePrice,
        finalPrice: item.finalPrice,
        estimatedDuration: item.estimatedDuration,
        notes: item.notes,
        referenceImages: item.referenceImages,
      })),
      totalPrice,
      totalDuration,
      preferredDate: dto.preferredDate, // 保存客戶偏好日期
    };

    // 處理 artistId（如果有提供）
    // 前端可能傳 Artist.id 或 User.id，需要統一轉換為 User.id
    let preferredArtistUserId: string | undefined = undefined;
    if (dto.artistId) {
      // 先檢查是否為 User.id（直接查詢 User 表）
      const userAsArtist = await this.prisma.user.findUnique({
        where: { id: dto.artistId },
        select: { id: true, role: true },
      });
      
      if (userAsArtist && userAsArtist.role === 'ARTIST') {
        // 已經是 User.id，直接使用
        preferredArtistUserId = dto.artistId;
      } else {
        // 可能是 Artist.id，需要轉換為 User.id
        const artist = await this.prisma.artist.findUnique({
          where: { id: dto.artistId },
          select: { userId: true },
        });
        
        if (artist) {
          preferredArtistUserId = artist.userId;
        } else {
          // 如果都找不到，可能是無效的 ID，設為 undefined
          console.warn(`⚠️ 無法找到藝術家 ID: ${dto.artistId}`);
          preferredArtistUserId = undefined;
        }
      }
    }

    // 建立 Contact（聯絡管理）
    const contact = await this.prisma.contact.create({
      data: {
        name: dto.customerName,
        phone: dto.customerPhone,
        email: dto.customerEmail || null,
        branchId: dto.branchId,
        preferredArtistId: preferredArtistUserId,
        notes: dto.specialRequests || null,
        status: 'PENDING',
        cartSnapshot,
        cartTotalPrice: totalPrice,
      },
    });

    // 清空購物車品項（保留 cart 本體以便客戶繼續購物）
    await this.prisma.cartItem.deleteMany({
      where: { cartId: cart.id },
    });

    return {
      contactId: contact.id,
    };
  }

  /**
   * 計算價格（根據選擇的規格）
   * 新價格體系：尺寸×顏色組合定價
   */
  private calculatePriceAndDuration(
    basePrice: number,
    baseDuration: number,
    variants: any[],
    selectedVariants: any,
  ): { finalPrice: number; estimatedDuration: number } {
    let finalPrice = 0;
    const estimatedDuration = 60; // 固定預設值 (不再計算時長)

    // 檢查是否有特殊定價邏輯（圖騰小圖案：彩色=黑白+1000）
    // 需要檢查彩色的metadata，因為只有彩色有colorPriceDiff
    const colorVariantForMetadata = variants.find(
      (v) => v.type === 'color' && v.name === '彩色',
    );
    const colorMetadata = colorVariantForMetadata?.metadata as any;
    const hasColorPriceDiff = colorMetadata?.colorPriceDiff !== undefined;
    
    // 1. 優先使用顏色規格的固定價格（根據價格表，顏色價格是完整價格）
    // 檢查 color 和 size 是否為非空字符串（安全檢查，避免 undefined/null 錯誤）
    const hasColor = selectedVariants.color && 
                     typeof selectedVariants.color === 'string' && 
                     selectedVariants.color.trim() !== '';
    const hasSize = selectedVariants.size && 
                    typeof selectedVariants.size === 'string' && 
                    selectedVariants.size.trim() !== '';
    
    if (hasColor && hasSize) {
      const colorVariant = variants.find(
        (v) => v.type === 'color' && v.name === selectedVariants.color,
      );
      console.log(`🔍 [後端價格計算] 選擇的顏色: ${selectedVariants.color}`, colorVariant);
      console.log(`🔍 [後端價格計算] 選擇的尺寸: ${selectedVariants.size}`);
      console.log(`🔍 [後端價格計算] 是否有colorPriceDiff: ${hasColorPriceDiff}`);
      
      if (colorVariant) {
        // 獲取尺寸的價格（黑白價格）
        const sizeVariant = variants.find(
          (v) => v.type === 'size' && v.name === selectedVariants.size,
        );
        
        if (sizeVariant) {
          const blackWhitePrice = sizeVariant.priceModifier;
          console.log(`🔍 [後端價格計算] 尺寸價格（黑白）: NT$ ${blackWhitePrice}`);
          
          // 如果有colorPriceDiff邏輯（圖騰小圖案）
          if (hasColorPriceDiff) {
            if (selectedVariants.color === '彩色') {
              const excludeSizes = colorMetadata.excludeSizes || [];
              
              // 檢查是否在排除列表中（如Z尺寸）
              if (excludeSizes.includes(selectedVariants.size)) {
                // 使用特殊的彩色價格（如Z彩色=1000）
                finalPrice = colorMetadata.zColorPrice || 1000;
                console.log(`💰 使用排除尺寸的特殊彩色價格 [${selectedVariants.size} + ${selectedVariants.color}]: NT$ ${finalPrice}`);
              } else {
                // 彩色價格 = 黑白價格 + 差價
                const colorPriceDiff = colorMetadata.colorPriceDiff || 1000;
                finalPrice = blackWhitePrice + colorPriceDiff;
                console.log(`💰 使用尺寸+顏色差價 [${selectedVariants.size} 黑白=NT$ ${blackWhitePrice} + 彩色差價=NT$ ${colorPriceDiff}]: NT$ ${finalPrice}`);
              }
            } else if (selectedVariants.color === '黑白') {
              // 黑白價格 = 尺寸價格
              finalPrice = blackWhitePrice;
              console.log(`💰 使用尺寸價格（黑白） [${selectedVariants.size}]: NT$ ${finalPrice}`);
            }
          } else {
            // 沒有colorPriceDiff邏輯，使用原有邏輯
            const metadata = colorVariant.metadata as any;
            if (metadata?.sizePrices && selectedVariants.size) {
              // 向後兼容：使用metadata中的sizePrices（舊邏輯）
              const sizePrice = metadata.sizePrices[selectedVariants.size];
              if (sizePrice !== undefined) {
                finalPrice = sizePrice;
                console.log(`💰 使用metadata中的尺寸+顏色價格 [${selectedVariants.size} + ${selectedVariants.color}]: NT$ ${finalPrice}`);
              } else {
                // 如果metadata中沒有該尺寸的價格，回退到其他邏輯
                console.warn(`⚠️ metadata中沒有尺寸「${selectedVariants.size}」的價格，使用其他邏輯`);
                if (colorVariant.priceModifier >= 1000) {
                  finalPrice = colorVariant.priceModifier;
                } else if (selectedVariants.size) {
                  const sizeVariant = variants.find(
                    (v) => v.type === 'size' && v.name === selectedVariants.size,
                  );
                  if (sizeVariant) {
                    finalPrice = sizeVariant.priceModifier;
                  }
                }
              }
            } else if (colorVariant.priceModifier >= 1000) {
              // 如果顏色規格的 priceModifier >= 1000，視為固定價格（完整價格）
              finalPrice = colorVariant.priceModifier;
              console.log(`💰 使用顏色固定價格 [${selectedVariants.color}]: NT$ ${finalPrice}`);
            } else if (colorVariant.priceModifier > 0) {
              // 向後兼容：使用尺寸 + 顏色加價
              let sizePrice = 0;
              const sizeVariant = selectedVariants.size 
                ? variants.find((v) => v.type === 'size' && v.name === selectedVariants.size)
                : null;
              
              if (sizeVariant) {
                sizePrice = sizeVariant.priceModifier;
              }
              finalPrice = sizePrice + colorVariant.priceModifier;
              console.log(`💰 使用尺寸+顏色加價 [${selectedVariants.size || '無尺寸'} + ${selectedVariants.color}]: NT$ ${finalPrice}`);
            } else {
              // priceModifier 為 0 或負數，使用尺寸價格（黑白）
              if (selectedVariants.size) {
                const sizeVariant = variants.find(
                  (v) => v.type === 'size' && v.name === selectedVariants.size,
                );
                if (sizeVariant) {
                  finalPrice = sizeVariant.priceModifier;
                  console.log(`💰 使用尺寸價格 [${selectedVariants.size}]: NT$ ${finalPrice}`);
                }
              }
            }
          }
        } else {
          console.warn(`⚠️ 找不到尺寸「${selectedVariants.size}」`);
        }
      } else {
        console.warn(`⚠️ 找不到顏色規格: ${selectedVariants.color}`);
      }
    } else if (hasSize) {
      // 如果只選擇了尺寸，使用尺寸價格
      const sizeVariant = variants.find(
        (v) => v.type === 'size' && v.name === selectedVariants.size,
      );
      if (sizeVariant) {
        finalPrice = sizeVariant.priceModifier;
      } else {
        // 如果找不到對應的尺寸，使用基礎價格
        finalPrice = basePrice;
      }
    } else if (hasColor) {
      // 如果只選擇了顏色，使用顏色價格
      const colorVariant = variants.find(
        (v) => v.type === 'color' && v.name === selectedVariants.color,
      );
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
    if (selectedVariants.position && 
        typeof selectedVariants.position === 'string' && 
        selectedVariants.position.trim() !== '') {
      const positionVariant = variants.find(
        (v) => v.type === 'position' && v.name === selectedVariants.position,
      );
      if (positionVariant) {
        finalPrice += positionVariant.priceModifier;
      }
    }

    // 4. 計算左右半邊調整
    if (selectedVariants.side && 
        typeof selectedVariants.side === 'string' && 
        selectedVariants.side.trim() !== '') {
      const sideVariant = variants.find(
        (v) => v.type === 'side' && v.name === selectedVariants.side,
      );
      if (sideVariant) {
        finalPrice += sideVariant.priceModifier;
      }
    }

    // 5. 設計費另計，不計入總價
    // 設計費將在後端或結帳時單獨處理，不在這裡加入 finalPrice

    // 6. 計算增出範圍與細膩度加購（custom_addon 是直接輸入的價格）
    if (selectedVariants.custom_addon && typeof selectedVariants.custom_addon === 'number' && selectedVariants.custom_addon > 0) {
      finalPrice += selectedVariants.custom_addon;
      console.log(`💰 增出範圍與細膩度加購: +NT$ ${selectedVariants.custom_addon}`);
    }

    // 7. 計算其他規格（風格、複雜度等）
    ['style', 'complexity', 'technique', 'custom'].forEach((type) => {
      const selectedValue = selectedVariants[type];
      if (selectedValue) {
        const variant = variants.find(
          (v) => v.type === type && v.name === selectedValue,
        );
        if (variant) {
          finalPrice += variant.priceModifier;
        }
      }
    });

    return { finalPrice, estimatedDuration };
  }

  /**
   * 清理過期購物車（定時任務調用）
   */
  async cleanupExpiredCarts(): Promise<number> {
    const result = await this.prisma.cart.updateMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
        status: 'active',
      },
      data: {
        status: 'expired',
      },
    });

    return result.count;
  }
}

