import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminAppointmentsService } from './admin-appointments.service';
import { AdminServicesController } from './admin-services.controller';
import { AdminArtistsController } from './admin-artists.controller';
import { AdminOrdersController } from './admin-orders.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { OrdersModule } from '../orders/orders.module';
import { ArtistsModule } from '../artists/artists.module';
import { ServicesModule } from '../services/services.module';

@Module({
  imports: [PrismaModule, OrdersModule, ArtistsModule, ServicesModule],
  controllers: [AdminController, AdminServicesController, AdminArtistsController, AdminOrdersController],
  providers: [AdminAppointmentsService],
})
export class AdminModule {}
