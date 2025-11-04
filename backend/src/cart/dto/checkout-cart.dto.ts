import { IsString, IsOptional, IsDateString } from 'class-validator';

export class CheckoutCartDto {
  @IsString()
  branchId: string;

  @IsOptional()
  @IsString()
  artistId?: string;

  @IsDateString()
  preferredDate: string;

  @IsString()
  preferredTimeSlot: string; // "10:00" format

  @IsString()
  customerName: string;

  @IsString()
  customerPhone: string;

  @IsOptional()
  @IsString()
  customerEmail?: string;

  @IsOptional()
  @IsString()
  specialRequests?: string;
}

