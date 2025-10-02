import { IsString, IsInt, IsDateString, IsOptional, IsEnum } from 'class-validator';
import { InstallmentStatus } from '@prisma/client';

export class UpdateInstallmentDto {
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsInt()
  amount?: number;

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
