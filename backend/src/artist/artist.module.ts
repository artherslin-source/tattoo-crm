import { Module } from "@nestjs/common";
import { ArtistController } from "./artist.controller";
import { ArtistService } from "./artist.service";
import { PrismaModule } from "../prisma/prisma.module";
import { BillingModule } from "../billing/billing.module";
import { AdminAppointmentsService } from "../admin/admin-appointments.service";

@Module({
  imports: [PrismaModule, BillingModule],
  controllers: [ArtistController],
  providers: [ArtistService, AdminAppointmentsService],
  exports: [ArtistService],
})
export class ArtistModule {}
