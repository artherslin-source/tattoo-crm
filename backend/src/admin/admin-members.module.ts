import { Module } from "@nestjs/common";
import { AdminMembersController } from "./admin-members.controller";
import { AdminMembersService } from "./admin-members.service";
import { PrismaService } from "../prisma/prisma.service";
import { BillingModule } from "../billing/billing.module";

@Module({
  imports: [BillingModule],
  controllers: [AdminMembersController],
  providers: [AdminMembersService, PrismaService],
})
export class AdminMembersModule {}
