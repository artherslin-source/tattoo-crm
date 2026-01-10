import { Body, Controller, Get, Post, UseGuards, BadRequestException, ForbiddenException, GoneException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AccessGuard } from '../common/access/access.guard';
import { Actor } from '../common/access/actor.decorator';
import type { AccessActor } from '../common/access/access.types';
import { isBoss } from '../common/access/access.types';
import { z } from 'zod';
import { PrelaunchService } from './prelaunch.service';

const ApplySchema = z.object({
  confirm: z.literal('RESET'),
  secret: z.string().min(1),
});

const UnlockSchema = z.object({
  confirm: z.literal('UNLOCK'),
  secret: z.string().min(1),
});

const ZhuFixApplySchema = z.object({
  confirm: z.literal('FIX_ZHU'),
  secret: z.string().min(1),
});

/**
 * Compatibility controller:
 * Some deployments/proxies forward requests with `/api/*` prefix to the Nest app.
 * Provide `/api/admin/...` routes in addition to `/admin/...`.
 */
@Controller('api/admin/system/prelaunch-reset')
@UseGuards(AuthGuard('jwt'), AccessGuard)
export class PrelaunchApiController {
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

  @Post('unlock')
  async unlock(@Actor() actor: AccessActor, @Body() body: unknown) {
    if (!isBoss(actor)) throw new ForbiddenException('Only BOSS can unlock prelaunch reset');
    const parsed = UnlockSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.flatten());
    return this.prelaunch.unlock(actor, parsed.data);
  }

  @Get('zhu-fix/dry-run')
  async zhuFixDryRun(@Actor() actor: AccessActor) {
    if (!isBoss(actor)) throw new ForbiddenException('Only BOSS can run zhu fix');
    throw new GoneException('Zhu fix has been removed');
  }

  @Post('zhu-fix/apply')
  async zhuFixApply(@Actor() actor: AccessActor, @Body() body: unknown) {
    if (!isBoss(actor)) throw new ForbiddenException('Only BOSS can run zhu fix');
    throw new GoneException('Zhu fix has been removed');
  }
}

