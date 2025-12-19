import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AdminBillingController } from './admin-billing.controller';
import { BillingService } from './billing.service';

@Module({
  imports: [PrismaModule],
  controllers: [AdminBillingController],
  providers: [BillingService],
  exports: [BillingService],
})
export class BillingModule {}


