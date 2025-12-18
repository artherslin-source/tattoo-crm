import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AdminAppointmentsService } from './admin-appointments.service';
import { AccessGuard } from '../common/access/access.guard';
import { Actor } from '../common/access/actor.decorator';
import type { AccessActor } from '../common/access/access.types';
import { z } from 'zod';

const CreateAppointmentSchema = z.object({
  startAt: z.string().datetime(),
  endAt: z.string().datetime(),
  userId: z.string().optional(),
  serviceId: z.string(),
  artistId: z.string(),
  branchId: z.string(),
  notes: z.string().optional().or(z.undefined()),
  // 從聯絡訂單創建預約的欄位
  name: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  contactId: z.string().optional(),
});

@Controller('admin/appointments')
@UseGuards(AuthGuard('jwt'), AccessGuard)
export class AdminAppointmentsController {
  constructor(private readonly adminAppointmentsService: AdminAppointmentsService) {}

  @Get()
  async getAppointments(@Actor() actor: AccessActor, @Query() query: any) {
    console.log('🎯 AdminAppointmentsController.getAppointments called');
    console.log('🔍 Query params:', query);
    try {
      return this.adminAppointmentsService.findAll({
        actor,
        search: query.search,
        status: query.status,
        startDate: query.startDate,
        endDate: query.endDate,
        branchId: query.branchId,
        sortField: query.sortField,
        sortOrder: query.sortOrder,
      });
    } catch (error) {
      console.error('❌ Error in AdminAppointmentsController.getAppointments:', error);
      throw error;
    }
  }

  @Post()
  async createAppointment(@Actor() actor: AccessActor, @Body() body: unknown) {
    console.log('🎯 AdminAppointmentsController.createAppointment called');
    console.log('🔍 Request body:', body);
    try {
      const input = CreateAppointmentSchema.parse(body);
      
      let userId = input.userId;
      let contactId = input.contactId;
      
      // 如果沒有 userId 但有客戶資訊，自動創建用戶和聯絡記錄
      if (!userId && input.name && input.email) {
        console.log('🔍 從聯絡訂單創建預約，需要創建用戶');
        
        // 查找或創建用戶
        const existingUser = await this.adminAppointmentsService['prisma'].user.findFirst({
          where: { email: input.email }
        });
        
        if (existingUser) {
          userId = existingUser.id;
          console.log('🔍 找到現有用戶:', userId);
        } else {
          // 創建新用戶
          const newUser = await this.adminAppointmentsService['prisma'].user.create({
            data: {
              email: input.email,
              name: input.name,
              phone: input.phone,
              role: 'MEMBER',
              branchId: input.branchId,
              hashedPassword: 'temp-password', // 臨時密碼，用戶需要後續設定
            }
          });
          userId = newUser.id;
          console.log('🔍 創建新用戶:', userId);
        }
        
        // 創建聯絡記錄
        const newContact = await this.adminAppointmentsService['prisma'].contact.create({
          data: {
            name: input.name,
            email: input.email,
            phone: input.phone || '',
            notes: input.notes || '',
            branchId: input.branchId,
            status: 'PENDING',
          }
        });
        contactId = newContact.id;
        console.log('🔍 創建聯絡記錄:', contactId);
      }
      
      if (!userId) {
        throw new Error('無法確定用戶ID');
      }
      
      return this.adminAppointmentsService.create({
        actor,
        startAt: new Date(input.startAt),
        endAt: new Date(input.endAt),
        userId: userId,
        serviceId: input.serviceId,
        artistId: input.artistId,
        branchId: input.branchId,
        notes: input.notes,
        contactId: contactId,
      });
    } catch (error) {
      console.error('❌ Error in AdminAppointmentsController.createAppointment:', error);
      throw error;
    }
  }

  @Get(':id')
  async getAppointment(@Actor() actor: AccessActor, @Param('id') id: string) {
    return this.adminAppointmentsService.findOne({ actor, id });
  }

  @Patch(':id/status')
  async updateAppointmentStatus(@Actor() actor: AccessActor, @Param('id') id: string, @Body('status') status: string) {
    return this.adminAppointmentsService.updateStatus({ actor, id, status });
  }

  @Patch(':id')
  async updateAppointment(@Actor() actor: AccessActor, @Param('id') id: string, @Body() data: any) {
    return this.adminAppointmentsService.update({ actor, id, data: {
      startAt: data.startAt ? new Date(data.startAt) : undefined,
      endAt: data.endAt ? new Date(data.endAt) : undefined,
      notes: data.notes,
      artistId: data.artistId,
    }});
  }

  @Delete(':id')
  async deleteAppointment(@Actor() actor: AccessActor, @Param('id') id: string) {
    return this.adminAppointmentsService.remove({ actor, id });
  }
}
