import { Body, Controller, ForbiddenException, Get, Patch } from '@nestjs/common';
import { z } from 'zod';
import { MaintenanceService } from './maintenance.service';
import { Actor } from '../common/access/actor.decorator';
import type { AccessActor } from '../common/access/access.types';
import { isBoss } from '../common/access/access.types';
import { UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AccessGuard } from '../common/access/access.guard';

const ToggleSchema = z.object({
  enabled: z.boolean(),
  reason: z.string().optional(),
});

@Controller()
export class MaintenanceController {
  constructor(private readonly maintenance: MaintenanceService) {}

  // Public: frontend can poll this to decide whether to show maintenance page.
  @Get(['public/maintenance', 'api/public/maintenance'])
  async getPublicState() {
    const s = await this.maintenance.getState();
    return { enabled: !!s.enabled, message: s.reason || '系統維護中，請稍後再試', since: s.since ?? null };
  }

  // Admin (BOSS): manual toggle persistent maintenance.
  @Get(['admin/maintenance', 'api/admin/maintenance'])
  @UseGuards(AuthGuard('jwt'), AccessGuard)
  async getAdminState(@Actor() actor: AccessActor) {
    if (!isBoss(actor)) throw new ForbiddenException('BOSS only');
    return this.maintenance.getState();
  }

  @Patch(['admin/maintenance', 'api/admin/maintenance'])
  @UseGuards(AuthGuard('jwt'), AccessGuard)
  async setAdminState(@Actor() actor: AccessActor, @Body() body: unknown) {
    if (!isBoss(actor)) throw new ForbiddenException('BOSS only');
    const input = ToggleSchema.parse(body);
    if (input.enabled) {
      await this.maintenance.enablePersistent(input.reason || '系統維護中');
    } else {
      await this.maintenance.disablePersistent();
      // Also clear ephemeral if any.
      this.maintenance.disableEphemeral();
    }
    return { success: true };
  }
}


