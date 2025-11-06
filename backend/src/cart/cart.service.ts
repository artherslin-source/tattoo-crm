import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AddToCartDto, UpdateCartItemDto, CartResponseDto, CartItemResponseDto } from './dto/add-to-cart.dto';
import { CheckoutCartDto } from './dto/checkout-cart.dto';

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

    // 驗證規格選項（顏色為必選，尺寸已停用改為可選）
    const { size, color, position } = dto.selectedVariants;
    
    if (!color) {
      throw new BadRequestException('請至少選擇顏色');
    }

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
   * 結帳（將購物車轉成預約）
   */
  async checkout(
    dto: CheckoutCartDto,
    userId?: string,
    sessionId?: string,
  ): Promise<{ appointmentId: string; orderId: string }> {
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

    // 計算總價和總時長
    const totalPrice = cart.items.reduce((sum, item) => sum + item.finalPrice, 0);
    const totalDuration = cart.items.reduce((sum, item) => sum + item.estimatedDuration, 0);

    // 解析預約時間
    const [hours, minutes] = dto.preferredTimeSlot.split(':').map(Number);
    const startAt = new Date(dto.preferredDate);
    startAt.setHours(hours, minutes, 0, 0);

    const endAt = new Date(startAt);
    endAt.setMinutes(endAt.getMinutes() + totalDuration);

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
    };

    // 獲取或創建用戶
    let actualUserId = userId;
    if (!actualUserId) {
      // 訪客用戶：創建或查找用戶
      const existingUser = await this.prisma.user.findUnique({
        where: { email: dto.customerEmail || `${dto.customerPhone}@guest.com` },
      });

      if (existingUser) {
        actualUserId = existingUser.id;
      } else {
        const newUser = await this.prisma.user.create({
          data: {
            email: dto.customerEmail || `${dto.customerPhone}@guest.com`,
            hashedPassword: '', // 訪客無密碼
            name: dto.customerName,
            phone: dto.customerPhone,
            role: 'MEMBER',
          },
        });
        actualUserId = newUser.id;
      }
    }

    // 創建預約
    const appointment = await this.prisma.appointment.create({
      data: {
        branchId: dto.branchId,
        artistId: dto.artistId,
        userId: actualUserId,
        startAt,
        endAt,
        status: 'PENDING',
        notes: dto.specialRequests,
        cartId: cart.id,
        cartSnapshot,
      },
    });

    // 創建訂單
    const order = await this.prisma.order.create({
      data: {
        memberId: actualUserId,
        branchId: dto.branchId,
        appointmentId: appointment.id,
        totalAmount: totalPrice,
        finalAmount: totalPrice,
        paymentType: 'ONE_TIME',
        status: 'PENDING_PAYMENT',
        cartSnapshot,
      },
    });

    // 更新購物車狀態
    await this.prisma.cart.update({
      where: { id: cart.id },
      data: { status: 'checked_out' },
    });

    return {
      appointmentId: appointment.id,
      orderId: order.id,
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

    // 1. 尺寸與顏色組合定價（新邏輯：支援尺寸metadata中的價格）
    let sizePrice = 0;
    const sizeVariant = selectedVariants.size 
      ? variants.find((v) => v.type === 'size' && v.name === selectedVariants.size)
      : null;
    
    if (sizeVariant) {
      // 檢查尺寸規格的 metadata 中是否有組合定價
      if (sizeVariant.metadata && typeof sizeVariant.metadata === 'object') {
        const metadata = sizeVariant.metadata;
        
        // 如果有 metadata.colorPrice 且選擇了彩色，使用組合定價
        if (selectedVariants.color === '彩色' && metadata.colorPrice) {
          sizePrice = metadata.colorPrice;
          console.log(`💰 使用組合定價 [${selectedVariants.size} + 彩色]: NT$ ${sizePrice}`);
        }
        // 如果選擇黑白或metadata有blackWhitePrice
        else if (selectedVariants.color === '黑白' && metadata.blackWhitePrice) {
          sizePrice = metadata.blackWhitePrice;
          console.log(`💰 使用組合定價 [${selectedVariants.size} + 黑白]: NT$ ${sizePrice}`);
        }
        // 否則使用 priceModifier（向後兼容）
        else {
          sizePrice = sizeVariant.priceModifier;
        }
      } else {
        // 沒有 metadata，使用傳統 priceModifier
        sizePrice = sizeVariant.priceModifier;
      }
    }

    // 2. 顏色加價（僅當沒有使用組合定價時才應用）
    let colorPrice = 0;
    const usingCombinedPricing = sizeVariant?.metadata?.colorPrice || sizeVariant?.metadata?.blackWhitePrice;
    
    if (!usingCombinedPricing && selectedVariants.color) {
      const colorVariant = variants.find(
        (v) => v.type === 'color' && v.name === selectedVariants.color,
      );
      if (colorVariant) {
        colorPrice = colorVariant.priceModifier;
      }
    }

    finalPrice = sizePrice + colorPrice;

    // 3. 計算部位調整
    if (selectedVariants.position) {
      const positionVariant = variants.find(
        (v) => v.type === 'position' && v.name === selectedVariants.position,
      );
      if (positionVariant) {
        finalPrice += positionVariant.priceModifier;
      }
    }

    // 4. 計算設計費（如果有自訂價格）
    if (selectedVariants.design_fee !== undefined) {
      const designFeeVariant = variants.find(
        (v) => v.type === 'design_fee',
      );
      if (designFeeVariant) {
        // 如果有自訂價格，使用自訂價格；否則使用variant的priceModifier
        const designFeePrice = typeof selectedVariants.design_fee === 'number' 
          ? selectedVariants.design_fee 
          : designFeeVariant.priceModifier;
        finalPrice += designFeePrice;
      }
    }

    // 5. 計算其他規格（風格、複雜度等）
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

