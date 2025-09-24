import { Module } from "@nestjs/common";
import { AdminMembersController } from "./admin-members.controller";
import { AdminMembersService } from "./admin-members.service";
import { PrismaService } from "../prisma/prisma.service";

@Module({
  controllers: [AdminMembersController],
  providers: [AdminMembersService, PrismaService],
})
export class AdminMembersModule {}
