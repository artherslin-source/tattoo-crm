import { IsString, IsInt, IsOptional, IsEnum } from 'class-validator';
import { PaymentType } from '@prisma/client';

export class CreateInstallmentPlanDto {
  @IsString()
  orderId: string;

  @IsEnum(PaymentType)
  paymentType: PaymentType;

  @IsOptional()
  @IsInt()
  installmentCount?: number; // 分期期數

  @IsOptional()
  @IsInt()
  firstPaymentAmount?: number; // 首期金額（可選）

  @IsOptional()
  @IsString()
  notes?: string;
}
