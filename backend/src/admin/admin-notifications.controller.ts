import { Body, Controller, Get, Post, UseGuards, ForbiddenException, Query } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { z } from 'zod';
import { AccessGuard } from '../common/access/access.guard';
import { Actor } from '../common/access/actor.decorator';
import type { AccessActor } from '../common/access/access.types';
import { isBoss } from '../common/access/access.types';
import { NotificationsService } from '../notifications/notifications.service';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

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
  constructor(
    private readonly notifications: NotificationsService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('announcements')
  async listAnnouncements(
    @Actor() actor: AccessActor,
    @Query('limit') limitRaw?: string,
  ) {
    if (!isBoss(actor)) throw new ForbiddenException('Only BOSS can list announcements');

    const limit = Math.min(Math.max(Number(limitRaw || 50) || 50, 1), 200);

    // Fetch latest SYSTEM notifications that are boss announcements, then group by dedupKey.
    const rows = await this.prisma.notification.findMany({
      where: {
        type: 'SYSTEM',
        data: {
          path: ['kind'],
          equals: 'BOSS_ANNOUNCEMENT',
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 2000, // enough to cover many recipients while keeping query bounded
      select: {
        id: true,
        title: true,
        message: true,
        createdAt: true,
        data: true,
      },
    });

    type Announcement = {
      dedupKey: string;
      title: string;
      message: string;
      createdAt: string;
      scope?: string;
      branchId?: string;
      artistId?: string;
      recipientCount: number;
    };

    const map = new Map<string, Announcement>();
    for (const r of rows) {
      const data = (r.data && typeof r.data === 'object' ? (r.data as any) : {}) as any;
      const dedupKey = String(data?.dedupKey || '');
      if (!dedupKey.startsWith('boss-announcement:')) continue;

      const existing = map.get(dedupKey);
      if (!existing) {
        map.set(dedupKey, {
          dedupKey,
          title: r.title,
          message: r.message,
          createdAt: r.createdAt.toISOString(),
          scope: data?.scope ? String(data.scope) : undefined,
          branchId: data?.branchId ? String(data.branchId) : undefined,
          artistId: data?.artistId ? String(data.artistId) : undefined,
          recipientCount: 1,
        });
      } else {
        existing.recipientCount += 1;
        // createdAt: keep the newest (rows are desc already)
      }
    }

    const list = Array.from(map.values())
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
      .slice(0, limit);

    return list;
  }

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


