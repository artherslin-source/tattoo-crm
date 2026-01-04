import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export type NotificationType = 'APPOINTMENT' | 'MESSAGE' | 'SYSTEM';

export interface CreateNotificationInput {
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  data?: Record<string, unknown> | null;
  /**
   * Optional dedup key persisted into Notification.data.dedupKey.
   * Used to prevent duplicates from retries / schedulers.
   */
  dedupKey?: string;
}

export type BroadcastScope = 'ALL_ARTISTS' | 'BRANCH_ARTISTS' | 'SINGLE_ARTIST';

export interface BroadcastAnnouncementInput {
  scope: BroadcastScope;
  branchId?: string;
  artistId?: string;
  title: string;
  message: string;
  /**
   * Optional dedup key persisted into Notification.data.dedupKey for every recipient.
   */
  dedupKey?: string;
  data?: Record<string, unknown> | null;
}

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  private withDedup(
    data: Record<string, unknown> | null | undefined,
    dedupKey?: string,
  ): Prisma.InputJsonValue | undefined {
    const next = dedupKey ? { ...(data ?? {}), dedupKey } : (data ?? undefined);
    // Prisma Json expects InputJsonValue; our payloads are plain JSON objects.
    return (next as unknown as Prisma.InputJsonValue) ?? undefined;
  }

  async existsByDedupKey(userId: string, dedupKey: string): Promise<boolean> {
    const found = await this.prisma.notification.findFirst({
      where: {
        userId,
        data: {
          path: ['dedupKey'],
          equals: dedupKey,
        },
      },
      select: { id: true },
    });
    return !!found;
  }

  async createForUser(input: CreateNotificationInput) {
    const data = this.withDedup(input.data ?? undefined, input.dedupKey);

    // Dedup (best-effort; avoids spam from retries)
    if (input.dedupKey) {
      const exists = await this.existsByDedupKey(input.userId, input.dedupKey);
      if (exists) return { skipped: true as const };
    }

    const created = await this.prisma.notification.create({
      data: {
        userId: input.userId,
        title: input.title,
        message: input.message,
        type: input.type,
        data,
      },
      select: { id: true },
    });
    return { skipped: false as const, id: created.id };
  }

  async broadcastAnnouncement(input: BroadcastAnnouncementInput) {
    const where =
      input.scope === 'ALL_ARTISTS'
        ? { role: 'ARTIST', isActive: true }
        : input.scope === 'BRANCH_ARTISTS'
          ? { role: 'ARTIST', isActive: true, branchId: input.branchId }
          : { id: input.artistId, role: 'ARTIST', isActive: true };

    const recipients = await this.prisma.user.findMany({
      where,
      select: { id: true },
    });

    if (recipients.length === 0) return { createdCount: 0 };

    const data = this.withDedup(
      {
        kind: 'BOSS_ANNOUNCEMENT',
        ...(input.data ?? {}),
      },
      input.dedupKey,
    );

    const res = await this.prisma.notification.createMany({
      data: recipients.map((u) => ({
        userId: u.id,
        title: input.title,
        message: input.message,
        type: 'SYSTEM',
        data,
      })),
    });

    return { createdCount: res.count };
  }
}


