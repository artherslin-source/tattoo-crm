import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('admin/dashboard')
  getAdminDashboard() {
    return {
      message: 'Welcome to Admin Dashboard',
      data: {
        totalUsers: 0,
        totalServices: 0,
        totalAppointments: 0,
      }
    };
  }
}
