import { Module } from '@nestjs/common';
import { MaintenanceService } from './maintenance.service';
import { MaintenanceMiddleware } from './maintenance.middleware';

@Module({
  providers: [MaintenanceService, MaintenanceMiddleware],
  exports: [MaintenanceService, MaintenanceMiddleware],
})
export class MaintenanceModule {}


