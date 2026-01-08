import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { MaintenanceService } from './maintenance.service';
import { MaintenanceMiddleware } from './maintenance.middleware';
import { MaintenanceController } from './maintenance.controller';

@Module({
  imports: [PrismaModule],
  controllers: [MaintenanceController],
  providers: [MaintenanceService, MaintenanceMiddleware],
  exports: [MaintenanceService, MaintenanceMiddleware],
})
export class MaintenanceModule {}


