import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from './notifications.service';

@Injectable()
export class AppointmentReminderWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AppointmentReminderWorker.name);
  private timer: NodeJS.Timeout | null = null;
  private running = false;

  // Every 5 minutes is enough for a 24h reminder window
  private intervalMs = 5 * 60 * 1000;

  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  onModuleInit() {
    // Delay first run a bit to avoid stampede during cold start
    const initialDelayMs = 15 * 1000;
    this.timer = setInterval(() => void this.tick(), this.intervalMs);
    setTimeout(() => void this.tick(), initialDelayMs);
    this.logger.log(`Started (interval=${this.intervalMs}ms)`);
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  private async tick() {
    if (this.running) return;
    this.running = true;
    try {
      await this.runOnce();
    } catch (e) {
      this.logger.error('tick failed', e as any);
    } finally {
      this.running = false;
    }
  }

  /**
   * For each ARTIST, only remind the next upcoming CONFIRMED appointment.
   * Create a notification when that next appointment's startAt is within [now+24h, now+24h+interval].
   */
  async runOnce() {
    const now = new Date();
    const windowStart = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const windowEnd = new Date(windowStart.getTime() + this.intervalMs);
    const horizonEnd = new Date(now.getTime() + 48 * 60 * 60 * 1000);

    const appts = await this.prisma.appointment.findMany({
      where: {
        status: 'CONFIRMED',
        artistId: { not: null },
        startAt: { gt: now, lt: horizonEnd },
      },
      orderBy: { startAt: 'asc' },
      select: {
        id: true,
        artistId: true,
        startAt: true,
        user: { select: { name: true } },
        service: { select: { name: true } },
      },
    });

    const nextByArtist = new Map<string, (typeof appts)[number]>();
    for (const a of appts) {
      const artistId = a.artistId as string;
      if (!nextByArtist.has(artistId)) nextByArtist.set(artistId, a);
    }

    const targets = Array.from(nextByArtist.values()).filter(
      (a) => a.startAt >= windowStart && a.startAt < windowEnd,
    );

    for (const appt of targets) {
      const artistId = appt.artistId as string;
      const dedupKey = `appt-reminder-24h:${appt.id}`;
      await this.notifications.createForUser({
        userId: artistId,
        type: 'APPOINTMENT',
        title: '預約提醒（24 小時）',
        message: `你有一筆預約將在 ${appt.startAt.toLocaleString('zh-TW')} 開始：${appt.user?.name ?? '顧客'} - ${appt.service?.name ?? '服務'}`,
        dedupKey,
        data: {
          appointmentId: appt.id,
          appointmentTime: appt.startAt.toISOString(),
          customerName: appt.user?.name ?? undefined,
          serviceName: appt.service?.name ?? undefined,
        },
      });
    }
  }
}


