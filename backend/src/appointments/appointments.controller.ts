import { Body, Controller, Get, Post, Patch, Param, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { z } from 'zod';
import { AppointmentsService } from './appointments.service';
import { Roles } from '../common/roles.decorator';
import { RolesGuard } from '../common/roles.guard';
import { BranchGuard } from '../common/guards/branch.guard';

const CreateAppointmentSchema = z.object({
  artistId: z.string().optional(),
  serviceId: z.string().optional(),
  startAt: z.string().datetime(),
  endAt: z.string().datetime(),
  notes: z.string().optional(),
});

const UpdateAppointmentSchema = z.object({
  status: z.enum(['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELED']),
});

const UpdateStatusSchema = z.object({
  status: z.enum(['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELED']),
});

@UseGuards(AuthGuard('jwt'), BranchGuard)
@Controller('appointments')
export class AppointmentsController {
  constructor(private readonly appointments: AppointmentsService) {}

  @Post()
  async create(@Req() req: any, @Body() body: unknown) {
    const input = CreateAppointmentSchema.parse(body);
    
    // 獲取用戶的分店 ID
    let branchId = req.user.branchId;
    
    // 如果用戶沒有分店 ID，嘗試從 artist 獲取
    if (!branchId && input.artistId) {
      const artist = await this.appointments['prisma'].artist.findUnique({
        where: { userId: input.artistId },
        select: { branchId: true }
      });
      branchId = artist?.branchId;
    }
    
    if (!branchId) {
      throw new Error('無法確定分店，請聯繫管理員');
    }
    
    return this.appointments.create({
      userId: req.user.userId,
      artistId: input.artistId,
      serviceId: input.serviceId,
      startAt: new Date(input.startAt),
      endAt: new Date(input.endAt),
      notes: input.notes,
      branchId,
    });
  }

  @Get('my')
  async my(@Req() req: any) {
    return this.appointments.myAppointments(req.user.userId);
  }

  // 管理員專用：查詢所有預約（必須放在 @Get(':id') 之前）
  @Get('all')
  @UseGuards(RolesGuard)
  @Roles('BOSS', 'BRANCH_MANAGER')
  async findAllAppointments(@Req() req: any) {
    return this.appointments.findAll(req.user.role, req.user.branchId);
  }

  // 管理員專用：更新預約狀態
  @Patch(':id/status')
  @UseGuards(RolesGuard)
  @Roles('BOSS', 'BRANCH_MANAGER')
  async updateStatus(@Param('id') id: string, @Body() body: unknown) {
    const input = UpdateStatusSchema.parse(body);
    return this.appointments.updateStatus(id, input.status);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.appointments.findOne(id);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() body: unknown) {
    const input = UpdateAppointmentSchema.parse(body);
    return this.appointments.update(id, input.status);
  }
}



