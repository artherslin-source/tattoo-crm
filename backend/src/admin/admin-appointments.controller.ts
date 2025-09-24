import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AdminAppointmentsService } from './admin-appointments.service';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('admin/appointments')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('BOSS', 'BRANCH_MANAGER')
export class AdminAppointmentsController {
  constructor(private readonly adminAppointmentsService: AdminAppointmentsService) {}

  @Get()
  async getAppointments(@Query() query: any) {
    return this.adminAppointmentsService.findAll({
      search: query.search,
      status: query.status,
      startDate: query.startDate,
      endDate: query.endDate,
    });
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
