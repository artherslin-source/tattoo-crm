import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AppointmentsService } from './appointments.service';
import { AppointmentsController } from './appointments.controller';
import { PublicAppointmentsController } from './public-appointments.controller';

@Module({
  imports: [PrismaModule],
  controllers: [AppointmentsController, PublicAppointmentsController],
  providers: [AppointmentsService],
  exports: [AppointmentsService],
})
export class AppointmentsModule {}



