import { Module } from "@nestjs/common";
import { AdminMembersController } from "./admin-members.controller";
import { AdminMembersService } from "./admin-members.service";
import { PrismaService } from "../prisma/prisma.service";
import { BillingModule } from "../billing/billing.module";
import { AuditModule } from "../audit/audit.module";

@Module({
  imports: [BillingModule, AuditModule],
  controllers: [AdminMembersController],
  providers: [AdminMembersService, PrismaService],
})
export class AdminMembersModule {}
