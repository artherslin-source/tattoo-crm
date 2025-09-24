import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { InstallmentsService } from './installments.service';
import { InstallmentsController } from './installments.controller';

@Module({
  imports: [PrismaModule],
  controllers: [InstallmentsController],
  providers: [InstallmentsService],
})
export class InstallmentsModule {}



