import { IsString, IsInt, IsBoolean, IsOptional, IsObject } from 'class-validator';

export class CreateServiceVariantDto {
  @IsString()
  serviceId: string;

  @IsString()
  type: string; // "size" / "color" / "position" / "style" / "complexity" / "technique" / "custom"

  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsInt()
  priceModifier: number;

  @IsInt()
  durationModifier: number;

  @IsOptional()
  @IsInt()
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  isRequired?: boolean;

  @IsOptional()
  @IsString()
  icon?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class UpdateServiceVariantDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsInt()
  priceModifier?: number;

  @IsOptional()
  @IsInt()
  durationModifier?: number;

  @IsOptional()
  @IsInt()
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  isRequired?: boolean;

  @IsOptional()
  @IsString()
  icon?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class BatchCreateVariantsDto {
  @IsString()
  serviceId: string;

  variants: CreateServiceVariantDto[];
}

