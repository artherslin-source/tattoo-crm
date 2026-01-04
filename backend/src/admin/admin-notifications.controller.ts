import { Body, Controller, Post, UseGuards, ForbiddenException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { z } from 'zod';
import { AccessGuard } from '../common/access/access.guard';
import { Actor } from '../common/access/actor.decorator';
import type { AccessActor } from '../common/access/access.types';
import { isBoss } from '../common/access/access.types';
import { NotificationsService } from '../notifications/notifications.service';
import { randomUUID } from 'crypto';

const BroadcastSchema = z.object({
  scope: z.enum(['ALL_ARTISTS', 'BRANCH_ARTISTS', 'SINGLE_ARTIST']),
  branchId: z.string().min(1).optional(),
  artistId: z.string().min(1).optional(),
  title: z.string().min(1),
  message: z.string().min(1),
});

@Controller('admin/notifications')
@UseGuards(AuthGuard('jwt'), AccessGuard)
export class AdminNotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Post('broadcast')
  async broadcast(@Actor() actor: AccessActor, @Body() body: unknown) {
    if (!isBoss(actor)) throw new ForbiddenException('Only BOSS can broadcast announcements');

    const input = BroadcastSchema.parse(body);
    if (input.scope === 'BRANCH_ARTISTS' && !input.branchId) {
      throw new ForbiddenException('branchId is required for BRANCH_ARTISTS');
    }
    if (input.scope === 'SINGLE_ARTIST' && !input.artistId) {
      throw new ForbiddenException('artistId is required for SINGLE_ARTIST');
    }

    const dedupKey = `boss-announcement:${randomUUID()}`;
    const res = await this.notifications.broadcastAnnouncement({
      scope: input.scope,
      branchId: input.branchId,
      artistId: input.artistId,
      title: input.title,
      message: input.message,
      dedupKey,
      data: { scope: input.scope, branchId: input.branchId, artistId: input.artistId },
    });

    return { ...res, dedupKey };
  }
}


