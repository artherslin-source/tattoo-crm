import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AdminBillingController } from './admin-billing.controller';
import { BillingService } from './billing.service';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [PrismaModule, AuditModule],
  controllers: [AdminBillingController],
  providers: [BillingService],
  exports: [BillingService],
})
export class BillingModule {}


