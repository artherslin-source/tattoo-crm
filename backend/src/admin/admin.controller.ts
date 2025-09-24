import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('admin')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('BOSS', 'BRANCH_MANAGER')
export class AdminController {
  constructor() {}

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
}
