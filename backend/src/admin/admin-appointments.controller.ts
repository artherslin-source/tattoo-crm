import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards, BadRequestException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AdminAppointmentsService } from './admin-appointments.service';
import { AccessGuard } from '../common/access/access.guard';
import { Actor } from '../common/access/actor.decorator';
import type { AccessActor } from '../common/access/access.types';
import { z } from 'zod';
import * as bcrypt from 'bcrypt';

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
  phone: z.string().min(1),
  contactId: z.string().optional(),
});

const RescheduleSchema = z.object({
  startAt: z.string().datetime(),
  endAt: z.string().datetime(),
  holdMin: z.coerce.number().int().min(1).max(24 * 60).optional(),
  reason: z.string().optional(),
});

const CancelSchema = z.object({
  reason: z.string().optional(),
});

const NoShowSchema = z.object({
  reason: z.string().optional(),
});

const UpdateStatusSchema = z.object({
  status: z.string().min(1),
});

const ConfirmScheduleSchema = z.object({
  startAt: z.string().datetime(),
  holdMin: z.coerce.number().int().min(1).max(24 * 60),
  reason: z.string().optional(),
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

      const prisma = this.adminAppointmentsService['prisma'];
      const phone = input.phone.trim();
      const email = input.email?.trim() ? input.email.trim() : undefined;

      // If no userId, resolve by phone first; otherwise auto-create member (email optional)
      if (!userId) {
        console.log('🔍 No userId provided; resolving member by phone/name');

        const existingByPhone = await prisma.user.findFirst({
          where: { phone },
          select: { id: true },
        });

        if (existingByPhone) {
          userId = existingByPhone.id;
          console.log('🔍 Found existing user by phone:', userId);
        } else if (email) {
          const existingByEmail = await prisma.user.findFirst({
            where: { email },
            select: { id: true },
          });
          if (existingByEmail) {
            userId = existingByEmail.id;
            console.log('🔍 Found existing user by email:', userId);
          }
        }

        if (!userId) {
          // Create User + Member (phone required; email optional)
          const hashedPassword = await bcrypt.hash('temp-password', 12);
          const createdUser = await prisma.user.create({
            data: {
              name: input.name,
              email: email || undefined,
              phone,
              role: 'MEMBER',
              branchId: input.branchId,
              hashedPassword,
            },
            select: { id: true },
          });
          userId = createdUser.id;
          console.log('🔍 Created new user:', userId);

          // Ensure Member row exists
          await prisma.member.create({
            data: { userId },
          });
        }

        // Create Contact only if email is provided (Contact.email is required in schema)
        if (!contactId && input.name && email) {
          const newContact = await prisma.contact.create({
            data: {
              name: input.name,
              email,
              phone,
              notes: input.notes || '',
              branchId: input.branchId,
              status: 'PENDING',
            },
            select: { id: true },
          });
          contactId = newContact.id;
          console.log('🔍 Created contact:', contactId);
        }
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

  // Update appointment status (support both PATCH and POST to avoid proxy/method edge-cases)
  @Patch(':id/status')
  async updateAppointmentStatus(@Actor() actor: AccessActor, @Param('id') id: string, @Body() body: unknown) {
    const input = UpdateStatusSchema.parse(body);
    return this.adminAppointmentsService.updateStatus({ actor, id, status: input.status });
  }

  @Post(':id/status')
  async updateAppointmentStatusPost(@Actor() actor: AccessActor, @Param('id') id: string, @Body() body: unknown) {
    const input = UpdateStatusSchema.parse(body);
    return this.adminAppointmentsService.updateStatus({ actor, id, status: input.status });
  }

  @Post(':id/reschedule')
  async reschedule(@Actor() actor: AccessActor, @Param('id') id: string, @Body() body: unknown) {
    const input = RescheduleSchema.parse(body);
    const startAt = new Date(input.startAt);
    const endAt = new Date(input.endAt);
    if (startAt >= endAt) throw new BadRequestException('endAt must be after startAt');
    return this.adminAppointmentsService.reschedule({
      actor,
      id,
      startAt,
      endAt,
      holdMin: input.holdMin,
      reason: input.reason,
    });
  }

  @Post(':id/cancel')
  async cancel(@Actor() actor: AccessActor, @Param('id') id: string, @Body() body: unknown) {
    const input = CancelSchema.parse(body);
    return this.adminAppointmentsService.cancel({
      actor,
      id,
      reason: input.reason,
    });
  }

  @Post(':id/no-show')
  async noShow(@Actor() actor: AccessActor, @Param('id') id: string, @Body() body: unknown) {
    const input = NoShowSchema.parse(body);
    return this.adminAppointmentsService.noShow({
      actor,
      id,
      reason: input.reason,
    });
  }

  // C-flow: confirm schedule for INTENT appointment (does not count as reschedule)
  @Post(':id/confirm-schedule')
  async confirmSchedule(@Actor() actor: AccessActor, @Param('id') id: string, @Body() body: unknown) {
    const input = ConfirmScheduleSchema.parse(body);
    return this.adminAppointmentsService.confirmSchedule({
      actor,
      id,
      startAt: new Date(input.startAt),
      holdMin: input.holdMin,
      reason: input.reason,
    });
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
