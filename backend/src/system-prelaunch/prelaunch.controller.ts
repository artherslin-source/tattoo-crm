import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AccessGuard } from '../common/access/access.guard';
import { Actor } from '../common/access/actor.decorator';
import type { AccessActor } from '../common/access/access.types';
import { isBoss } from '../common/access/access.types';
import { ForbiddenException, BadRequestException } from '@nestjs/common';
import { z } from 'zod';
import { PrelaunchService } from './prelaunch.service';

const ApplySchema = z.object({
  confirm: z.literal('RESET'),
  secret: z.string().min(1),
});

const ZhuFixApplySchema = z.object({
  confirm: z.literal('FIX_ZHU'),
  secret: z.string().min(1),
});

@Controller('admin/system/prelaunch-reset')
@UseGuards(AuthGuard('jwt'), AccessGuard)
export class PrelaunchController {
  constructor(private readonly prelaunch: PrelaunchService) {}

  @Get('dry-run')
  async dryRun(@Actor() actor: AccessActor) {
    if (!isBoss(actor)) throw new ForbiddenException('Only BOSS can run prelaunch reset');
    return this.prelaunch.dryRun(actor);
  }

  @Post('apply')
  async apply(@Actor() actor: AccessActor, @Body() body: unknown) {
    if (!isBoss(actor)) throw new ForbiddenException('Only BOSS can run prelaunch reset');
    const parsed = ApplySchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.flatten());
    return this.prelaunch.apply(actor, parsed.data);
  }

  // Zhu cross-branch repair (repeatable)
  @Get('zhu-fix/dry-run')
  async zhuFixDryRun(@Actor() actor: AccessActor) {
    if (!isBoss(actor)) throw new ForbiddenException('Only BOSS can run zhu fix');
    return this.prelaunch.zhuFixDryRun(actor);
  }

  @Post('zhu-fix/apply')
  async zhuFixApply(@Actor() actor: AccessActor, @Body() body: unknown) {
    if (!isBoss(actor)) throw new ForbiddenException('Only BOSS can run zhu fix');
    const parsed = ZhuFixApplySchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.flatten());
    return this.prelaunch.zhuFixApply(actor, parsed.data);
  }
}


