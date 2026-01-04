import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminAppointmentsService } from './admin-appointments.service';
import { AdminServicesController } from './admin-services.controller';
import { AdminArtistsController } from './admin-artists.controller';
import { AdminArtistsService } from './admin-artists.service';
import { AdminAppointmentsController } from './admin-appointments.controller';
import { AdminMembersController } from './admin-members.controller';
import { AdminMembersService } from './admin-members.service';
import { AdminAnalyticsController } from './admin-analytics.controller';
import { AdminAnalyticsUnifiedService } from './admin-analytics-unified.service';
import { AdminCacheController } from './admin-cache.controller';
import { AdminCleanupController } from './admin-cleanup.controller';
import { DiagnosticsController } from './diagnostics.controller';
import { AdminServiceVariantsController } from './admin-service-variants.controller';
import { AdminServiceVariantsService } from './admin-service-variants.service';
import { AdminUsersController } from './admin-users.controller';
import { AdminUsersService } from './admin-users.service';
import { PrismaModule } from '../prisma/prisma.module';
import { ServicesModule } from '../services/services.module';
import { BranchesModule } from '../branches/branches.module';
import { BillingModule } from '../billing/billing.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AdminNotificationsController } from './admin-notifications.controller';

@Module({
  imports: [PrismaModule, BillingModule, ServicesModule, BranchesModule, NotificationsModule],
  controllers: [
    AdminController, 
    AdminServicesController, 
    AdminArtistsController, 
    AdminAppointmentsController,
    AdminMembersController,
    AdminAnalyticsController,
    AdminCacheController,
    AdminCleanupController,
    DiagnosticsController,
    AdminServiceVariantsController,
    AdminUsersController,
    AdminNotificationsController,
  ],
  providers: [
    AdminAppointmentsService,
    AdminArtistsService,
    AdminMembersService,
    AdminAnalyticsUnifiedService,
    AdminServiceVariantsService,
    AdminUsersService,
  ],
})
export class AdminModule {}
