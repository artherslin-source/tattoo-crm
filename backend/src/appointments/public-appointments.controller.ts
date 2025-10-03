import { Body, Controller, Post } from '@nestjs/common';
import { z } from 'zod';
import { AppointmentsService } from './appointments.service';

const CreatePublicAppointmentSchema = z.object({
  name: z.string(),
  email: z.string().email(),
  phone: z.string().optional(),
  artistId: z.string(),
  serviceId: z.string(),
  startAt: z.string().datetime(),
  endAt: z.string().datetime(),
  notes: z.string().optional(),
});

@Controller('public/appointments')
export class PublicAppointmentsController {
  constructor(private readonly appointments: AppointmentsService) {}

  @Post()
  async createPublic(@Body() body: unknown) {
    const input = CreatePublicAppointmentSchema.parse(body);
    
    // 根據 artistId 獲取分店 ID
    const artist = await this.appointments['prisma'].artist.findUnique({
      where: { userId: input.artistId },
      select: { branchId: true }
    });
    
    if (!artist?.branchId) {
      throw new Error('無法找到指定的刺青師或分店');
    }
    
    // 創建臨時用戶或使用現有用戶
    let userId: string;
    const existingUser = await this.appointments['prisma'].user.findFirst({
      where: { email: input.email }
    });
    
    if (existingUser) {
      userId = existingUser.id;
    } else {
      // 創建臨時用戶
      const tempUser = await this.appointments['prisma'].user.create({
        data: {
          email: input.email,
          name: input.name,
          phone: input.phone,
          role: 'MEMBER',
          branchId: artist.branchId,
          hashedPassword: 'temp-password', // 臨時密碼，用戶需要後續設定
        }
      });
      userId = tempUser.id;
    }
    
    return this.appointments.create({
      userId,
      artistId: input.artistId,
      serviceId: input.serviceId,
      startAt: new Date(input.startAt),
      endAt: new Date(input.endAt),
      notes: input.notes,
      branchId: artist.branchId,
    });
  }
}
