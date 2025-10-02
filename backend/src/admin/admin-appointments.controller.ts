import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AdminAppointmentsService } from './admin-appointments.service';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { z } from 'zod';

const CreateAppointmentSchema = z.object({
  startAt: z.string().datetime(),
  endAt: z.string().datetime(),
  userId: z.string(),
  serviceId: z.string(),
  artistId: z.string(),
  branchId: z.string(),
  notes: z.string().optional().or(z.undefined()),
});

@Controller('admin/appointments')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('BOSS', 'BRANCH_MANAGER')
export class AdminAppointmentsController {
  constructor(private readonly adminAppointmentsService: AdminAppointmentsService) {}

  @Get()
  async getAppointments(@Query() query: any) {
    console.log('🎯 AdminAppointmentsController.getAppointments called');
    console.log('🔍 Query params:', query);
    try {
      return this.adminAppointmentsService.findAll({
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
  async createAppointment(@Body() body: unknown) {
    console.log('🎯 AdminAppointmentsController.createAppointment called');
    console.log('🔍 Request body:', body);
    try {
      const input = CreateAppointmentSchema.parse(body);
      return this.adminAppointmentsService.create({
        startAt: new Date(input.startAt),
        endAt: new Date(input.endAt),
        userId: input.userId,
        serviceId: input.serviceId,
        artistId: input.artistId,
        branchId: input.branchId,
        notes: input.notes,
      });
    } catch (error) {
      console.error('❌ Error in AdminAppointmentsController.createAppointment:', error);
      throw error;
    }
  }

  @Get(':id')
  async getAppointment(@Param('id') id: string) {
    return this.adminAppointmentsService.findOne(id);
  }

  @Patch(':id/status')
  async updateAppointmentStatus(@Param('id') id: string, @Body('status') status: string) {
    return this.adminAppointmentsService.updateStatus(id, status);
  }

  @Patch(':id')
  async updateAppointment(@Param('id') id: string, @Body() data: any) {
    return this.adminAppointmentsService.update(id, {
      startAt: data.startAt ? new Date(data.startAt) : undefined,
      endAt: data.endAt ? new Date(data.endAt) : undefined,
      notes: data.notes,
      artistId: data.artistId,
    });
  }

  @Delete(':id')
  async deleteAppointment(@Param('id') id: string) {
    return this.adminAppointmentsService.remove(id);
  }
}
