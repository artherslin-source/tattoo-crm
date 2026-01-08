import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { CommonModule } from './common/common.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { AppointmentsModule } from './appointments/appointments.module';
import { ArtistsModule } from './artists/artists.module';
import { BranchesModule } from './branches/branches.module';
import { ServicesModule } from './services/services.module';
import { AdminModule } from './admin/admin.module';
import { AdminMembersModule } from './admin/admin-members.module';
import { BranchModule } from './branch/branch.module';
import { ArtistModule } from './artist/artist.module';
import { ContactsModule } from './contacts/contacts.module';
import { HealthModule } from './health/health.module';
import { CartModule } from './cart/cart.module';
import { BillingModule } from './billing/billing.module';
import { NotificationsModule } from './notifications/notifications.module';
import { SiteConfigModule } from './site-config/site-config.module';
import { BackupModule } from './backup/backup.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    CommonModule,
    PrismaModule,
    AuthModule,
    UsersModule,
    ArtistModule,
    ArtistsModule,
    AppointmentsModule,
    BranchesModule,
    ServicesModule,
    AdminMembersModule,
    AdminModule,
    BranchModule,
    ContactsModule,
    HealthModule,
    CartModule,
    BillingModule,
    NotificationsModule,
    SiteConfigModule,
    BackupModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
