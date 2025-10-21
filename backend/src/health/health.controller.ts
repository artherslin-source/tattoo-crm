import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  @Get()
  check() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'tattoo-crm-backend',
      version: '1.0.0',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      database: { status: 'up' },
    };
  }

  @Get('simple')
  simple() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'tattoo-crm-backend',
      version: '1.0.0',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
    };
  }
}
