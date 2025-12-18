import { Controller, Get, UseGuards, NotFoundException, BadRequestException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PrismaService } from '../prisma/prisma.service';
import { AccessGuard } from '../common/access/access.guard';
import { Actor } from '../common/access/actor.decorator';
import type { AccessActor } from '../common/access/access.types';

@Controller('branch')
@UseGuards(AuthGuard('jwt'), AccessGuard)
export class BranchHoursController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('business-hours')
  async getBusinessHours(@Actor() actor: AccessActor) {
    const branchId = actor.branchId;
    if (!branchId) {
      throw new BadRequestException('branchId missing');
    }

    const branch = await this.prisma.branch.findUnique({
      where: { id: branchId },
      select: { id: true, name: true, businessHours: true },
    });
    if (!branch) throw new NotFoundException('Branch not found');

    return { branch };
  }
}


