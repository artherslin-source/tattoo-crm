import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { BackupController } from './backup.controller';
import { BackupService } from './backup.service';
import { MaintenanceModule } from '../maintenance/maintenance.module';

@Module({
  imports: [PrismaModule, MaintenanceModule],
  controllers: [BackupController],
  providers: [BackupService],
})
export class BackupModule {}


