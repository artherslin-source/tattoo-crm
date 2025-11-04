import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminAppointmentsService } from './admin-appointments.service';
import { AdminServicesController } from './admin-services.controller';
import { AdminArtistsController } from './admin-artists.controller';
import { AdminArtistsService } from './admin-artists.service';
import { AdminOrdersController } from './admin-orders.controller';
import { AdminAppointmentsController } from './admin-appointments.controller';
import { AdminMembersController } from './admin-members.controller';
import { AdminMembersService } from './admin-members.service';
import { AdminAnalyticsController } from './admin-analytics.controller';
import { AdminAnalyticsOptimizedService } from './admin-analytics-optimized.service';
import { AdminAnalyticsUnifiedService } from './admin-analytics-unified.service';
import { AdminCacheController } from './admin-cache.controller';
import { AdminCleanupController } from './admin-cleanup.controller';
import { DiagnosticsController } from './diagnostics.controller';
import { AdminServiceVariantsController } from './admin-service-variants.controller';
import { AdminServiceVariantsService } from './admin-service-variants.service';
import { PrismaModule } from '../prisma/prisma.module';
import { OrdersModule } from '../orders/orders.module';
import { ServicesModule } from '../services/services.module';
import { BranchesModule } from '../branches/branches.module';

@Module({
  imports: [PrismaModule, OrdersModule, ServicesModule, BranchesModule],
  controllers: [
    AdminController, 
    AdminServicesController, 
    AdminArtistsController, 
    AdminOrdersController,
    AdminAppointmentsController,
    AdminMembersController,
    AdminAnalyticsController,
    AdminCacheController,
    AdminCleanupController,
    DiagnosticsController,
    AdminServiceVariantsController,
  ],
  providers: [
    AdminAppointmentsService,
    AdminArtistsService,
    AdminMembersService,
    AdminAnalyticsOptimizedService,
    AdminAnalyticsUnifiedService,
    AdminServiceVariantsService,
  ],
})
export class AdminModule {}
