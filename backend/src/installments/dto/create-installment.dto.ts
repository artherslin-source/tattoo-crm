import { IsString, IsInt, IsDateString, IsOptional, IsEnum } from 'class-validator';
import { InstallmentStatus } from '@prisma/client';

export class CreateInstallmentDto {
  @IsString()
  orderId: string;

  @IsInt()
  installmentNo: number;

  @IsDateString()
  dueDate: string;

  @IsInt()
  amount: number;

  @IsOptional()
  @IsEnum(InstallmentStatus)
  status?: InstallmentStatus;

  @IsOptional()
  @IsString()
  paymentMethod?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
