import { IsString, IsObject, IsOptional, IsArray, IsInt, Min } from 'class-validator';

export class AddToCartDto {
  @IsString()
  serviceId: string;

  @IsObject()
  selectedVariants: {
    size: string;
    color: string;
    position?: string;
    design_fee?: number; // 設計費（自訂價格）
    style?: string;
    complexity?: string;
  };

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  referenceImages?: string[];
}

export class UpdateCartItemDto {
  @IsOptional()
  @IsObject()
  selectedVariants?: {
    size?: string;
    color?: string;
    position?: string;
    design_fee?: number; // 設計費（自訂價格）
    style?: string;
    complexity?: string;
  };

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  referenceImages?: string[];
}

export class CartResponseDto {
  id: string;
  userId?: string;
  sessionId?: string;
  status: string;
  expiresAt: Date;
  items: CartItemResponseDto[];
  totalPrice: number;
  totalDuration: number;
  createdAt: Date;
  updatedAt: Date;
}

export class CartItemResponseDto {
  id: string;
  cartId: string;
  serviceId: string;
  serviceName: string;
  serviceDescription: string;
  serviceImageUrl?: string;
  selectedVariants: {
    size: string;
    color: string;
    position?: string;
  };
  basePrice: number;
  finalPrice: number;
  estimatedDuration: number;
  notes?: string;
  referenceImages: string[];
  createdAt: Date;
  updatedAt: Date;
}

