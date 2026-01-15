import { Module } from "@nestjs/common";
import { ArtistController } from "./artist.controller";
import { ArtistService } from "./artist.service";
import { PrismaModule } from "../prisma/prisma.module";
import { BillingModule } from "../billing/billing.module";
import { AdminAppointmentsService } from "../admin/admin-appointments.service";
import { AuditModule } from "../audit/audit.module";

@Module({
  imports: [PrismaModule, BillingModule, AuditModule],
  controllers: [ArtistController],
  providers: [ArtistService, AdminAppointmentsService],
  exports: [ArtistService],
})
export class ArtistModule {}
