import { IsString, IsInt, IsBoolean, IsOptional } from 'class-validator';

export class CreateServiceVariantDto {
  @IsString()
  serviceId: string;

  @IsString()
  type: string; // "size" / "color" / "position"

  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  code?: string;

  @IsInt()
  priceModifier: number;

  @IsInt()
  durationModifier: number;

  @IsOptional()
  @IsInt()
  sortOrder?: number;
}

export class UpdateServiceVariantDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  code?: string;

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
}

export class BatchCreateVariantsDto {
  @IsString()
  serviceId: string;

  variants: CreateServiceVariantDto[];
}

