import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
  Session,
} from '@nestjs/common';
import { CartService } from './cart.service';
import { AddToCartDto, UpdateCartItemDto } from './dto/add-to-cart.dto';
import { CheckoutCartDto } from './dto/checkout-cart.dto';
import { OptionalJwtAuthGuard } from '../auth/optional-jwt-auth.guard';

@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  /**
   * 獲取購物車（支持訪客和登入用戶）
   */
  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  async getCart(@Req() req: any, @Session() session: Record<string, any>) {
    const userId = req.user?.id;
    const sessionId = session.id || this.generateSessionId();
    
    // 確保 session 有 ID
    if (!session.id) {
      session.id = sessionId;
    }

    return this.cartService.getCartDetails(undefined, userId, sessionId);
  }

  /**
   * 加入購物車
   */
  @Post('items')
  @UseGuards(OptionalJwtAuthGuard)
  async addToCart(
    @Body() dto: AddToCartDto,
    @Req() req: any,
    @Session() session: Record<string, any>,
  ) {
    const userId = req.user?.id;
    const sessionId = session.id || this.generateSessionId();
    
    if (!session.id) {
      session.id = sessionId;
    }

    return this.cartService.addToCart(dto, userId, sessionId);
  }

  /**
   * 更新購物車項目
   */
  @Patch('items/:itemId')
  @UseGuards(OptionalJwtAuthGuard)
  async updateCartItem(
    @Param('itemId') itemId: string,
    @Body() dto: UpdateCartItemDto,
    @Req() req: any,
    @Session() session: Record<string, any>,
  ) {
    const userId = req.user?.id;
    const sessionId = session.id;

    return this.cartService.updateCartItem(itemId, dto, userId, sessionId);
  }

  /**
   * 刪除購物車項目
   */
  @Delete('items/:itemId')
  @UseGuards(OptionalJwtAuthGuard)
  async removeCartItem(
    @Param('itemId') itemId: string,
    @Req() req: any,
    @Session() session: Record<string, any>,
  ) {
    const userId = req.user?.id;
    const sessionId = session.id;

    return this.cartService.removeCartItem(itemId, userId, sessionId);
  }

  /**
   * 結帳（將購物車轉成預約）
   */
  @Post('checkout')
  @UseGuards(OptionalJwtAuthGuard)
  async checkout(
    @Body() dto: CheckoutCartDto,
    @Req() req: any,
    @Session() session: Record<string, any>,
  ) {
    const userId = req.user?.id;
    const sessionId = session.id;

    return this.cartService.checkout(dto, userId, sessionId);
  }

  /**
   * 生成 session ID
   */
  private generateSessionId(): string {
    return `guest_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }
}

