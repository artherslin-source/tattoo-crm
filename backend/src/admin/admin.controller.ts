import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AdminAppointmentsService } from './admin-appointments.service';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('admin')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('BOSS', 'BRANCH_MANAGER')
export class AdminController {
  constructor(
    private readonly adminAppointmentsService: AdminAppointmentsService,
  ) {}

  @Get('dashboard')
  getDashboard() {
    return {
      message: 'Welcome to Admin Dashboard',
      data: {
        totalUsers: 0,
        totalServices: 0,
        totalAppointments: 0,
      }
    };
  }

  @Get('stats')
  getStats() {
    return {
      users: { total: 0, active: 0 },
      services: { total: 0, active: 0 },
      appointments: { total: 0, pending: 0, confirmed: 0 }
    };
  }


  // 預約管理 API
  @Get('appointments')
  async getAppointments(@Query() query: any) {
    return this.adminAppointmentsService.findAll({
      search: query.search,
      status: query.status,
      startDate: query.startDate,
      endDate: query.endDate,
    });
  }

  @Get('appointments/:id')
  async getAppointment(@Param('id') id: string) {
    return this.adminAppointmentsService.findOne(id);
  }

  @Patch('appointments/:id/status')
  async updateAppointmentStatus(@Param('id') id: string, @Body('status') status: string) {
    return this.adminAppointmentsService.updateStatus(id, status);
  }

  @Patch('appointments/:id')
  async updateAppointment(@Param('id') id: string, @Body() data: any) {
    return this.adminAppointmentsService.update(id, {
      startAt: data.startAt ? new Date(data.startAt) : undefined,
      endAt: data.endAt ? new Date(data.endAt) : undefined,
      notes: data.notes,
      artistId: data.artistId,
    });
  }

  @Delete('appointments/:id')
  async deleteAppointment(@Param('id') id: string) {
    return this.adminAppointmentsService.remove(id);
  }

}
