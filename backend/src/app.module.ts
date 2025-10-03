import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { AppointmentsModule } from './appointments/appointments.module';
import { ArtistsModule } from './artists/artists.module';
import { OrdersModule } from './orders/orders.module';
import { InstallmentsModule } from './installments/installments.module';
import { BranchesModule } from './branches/branches.module';
import { ServicesModule } from './services/services.module';
import { AdminModule } from './admin/admin.module';
import { AdminMembersModule } from './admin/admin-members.module';
import { BranchModule } from './branch/branch.module';
import { ArtistModule } from './artist/artist.module';
import { ContactsModule } from './contacts/contacts.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    UsersModule,
    ArtistModule,
    ArtistsModule,
    AppointmentsModule,
    OrdersModule,
    InstallmentsModule,
    BranchesModule,
    ServicesModule,
    AdminMembersModule,
    AdminModule,
    BranchModule,
    ContactsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
